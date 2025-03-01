export const RATE_LIMIT = {
  ENABLE: true,
  NAMESPACE: "tusflow-api",
  BLOCK_DURATION: 60 * 60, // 1 hour
  // Different limits for different endpoints
  LIMITS: {
    // For initiating new uploads
    POST: {
      tokens: 50, // Number of requests
      interval: 3600, // Time window in seconds (1 hour)
    },
    // For upload chunks
    PATCH: {
      tokens: 500, // More tokens for chunk uploads
      interval: 3600,
    },
    // For other operations (HEAD, DELETE)
    DEFAULT: {
      tokens: 100,
      interval: 3600,
    },
  },
};
