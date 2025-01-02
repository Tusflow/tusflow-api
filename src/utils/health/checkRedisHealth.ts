import type { Redis } from '@upstash/redis/cloudflare';

// Check Redis health
export async function checkRedisHealth(redis: Redis): Promise<boolean> {
    try {
        await redis.ping(); // Ping Redis to check if it's healthy
        return true;
    } catch (error) {
        console.error('Redis health check failed:', error);
        return false;
    }
}
