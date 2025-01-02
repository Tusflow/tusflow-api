import { ERROR_MESSAGES } from '@/config';
import type { UploadMetadata } from '@/types/uploadTypes';
import { retryOperation } from '@/utils/other/retryOperation';
import {
    AbortMultipartUploadCommand,
    DeleteObjectCommand,
    type S3Client,
} from '@aws-sdk/client-s3';
import { type Redis } from '@upstash/redis/cloudflare';

export async function handleDeleteRequest(
    s3Client: S3Client,
    redis: Redis,
    uploadId: string,
    bucket: string,
    baseHeaders: Record<string, string>
) {
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

    try {
        // If there's a multipart upload in progress, abort it
        if (metadata.multipartUploadId) {
            await retryOperation(
                () =>
                    s3Client.send(
                        new AbortMultipartUploadCommand({
                            Bucket: bucket,
                            Key: uploadId,
                            UploadId: metadata.multipartUploadId,
                        })
                    ),
                ERROR_MESSAGES.S3.ABORT_MULTIPART_FAILED
            );
        }

        // Delete the upload metadata from Redis
        await retryOperation(
            () => redis.del(`upload:${uploadId}`),
            ERROR_MESSAGES.REDIS.OPERATION_FAILED
        );

        // Delete any uploaded parts from S3
        await retryOperation(
            () =>
                s3Client.send(
                    new DeleteObjectCommand({
                        Bucket: bucket,
                        Key: uploadId,
                    })
                ),
            ERROR_MESSAGES.S3.DELETE_FAILED
        );

        return new Response(null, {
            status: 204,
            headers: baseHeaders,
        });
    } catch (error) {
        return new Response('Internal Server Error', {
            status: 500,
            headers: baseHeaders,
        });
    }
}
