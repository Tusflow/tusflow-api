import { ERROR_MESSAGES, UPLOAD_CONFIG } from "@/config";
import type { UploadMetadata } from "@/types/uploadTypes";
import { retryOperation } from "@/utils/other/retryOperation";
import type { Redis } from "@upstash/redis/cloudflare";

export async function handleHeadRequest(
	redis: Redis,
	uploadId: string,
	baseHeaders: Record<string, string>,
) {
	console.log(
		`[${new Date().toISOString()}] Handling HEAD request for upload ${uploadId}`,
	);

	const metadata = await retryOperation(
		() => redis.get<UploadMetadata>(`upload:${uploadId}`),
		ERROR_MESSAGES.REDIS.OPERATION_FAILED,
	);

	if (!metadata) {
		return new Response("Upload not found", {
			status: 404,
			headers: baseHeaders,
		});
	}

	const headers: {
		"Upload-Length": string;
		"Upload-Offset": string;
		"Cache-Control": string;
		"Upload-Expires": string;
		"Upload-Defer-Length"?: string;
		"Upload-Metadata"?: string;
		"Upload-Concat"?: string;
	} = {
		...baseHeaders,
		"Upload-Length": metadata.length,
		"Upload-Offset": metadata.offset,
		"Cache-Control": "no-store",
		"Upload-Expires": new Date(
			metadata.createdAt + UPLOAD_CONFIG.UPLOAD.INCOMPLETE_TTL * 1000,
		).toUTCString(),
	};

	// Add Upload-Defer-Length header if length was deferred
	if (metadata.deferLength) {
		headers["Upload-Defer-Length"] = "1";
	}

	// Add Upload-Metadata header if present
	if (metadata.metadata && Object.keys(metadata.metadata).length > 0) {
		const metadataStr = Object.entries(metadata.metadata)
			.map(([key, value]) => `${key} ${btoa(value)}`)
			.join(",");
		headers["Upload-Metadata"] = metadataStr;
	}

	// Add Upload-Concat header if present
	if (metadata.metadata?.["Upload-Concat"]) {
		headers["Upload-Concat"] = metadata.metadata["Upload-Concat"];
	}

	return new Response(null, {
		status: 200,
		headers,
	});
}
