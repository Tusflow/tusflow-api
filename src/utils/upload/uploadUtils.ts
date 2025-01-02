import { UPLOAD_CONFIG, WORKER_CONSTRAINTS } from '@/config';

export function calculateOptimalChunkSize(
    totalSize: number,
    networkSpeed: number
): number {
    const { MIN, MAX } = UPLOAD_CONFIG.CHUNK_SIZE;

    // Consider Worker memory constraints
    const memoryBasedMax = Math.floor(
        WORKER_CONSTRAINTS.CHUNK_MEMORY_LIMIT /
            WORKER_CONSTRAINTS.NETWORK_OVERHEAD
    );

    // Dynamically adjust chunk size based on network speed and memory
    const optimalSize = Math.min(
        networkSpeed * 2, // 2 seconds worth of data
        MAX,
        memoryBasedMax
    );

    // Ensure minimum chunk size and max parts constraint
    const minRequiredSize = Math.ceil(
        totalSize / UPLOAD_CONFIG.UPLOAD.MAX_PARTS
    );
    return Math.max(Math.min(optimalSize, MAX), MIN, minRequiredSize);
}

export function calculateNetworkSpeed(
    uploadedBytes: number,
    elapsedTime: number
): number {
    return uploadedBytes / (elapsedTime / 1000); // bytes per second
}
