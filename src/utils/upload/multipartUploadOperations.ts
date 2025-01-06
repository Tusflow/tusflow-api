import { ERROR_MESSAGES, UPLOAD_CONFIG } from "@/config";
import type { UploadMetadata } from "@/types/uploadTypes";
import { retryOperation } from "@/utils/other/retryOperation";
import {
	calculateNetworkSpeed,
	calculateOptimalChunkSize,
} from "@/utils/upload/uploadUtils";
import { type S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import type { Redis } from "@upstash/redis/cloudflare";

// Upload chunks to S3 and update metadata
export async function uploadChunks(
	chunk: ArrayBuffer,
	uploadOffset: number,
	totalSize: number,
	cachedMetadata: UploadMetadata,
	s3Client: S3Client,
	redis: Redis,
	bucket: string,
	uploadId: string,
) {
	if (!cachedMetadata.multipartUploadId) {
		throw new Error("Missing multipart upload ID");
	}

	// Enhanced network speed calculation with exponential moving average
	const currentTime = Date.now();
	if (cachedMetadata.lastUploadTime) {
		const timeDiff = currentTime - cachedMetadata.lastUploadTime;
		const bytesUploaded = chunk.byteLength;
		const speed = calculateNetworkSpeed(bytesUploaded, timeDiff);
		const alpha = 0.2; // Smaller alpha for smoother averaging
		cachedMetadata.networkSpeed =
			(1 - alpha) * cachedMetadata.networkSpeed + alpha * speed;
	}

	const optimalChunkSize = calculateOptimalChunkSize(
		totalSize,
		cachedMetadata.networkSpeed,
	);

	// Efficient chunk processing
	const chunks = Math.ceil(chunk.byteLength / optimalChunkSize);
	const batchSize = UPLOAD_CONFIG.PARALLEL_UPLOADS.BATCH_SIZE;
	let uploadPromises = [];

	// Add adaptive batch size based on network conditions
	const currentBatchSize = Math.max(
		1,
		Math.min(
			UPLOAD_CONFIG.PARALLEL_UPLOADS.BATCH_SIZE,
			Math.floor(cachedMetadata.networkSpeed / (1024 * 1024)), // 1MB baseline
		),
	);

	// Upload chunks in parallel
	for (let i = 0; i < chunks; i++) {
		const start = i * optimalChunkSize;
		const end = Math.min(start + optimalChunkSize, chunk.byteLength);
		const partNumber = Math.floor(uploadOffset / optimalChunkSize) + i + 1;

		if (cachedMetadata.uploadedChunks.includes(partNumber)) {
			continue;
		}

		const chunkData = chunk.slice(start, end);
		const uploadPromise = retryOperation(async () => {
			const response = await s3Client.send(
				new UploadPartCommand({
					Bucket: bucket,
					Key: uploadId,
					UploadId: cachedMetadata.multipartUploadId,
					PartNumber: partNumber,
					Body: Buffer.from(chunkData),
				}),
			);

			if (!response.ETag) {
				throw new Error(`No ETag received for part ${partNumber}`);
			}

			cachedMetadata.parts.push({
				PartNumber: partNumber,
				ETag: response.ETag,
			});
			cachedMetadata.uploadedChunks.push(partNumber);

			// Frequent progress updates
			cachedMetadata.offset = (uploadOffset + end).toString();
			cachedMetadata.lastUploadTime = Date.now();
			await redis.set(`upload:${uploadId}`, cachedMetadata, {
				ex: UPLOAD_CONFIG.UPLOAD.INCOMPLETE_TTL,
			});
		}, ERROR_MESSAGES.S3.UPLOAD_FAILED);

		uploadPromises.push(uploadPromise);

		if (uploadPromises.length >= batchSize) {
			await Promise.all(uploadPromises);
			uploadPromises = [];
		}
	}

	if (uploadPromises.length > 0) {
		await Promise.all(uploadPromises);
	}

	// Add progress tracking with rate limiting
	const progressUpdateInterval = 1000; // 1 second
	if (
		!cachedMetadata.lastProgressUpdate ||
		currentTime - cachedMetadata.lastProgressUpdate >= progressUpdateInterval
	) {
		await redis.set(`upload:${uploadId}`, cachedMetadata, {
			ex: UPLOAD_CONFIG.UPLOAD.INCOMPLETE_TTL,
		});
		cachedMetadata.lastProgressUpdate = currentTime;
	}

	return cachedMetadata.parts;
}
