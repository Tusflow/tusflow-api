import type { UploadMetadata } from '@/types/uploadTypes';
import {
    CompleteMultipartUploadCommand,
    ListPartsCommand,
    S3Client,
} from '@aws-sdk/client-s3';

// Complete the multipart upload
export async function completeMultipartUpload(
    s3Client: S3Client,
    bucket: string,
    uploadId: string,
    cachedMetadata: UploadMetadata
) {
    if (!cachedMetadata.multipartUploadId) {
        throw new Error('Missing multipart upload ID');
    }

    // Verify all parts are uploaded
    const listPartsResponse = await s3Client.send(
        new ListPartsCommand({
            Bucket: bucket,
            Key: uploadId,
            UploadId: cachedMetadata.multipartUploadId,
        })
    );

    const uploadedParts = listPartsResponse.Parts || [];
    const expectedParts = Math.ceil(
        parseInt(cachedMetadata.length) / cachedMetadata.chunkSize
    );

    if (uploadedParts.length !== expectedParts) {
        throw new Error('Missing parts in multipart upload');
    }

    // Add part size validation
    const minPartSize = 5 * 1024 * 1024; // 5MB minimum part size for S3
    for (const part of uploadedParts) {
        if (
            part.Size &&
            part.Size < minPartSize &&
            part.PartNumber &&
            part.PartNumber < uploadedParts.length
        ) {
            throw new Error(
                `Part ${part.PartNumber} is smaller than minimum allowed size`
            );
        }
    }

    // Complete the multipart upload
    await s3Client.send(
        new CompleteMultipartUploadCommand({
            Bucket: bucket,
            Key: uploadId,
            UploadId: cachedMetadata.multipartUploadId,
            MultipartUpload: {
                Parts: cachedMetadata.parts.sort(
                    (a, b) => a.PartNumber - b.PartNumber
                ),
            },
        })
    );
}
