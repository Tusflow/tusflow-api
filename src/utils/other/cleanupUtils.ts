import { ERROR_MESSAGES, UPLOAD_CONFIG } from "@/config";
import type { UploadMetadata } from "@/types/uploadTypes";
import { AbortMultipartUploadCommand, type S3Client } from "@aws-sdk/client-s3";
import type { Redis } from "@upstash/redis/cloudflare";

import { retryOperation } from "./retryOperation";

async function cleanupFailedUpload(
	s3Client: S3Client,
	redis: Redis,
	uploadId: string,
	bucket: string,
) {
	console.log(`Cleaning up failed upload: ${uploadId}`);
	try {
		const metadata = await redis.get<UploadMetadata>(`upload:${uploadId}`);

		if (metadata?.multipartUploadId) {
			await retryOperation(
				() =>
					s3Client.send(
						new AbortMultipartUploadCommand({
							Bucket: bucket,
							Key: uploadId,
							UploadId: metadata.multipartUploadId,
						}),
					),
				ERROR_MESSAGES.S3.DELETE_FAILED,
			);
			console.log(`Aborted multipart upload for ${uploadId}`);
		}

		// Clean up all related Redis keys
		const keysToDelete = [
			`upload:${uploadId}`,
			`ratelimit:${uploadId}`,
			`access:count:${uploadId}`,
			`cache:warm:${uploadId}`,
		];

		await Promise.all(keysToDelete.map((key) => redis.del(key)));
		console.log(`Cleaned up Redis keys for ${uploadId}`);
	} catch (error) {
		console.error(`Failed to cleanup upload ${uploadId}:`, error);
		throw error; // Propagate error for retry mechanism
	}
}

export async function cleanupStaleUploads(
	s3Client: S3Client,
	redis: Redis,
	bucket: string,
) {
	console.log("Starting cleanup of stale uploads...");
	const staleThreshold =
		Date.now() - UPLOAD_CONFIG.UPLOAD.INCOMPLETE_TTL * 1000;
	let cleanedCount = 0;
	let failedCount = 0;

	try {
		// Get all upload keys
		const keys = await redis.keys("upload:*");
		console.log(`Found ${keys.length} total uploads to check`);

		// Process in batches to avoid overwhelming the system
		const batchSize = 10;
		for (let i = 0; i < keys.length; i += batchSize) {
			const batch = keys.slice(i, i + batchSize);

			await Promise.all(
				batch.map(async (key) => {
					const metadata = await redis.get<UploadMetadata>(key);
					const uploadId = key.split(":")[1];

					if (metadata && metadata.createdAt < staleThreshold) {
						try {
							await cleanupFailedUpload(s3Client, redis, uploadId, bucket);
							cleanedCount++;
							console.log(`Successfully cleaned up stale upload: ${uploadId}`);
						} catch (error) {
							failedCount++;
							console.error(`Failed to clean up upload ${uploadId}:`, error);
						}
					}
				}),
			);
		}

		console.log(
			`Cleanup completed. Cleaned: ${cleanedCount}, Failed: ${failedCount}`,
		);
		return { cleanedCount, failedCount };
	} catch (error) {
		console.error("Cleanup operation failed:", error);
		throw error;
	}
}

// New function to cleanup a specific upload
export async function cleanupSpecificUpload(
	s3Client: S3Client,
	redis: Redis,
	uploadId: string,
	bucket: string,
): Promise<boolean> {
	try {
		await cleanupFailedUpload(s3Client, redis, uploadId, bucket);
		return true;
	} catch (error) {
		console.error(`Failed to cleanup specific upload ${uploadId}:`, error);
		return false;
	}
}
