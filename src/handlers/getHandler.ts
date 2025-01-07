import { ERROR_MESSAGES } from "@/config";
import type { UploadMetadata } from "@/types/uploadTypes";
import { retryOperation } from "@/utils/other/retryOperation";
import type { Redis } from "@upstash/redis/cloudflare";
import type { Context } from "hono";

export async function handleGetRequest(
	c: Context,
	redis: Redis,
	uploadId: string,
	baseHeaders: Record<string, string>,
): Promise<Response> {
	// Track access for this upload

	const cachedMetadata = await retryOperation(
		() => redis.get<UploadMetadata>(`upload:${uploadId}`),
		ERROR_MESSAGES.REDIS.OPERATION_FAILED,
	);

	if (!cachedMetadata) {
		return new Response(ERROR_MESSAGES.UPLOAD.NOT_FOUND, { status: 404 });
	}

	const totalSize = Number.parseInt(cachedMetadata.length);
	const uploadedSize = Number.parseInt(cachedMetadata.offset);
	const progress = (uploadedSize / totalSize) * 100;

	return new Response(
		JSON.stringify({
			uploadId,
			totalSize,
			uploadedSize,
			progress: progress.toFixed(2),
			chunkSize: cachedMetadata.chunkSize,
			networkSpeed: cachedMetadata.networkSpeed,
			uploadedChunks: cachedMetadata.uploadedChunks,
		}),
		{
			headers: {
				...baseHeaders,
				"Content-Type": "application/json",
			},
		},
	);
}
