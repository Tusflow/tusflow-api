import { SECURITY_CONFIG } from "@/config";
import { every } from "hono/combine";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";

import { authentication } from "./authentication";
import { RateLimiter } from "./ratelimit";

// Individual middleware definitions
const secureHeadersMiddleware = secureHeaders();

const corsMiddleware = cors({
  origin: (origin) => {
    const ALLOWED_ORIGINS = SECURITY_CONFIG.ALLOWED_ORIGINS;
    return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  },
  allowMethods: SECURITY_CONFIG.ALLOWED_METHODS,
  allowHeaders: SECURITY_CONFIG.ALLOWED_HEADERS,
  exposeHeaders: SECURITY_CONFIG.EXPOSE_HEADERS,
  credentials: SECURITY_CONFIG.CREDENTIALS,
});

const csrfProtectionMiddleware = csrf({
  origin: (origin) => {
    const ALLOWED_ORIGINS = SECURITY_CONFIG.ALLOWED_ORIGINS;
    return ALLOWED_ORIGINS.includes(origin);
  },
});

const rateLimitMiddleware = RateLimiter();

// Create authentication middleware with public paths excluded
const authMiddleware = authentication({
  excludePaths: SECURITY_CONFIG.AUTHENTICATION.excludePaths,
  enabled: SECURITY_CONFIG.AUTHENTICATION.enabled,
});

// Combined security middleware that runs all security measures in sequence
export const securityMiddleware = every(
  secureHeadersMiddleware,
  corsMiddleware,
  authMiddleware,
  csrfProtectionMiddleware,
  rateLimitMiddleware
);
