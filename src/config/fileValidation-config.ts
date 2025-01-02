export const FILE_VALIDATION = {
    // Set to true to enable file type validation
    ENABLE_TYPE_VALIDATION: true,
    // Set to null or empty array to allow all types
    // Example: ['.pdf', '.doc', '.docx', '.txt']
    ALLOWED_FILE_TYPES: [
        '.pdf',
        '.doc',
        '.docx',
        '.txt',
        '.jpg',
        '.jpeg',
        '.png',
        '.mp4',
    ],
    // Set to null for no size limit
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MIN_FILE_SIZE: 1024, // 1KB
};
