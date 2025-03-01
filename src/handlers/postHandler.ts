import * as crypto from "node:crypto";
import { ERROR_MESSAGES, TUS_CONFIG, UPLOAD_CONFIG } from "@/config";
import type { UploadMetadata } from "@/types/uploadTypes";
import { retryOperation } from "@/utils/other/retryOperation";
import { calculateOptimalChunkSize } from "@/utils/upload/uploadUtils";
import {
	CreateMultipartUploadCommand,
	type S3Client,
} from "@aws-sdk/client-s3";
import type { Redis } from "@upstash/redis/cloudflare";
import type { Context } from "hono";

import { handlePatchRequest } from "./patchHandler";

export async function handlePostRequest(
	c: Context,
	s3Client: S3Client,
	redis: Redis,
	bucket: string,
	baseHeaders: Record<string, string>,
) {
	// Check required headers
	const uploadLength = c.req.header("Upload-Length");
	const uploadDeferLength = c.req.header("Upload-Defer-Length");
	const uploadMetadata = c.req.header("Upload-Metadata");
	const uploadConcat = c.req.header("Upload-Concat");

	// Validate upload length
	if (!uploadLength && !uploadDeferLength) {
		return new Response(
			"Upload-Length or Upload-Defer-Length header required",
			{
				status: 400,
				headers: {
					...baseHeaders,
					"Content-Type": "text/plain",
				},
			},
		);
	}

	// Parse metadata
	const parsedMetadata: Record<string, string> = {};
	if (uploadMetadata) {
		uploadMetadata.split(",").forEach((item: string) => {
			const [key, value] = item.trim().split(" ");
			if (key && value) {
				try {
					parsedMetadata[key] = atob(value);
				} catch (e) {
					console.warn(`Failed to decode metadata value for key ${key}`);
				}
			}
		});
	}

	// Handle concatenation
	if (uploadConcat) {
		const [type, parts] = uploadConcat.split(";");
		if (type === "partial") {
			parsedMetadata["Upload-Concat"] = "partial";
		} else if (type === "final" && parts) {
			parsedMetadata["Upload-Concat"] = uploadConcat;
			// For final uploads, we don't need upload length
			delete parsedMetadata["Upload-Length"];
		}
	}

	// generate new upload id
	const newUploadId = crypto.randomUUID();
	const contentLength = uploadLength ? Number.parseInt(uploadLength) : 0;

	// Validate max size
	if (contentLength > TUS_CONFIG.MAX_SIZE) {
		return new Response("File too large", {
			status: 413,
			headers: {
				...baseHeaders,
				"Content-Type": "text/plain",
			},
		});
	}

	const createMultipartUploadCommand = new CreateMultipartUploadCommand({
		Bucket: bucket,
		Key: newUploadId,
		ContentType: parsedMetadata.filetype || "application/octet-stream",
		Metadata: {
			"Content-Length": contentLength.toString(),
			"Upload-Length": uploadLength || "deferred",
			"Upload-Defer-Length": uploadDeferLength ? "true" : "false",
			...Object.fromEntries(
				Object.entries(parsedMetadata).map(([k, v]) => [k, String(v)]),
			),
		},
	});

	try {
		const createMultipartUploadResult = await retryOperation(
			() => s3Client.send(createMultipartUploadCommand),
			ERROR_MESSAGES.S3.MULTIPART_INIT_FAILED,
		);

		if (!createMultipartUploadResult.UploadId) {
			throw new Error("Failed to get multipart upload ID from S3");
		}

		const initialMetadata: UploadMetadata = {
			offset: "0",
			length: uploadLength || "0",
			deferLength: !!uploadDeferLength,
			metadata: parsedMetadata,
			createdAt: Date.now(),
			multipartUploadId: createMultipartUploadResult.UploadId,
			parts: [],
			chunkSize: calculateOptimalChunkSize(
				Number.parseInt(uploadLength || "0"),
				1024 * 1024,
			),
			networkSpeed: 1024 * 1024,
			lastUploadTime: Date.now(),
			uploadedChunks: [],
		};

		await retryOperation(
			() =>
				redis.set(`upload:${newUploadId}`, initialMetadata, {
					ex: UPLOAD_CONFIG.UPLOAD.INCOMPLETE_TTL,
				}),
			ERROR_MESSAGES.REDIS.OPERATION_FAILED,
		);

		const creationWithUpload =
			c.req.header("Content-Length") &&
			Number.parseInt(c.req.header("Content-Length")!) > 0;

		if (creationWithUpload) {
			c.req.raw.headers.set("Upload-Offset", "0");
			return handlePatchRequest(
				c,
				s3Client,
				redis,
				newUploadId,
				bucket,
				baseHeaders,
			);
		}

		const location = `/files/${newUploadId}`;

		return new Response(null, {
			status: 201,
			headers: {
				...baseHeaders,
				Location: location,
				"Upload-Expires": new Date(
					Date.now() + UPLOAD_CONFIG.UPLOAD.INCOMPLETE_TTL * 1000,
				).toUTCString(),
				"Upload-Length": uploadLength || "",
				"Upload-Defer-Length": uploadDeferLength || "",
				"Upload-Concat": uploadConcat || "",
				"Upload-Metadata": uploadMetadata || "",
			},
		});
	} catch (error) {
		console.error("Error in POST handler:", error);
		return new Response("Internal Server Error", {
			status: 500,
			headers: baseHeaders,
		});
	}
}
