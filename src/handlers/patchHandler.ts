import { ERROR_MESSAGES, UPLOAD_CONFIG } from '@/config';
import type { UploadMetadata } from '@/types/uploadTypes';
import { retryOperation } from '@/utils/other/retryOperation';
import { verifyChecksum } from '@/utils/upload/checksumVerification';
import { uploadChunks } from '@/utils/upload/multipartUploadOperations';
import { completeMultipartUpload } from '@/utils/upload/uploadCompletion';
import { AbortMultipartUploadCommand, S3Client } from '@aws-sdk/client-s3';
import type { Redis } from '@upstash/redis/cloudflare';
import type { Context } from 'hono';

export async function handlePatchRequest(
    c: Context,
    s3Client: S3Client,
    redis: Redis,
    uploadId: string,
    bucket: string,
    baseHeaders: Record<string, string>
) {
    // Validate content type
    const contentType = c.req.header('Content-Type');
    if (contentType !== 'application/offset+octet-stream') {
        return new Response('Invalid Content-Type', {
            status: 415,
            headers: {
                ...baseHeaders,
                'Content-Type': 'text/plain',
            },
        });
    }

    // Get upload metadata
    const metadata = await retryOperation(
        () => redis.get<UploadMetadata>(`upload:${uploadId}`),
        ERROR_MESSAGES.REDIS.OPERATION_FAILED
    );

    if (!metadata) {
        return new Response('Upload not found', {
            status: 404,
            headers: baseHeaders,
        });
    }

    // Validate upload offset
    const uploadOffset = c.req.header('Upload-Offset');
    if (!uploadOffset || parseInt(uploadOffset) !== parseInt(metadata.offset)) {
        return new Response('Conflict', {
            status: 409,
            headers: {
                ...baseHeaders,
                'Upload-Offset': metadata.offset,
            },
        });
    }

    // Add request timeout handling
    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        UPLOAD_CONFIG.UPLOAD.TIMEOUT || 30000
    );

    try {
        const chunk = await c.req.arrayBuffer();
        const chunkSize = chunk.byteLength;

        if (chunkSize === 0) {
            return new Response('Empty chunk', {
                status: 400,
                headers: {
                    ...baseHeaders,
                    'Upload-Offset': metadata.offset,
                },
            });
        }

        // Handle upload checksum if provided
        const uploadChecksum = c.req.header('Upload-Checksum');
        if (uploadChecksum) {
            const isValid = await verifyChecksum(
                chunk,
                uploadChecksum,
                'SHA-256'
            );
            if (!isValid) {
                return new Response('Checksum verification failed', {
                    status: 460,
                });
            }
        }

        try {
            await uploadChunks(
                chunk,
                parseInt(uploadOffset),
                parseInt(metadata.length),
                metadata,
                s3Client,
                redis,
                bucket,
                uploadId
            );

            // Check if upload is complete
            const newOffset = parseInt(uploadOffset) + chunk.byteLength;
            if (newOffset === parseInt(metadata.length)) {
                await completeMultipartUpload(
                    s3Client,
                    bucket,
                    uploadId,
                    metadata
                );
                await redis.del(`upload:${uploadId}`);
            }
            return new Response(null, {
                status: 204,
                headers: {
                    ...baseHeaders,
                    'Upload-Offset': newOffset.toString(),
                    'Upload-Expires': new Date(
                        Date.now() + UPLOAD_CONFIG.UPLOAD.INCOMPLETE_TTL * 1000
                    ).toUTCString(),
                },
            });
        } catch (error) {
            // Attempt to abort the multipart upload
            if (metadata.multipartUploadId) {
                try {
                    await s3Client.send(
                        new AbortMultipartUploadCommand({
                            Bucket: bucket,
                            Key: uploadId,
                            UploadId: metadata.multipartUploadId,
                        })
                    );
                } catch (abortError) {
                    console.error(
                        'Failed to abort multipart upload:',
                        abortError
                    );
                }
            }
        }
        return new Response('Upload failed', { status: 500 });
    } finally {
        clearTimeout(timeout);
    }
}
