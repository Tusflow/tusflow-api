import { ERROR_MESSAGES, RATE_LIMIT } from '@/config';
import { ValidationError } from '@/utils/error/customErrors';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis/cloudflare';
import type { Context, Next } from 'hono';
import { env } from 'hono/adapter';

export const createRateLimiter = () => {
    return async (c: Context, next: Next) => {
        if (!RATE_LIMIT.ENABLE) {
            return next();
        }

        const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = env<{
            UPSTASH_REDIS_REST_URL: string;
            UPSTASH_REDIS_REST_TOKEN: string;
        }>(c);

        const redis = new Redis({
            url: UPSTASH_REDIS_REST_URL,
            token: UPSTASH_REDIS_REST_TOKEN,
        });

        const identifier = c.req.header('CF-Connecting-IP') || 'unknown';
        const method = c.req.method;

        // Get rate limit config based on HTTP method
        const limitConfig =
            RATE_LIMIT.LIMITS[method as keyof typeof RATE_LIMIT.LIMITS] ||
            RATE_LIMIT.LIMITS.DEFAULT;

        const ratelimit = new Ratelimit({
            redis,
            prefix: RATE_LIMIT.KEY_PREFIX,
            limiter: Ratelimit.slidingWindow(
                limitConfig.tokens,
                `${limitConfig.interval} s`
            ),
        });

        const { success, limit, reset, remaining } = await ratelimit.limit(
            `${identifier}:${method}`
        );

        // Set rate limit headers
        c.header('X-RateLimit-Limit', limit.toString());
        c.header('X-RateLimit-Remaining', remaining.toString());
        c.header('X-RateLimit-Reset', reset.toString());

        if (!success) {
            throw new ValidationError(
                ERROR_MESSAGES.RATE_LIMIT.LIMIT_EXCEEDED,
                {
                    statusCode: 429,
                    errorCode: 'RATE_LIMIT_EXCEEDED',
                    details: {
                        limit,
                        reset,
                        retryAfter: Math.ceil((reset - Date.now()) / 1000),
                    },
                }
            );
        }

        await next();
    };
};
