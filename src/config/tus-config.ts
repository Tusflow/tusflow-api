export const TUS_CONFIG = {
	VERSION: "1.0.0",
	SUPPORTED_VERSIONS: ["1.0.0", "1.0.0"],
	MAX_SIZE: 1024 * 1024 * 1024, // 1GB
	EXTENSIONS: [
		"creation",
		"creation-with-upload",
		"termination",
		"concatenation",
		"checksum",
		"expiration",
	],
	CHECKSUM_ALGORITHMS: ["sha1", "md5"],
	HEADERS: {
		RESUMABLE: "Tus-Resumable",
		VERSION: "Tus-Version",
		EXTENSION: "Tus-Extension",
		MAX_SIZE: "Tus-Max-Size",
		OFFSET: "Upload-Offset",
		LENGTH: "Upload-Length",
		DEFER_LENGTH: "Upload-Defer-Length",
		METADATA: "Upload-Metadata",
		EXPIRES: "Upload-Expires",
		CHECKSUM: "Upload-Checksum",
		CHECKSUM_ALGORITHM: "Tus-Checksum-Algorithm",
		CONCAT: "Upload-Concat",
	},
};
