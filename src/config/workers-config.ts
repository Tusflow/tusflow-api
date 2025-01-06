export const WORKER_CONSTRAINTS = {
	MAX_EXECUTION_TIME: 25000, // 25 seconds (leaving 5s buffer from 30s limit)
	MEMORY_LIMIT: 128 * 1024 * 1024, // 128MB in bytes
	CHUNK_MEMORY_LIMIT: 50 * 1024 * 1024, // 50MB for chunk processing
	NETWORK_OVERHEAD: 1.2, // 20% overhead for network operations
	CONCURRENT_UPLOADS: 5, // Maximum concurrent upload streams
};
