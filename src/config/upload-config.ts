export const UPLOAD_CONFIG = {
    DOMAIN: '',
    CHUNK_SIZE: {
        MIN: 5 * 1024 * 1024, // 5MB
        MAX: 50 * 1024 * 1024, // 50MB
        TARGET_UPLOAD_TIME: 1, // 1 second
    },
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY: 500, // 500ms
    },
    CIRCUIT_BREAKER: {
        TIMEOUT: 25000, // 25 seconds (leaving buffer)
        FAILURE_THRESHOLD: 3,
        RESET_TIMEOUT: 5000, // 5 seconds
    },
    UPLOAD: {
        INCOMPLETE_TTL: 24 * 60 * 60, // 24 hours in seconds
        MAX_PARTS: 10000,
        TIMEOUT: 25000, // 25 seconds
    },

    PARALLEL_UPLOADS: {
        MAX_CONCURRENT: 10, // Increased from 5
        BATCH_SIZE: 5, // Increased from 3
    },
};
