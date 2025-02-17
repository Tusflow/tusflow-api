import { ERROR_MESSAGES } from "@/config";
import type { Env } from "@/types/honoTypes";
import { type UnkeyContext, unkey } from "@unkey/hono";
import type { Context, Next } from "hono";
import { env } from "hono/adapter";

interface AuthConfig {
  excludePaths?: string[];
  onError?: (
    c: Context,
    err: {
      code: "INTERNAL_SERVER_ERROR";
      docs: string;
      message: string;
      requestId: string;
    }
  ) => Response | Promise<Response>;
  handleInvalidKey?: (
    c: Context,
    result: UnkeyContext
  ) => Response | Promise<Response>;
  enabled?: boolean;
}

export function authentication(config: AuthConfig = {}) {
  if (config.enabled === false) {
    return async (c: Context, next: Next) => {
      return next();
    };
  }

  return async (c: Context, next: Next) => {
    // Check if path is excluded from authentication
    const path = new URL(c.req.url).pathname;
    if (isPathExcluded(path, config.excludePaths)) {
      return next();
    }

    // Verify Unkey API ID exists
    const { UNKEY_API_ID } = env<Env>(c);
    if (!UNKEY_API_ID) {
      return new Response(ERROR_MESSAGES.AUTH.SERVER_ERROR, { status: 500 });
    }

    // Initialize Unkey middleware with custom handlers
    const middleware = unkey({
      apiId: UNKEY_API_ID,
      onError: config.onError || defaultErrorHandler,
      handleInvalidKey: config.handleInvalidKey || defaultInvalidKeyHandler,
    });

    return middleware(c, next);
  };
}

// Helper function to check if path is excluded
function isPathExcluded(path: string, excludePaths: string[] = []): boolean {
  return excludePaths.some((excludePath) => {
    if (excludePath.includes("*")) {
      const pattern = new RegExp("^" + excludePath.replace("*", ".*") + "$");
      return pattern.test(path);
    }
    return path.startsWith(excludePath);
  });
}

// Default error handler
function defaultErrorHandler(
  c: Context,
  err: {
    code: "INTERNAL_SERVER_ERROR";
    docs: string;
    message: string;
    requestId: string;
  }
): Response {
  console.error("Authentication error:", err);
  return new Response("Authentication failed", {
    status: 500,
    headers: { "WWW-Authenticate": "Bearer" },
  });
}

// Default invalid key handler
function defaultInvalidKeyHandler(c: Context, result: UnkeyContext): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": "Bearer" },
  });
}
