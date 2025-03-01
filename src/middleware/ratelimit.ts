import { ERROR_MESSAGES, RATE_LIMIT } from "@/config";
import { Ratelimit } from "@unkey/ratelimit";
import type { Context, Next } from "hono";
import type { Bindings } from "@/types/honoTypes";
import { env } from "hono/adapter";

export const RateLimiter = () => {
  return async (c: Context, next: Next) => {
    if (!RATE_LIMIT.ENABLE) {
      return next();
    }

    const { UNKEY_ROOT_KEY } = env<Bindings>(c);

    const identifier = c.req.header("CF-Connecting-IP") || "unknown";
    const method = c.req.method;

    const fallback = (identifier: string) => ({
      success: true,
      limit: 0,
      reset: 0,
      remaining: 0,
    });

    // Get rate limit config based on HTTP method
    const limitConfig =
      RATE_LIMIT.LIMITS[method as keyof typeof RATE_LIMIT.LIMITS] ||
      RATE_LIMIT.LIMITS.DEFAULT;

    const ratelimit = new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: RATE_LIMIT.NAMESPACE,
      limit: limitConfig.tokens,
      duration: `${limitConfig.interval} s`,
      async: true,
      timeout: {
        ms: 3000, // only wait 3s at most before returning the fallback
        fallback,
      },
      onError: (err, identifier) => {
        console.error(`${identifier}:${method} - ${err.message}`);
        return fallback(`${identifier}:${method}`);
      },
    });

    try {
      const { success, limit, reset, remaining } = await ratelimit.limit(
        `${identifier}:${method}`
      );

      // Set rate limit headers
      c.header("X-RateLimit-Limit", limit.toString());
      c.header("X-RateLimit-Remaining", remaining.toString());
      c.header("X-RateLimit-Reset", reset.toString());

      if (!success) {
        return c.json(
          {
            error: ERROR_MESSAGES.RATE_LIMIT.LIMIT_EXCEEDED,
            code: "RATE_LIMIT_EXCEEDED",
            details: {
              limit,
              reset,
              retryAfter: Math.ceil((reset - Date.now()) / 1000),
            },
          },
          429
        );
      }

      await next();
    } catch (error) {
      console.error("Rate limiter error:", error);
      return c.json({ error: "Rate limiting service error" }, 500);
    }
  };
};
