// Application error messages
export const ERROR_MESSAGES = {
	UPLOAD: {
		LENGTH_REQUIRED: "Upload-Length or Upload-Defer-Length header required",
		INVALID_OFFSET: "Invalid Upload-Offset header",
		NOT_FOUND: "Upload not found",
		CHECKSUM_MISMATCH: "Checksum verification failed",
		PART_NUMBER_MISSING: "Part number missing",
		TIMEOUT: "Request timed out",
		INVALID_CONTENT_TYPE: "Invalid Content-Type",
		EMPTY_CHUNK: "Empty chunk",
	},
	S3: {
		MULTIPART_INIT_FAILED: "Failed to initialize multipart upload",
		UPLOAD_FAILED: "Failed to upload part to S3",
		DELETE_FAILED: "Failed to delete object from S3",
		HEAD_FAILED: "Failed to get object metadata from S3",
		ABORT_MULTIPART_FAILED: "Failed to abort multipart upload",
	},
	REDIS: {
		CONNECTION_FAILED: "Failed to connect to Redis",
		OPERATION_FAILED: "Redis operation failed",
	},
	RATE_LIMIT: {
		LIMIT_EXCEEDED: "Rate limit exceeded. Please try again later.",
		BLOCKED:
			"Your access has been temporarily blocked due to excessive requests.",
	},
	FILE_VALIDATION: {
		INVALID_FILE_TYPE: "Invalid file type",
		FILE_SIZE_EXCEEDED: "File size exceeded",
		FILE_SIZE_BELOW: "File size below minimum limit",
	},
	AUTH: {
		SERVER_ERROR: "Server configuration error",
	},
};
