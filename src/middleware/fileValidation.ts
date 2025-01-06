import { ERROR_MESSAGES, FILE_VALIDATION } from "@/config";
import { ValidationError } from "@/utils/error/customErrors";
import { type Context, type Next } from "hono";
import path from "path";

export const validateFileUpload = () => {
	return async (c: Context, next: Next) => {
		if (c.req.method === "POST") {
			const metadata = c.req.header("Upload-Metadata");
			const uploadLength = c.req.header("Upload-Length");
			const fileSize = uploadLength ? parseInt(uploadLength) : null;

			// Parse metadata to get filename
			if (metadata) {
				const metadataPairs = metadata.split(",").reduce(
					(acc, pair) => {
						const [key, value] = pair.trim().split(" ");
						acc[key] = Buffer.from(value, "base64").toString();
						return acc;
					},
					{} as Record<string, string>,
				);

				const filename = metadataPairs["filename"];

				// Validate file type if enabled
				if (FILE_VALIDATION.ENABLE_TYPE_VALIDATION && filename) {
					const fileExt = path.extname(filename).toLowerCase();
					const allowedTypes = FILE_VALIDATION.ALLOWED_FILE_TYPES;

					if (
						allowedTypes &&
						allowedTypes.length > 0 &&
						!allowedTypes.includes(fileExt)
					) {
						throw new ValidationError(
							ERROR_MESSAGES.FILE_VALIDATION.INVALID_FILE_TYPE,
							{
								statusCode: 415,
								errorCode: "INVALID_FILE_TYPE",
								details: {
									allowedTypes: FILE_VALIDATION.ALLOWED_FILE_TYPES,
									providedType: fileExt,
								},
							},
						);
					}
				}
			}

			// Validate file size
			if (fileSize !== null) {
				const maxSize = FILE_VALIDATION.MAX_FILE_SIZE;
				const minSize = FILE_VALIDATION.MIN_FILE_SIZE;

				if (maxSize && fileSize > maxSize) {
					throw new ValidationError(
						ERROR_MESSAGES.FILE_VALIDATION.FILE_SIZE_EXCEEDED,
						{
							statusCode: 413,
							errorCode: "FILE_TOO_LARGE",
							details: {
								maxSize,
								providedSize: fileSize,
							},
						},
					);
				}

				if (minSize && fileSize < minSize) {
					throw new ValidationError(
						ERROR_MESSAGES.FILE_VALIDATION.FILE_SIZE_BELOW,
						{
							statusCode: 413,
							errorCode: "FILE_TOO_SMALL",
							details: {
								minSize,
								providedSize: fileSize,
							},
						},
					);
				}
			}
		}

		await next();
	};
};
