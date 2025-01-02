import type { Bindings } from '@/types/honoTypes';
import { checkRedisHealth, checkS3Health } from '@/utils/health';
import { cleanupStaleUploads } from '@/utils/other/cleanupUtils';
import { S3Client } from '@aws-sdk/client-s3';
import { Redis } from '@upstash/redis/cloudflare';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: Bindings }>();

// Health check endpoint
app.get('/health', async (c) => {
    const startTime = performance.now();

    try {
        // Initialize clients
        const s3Client = new S3Client({
            region: c.env.AWS_REGION,
            endpoint: c.env.AWS_ENDPOINT,
            credentials: {
                accessKeyId: c.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: c.env.AWS_SECRET_ACCESS_KEY,
            },
            forcePathStyle: true,
        });

        const redis = new Redis({
            url: c.env.UPSTASH_REDIS_REST_URL,
            token: c.env.UPSTASH_REDIS_REST_TOKEN,
        });

        // Check services health in parallel
        const [s3Health, redisHealth] = await Promise.all([
            checkS3Health(s3Client),
            checkRedisHealth(redis),
        ]);

        const latency = Math.round(performance.now() - startTime);

        // Simplified: If any service is down, return 503
        if (!s3Health || !redisHealth) {
            c.header('X-Health-Check', 'error');
            c.header('X-Response-Time', `${latency}ms`);
            c.header('User-Agent', 'OpenStatus/1.0');
            return c.json({ status: 'error' }, 503);
        }

        // Both services are healthy - return 200
        c.header('X-Health-Check', 'ok');
        c.header('X-Response-Time', `${latency}ms`);
        c.header('User-Agent', 'OpenStatus/1.0');
        return c.json({ status: 'ok' }, 200);
    } catch (error) {
        // Any error results in 503
        c.header('X-Health-Check', 'error');
        c.header('X-Response-Time', '0ms');
        c.header('User-Agent', 'OpenStatus/1.0');
        return c.json({ status: 'error' }, 503);
    }
});

// Add this new cron-specific cleanup endpoint
app.get('/_internal/cron/cleanup', async (c) => {
    const {
        AWS_ACCESS_KEY_ID,
        AWS_ENDPOINT,
        AWS_REGION,
        AWS_SECRET_ACCESS_KEY,
        UPSTASH_REDIS_REST_TOKEN,
        UPSTASH_REDIS_REST_URL,
        AWS_BUCKET_NAME,
    } = c.env;

    // Verify it's a genuine Cloudflare cron trigger
    const cronHeader = c.req.header('X-Cloudflare-Cron');
    if (!cronHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const s3Client = new S3Client({
            region: AWS_REGION,
            endpoint: AWS_ENDPOINT,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY,
            },
            forcePathStyle: true,
        });

        const redis = new Redis({
            url: UPSTASH_REDIS_REST_URL,
            token: UPSTASH_REDIS_REST_TOKEN,
        });

        const result = await cleanupStaleUploads(
            s3Client,
            redis,
            AWS_BUCKET_NAME
        );

        return c.json({ success: true, ...result }, 200);
    } catch (error) {
        console.error('Cleanup failed:', error);
        return c.json(
            {
                success: false,
                error: 'Cleanup operation failed',
            },
            500
        );
    }
});

export default app;
