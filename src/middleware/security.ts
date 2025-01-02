import { SECURITY_CONFIG } from '@/config';
import { every } from 'hono/combine';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { secureHeaders } from 'hono/secure-headers';

import { authentication } from './authentication';
import { createRateLimiter } from './ratelimit';

// Individual middleware definitions
const secureHeadersMiddleware = secureHeaders({
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
    },
    permissionsPolicy: {
        accelerometer: [],
        camera: [],
        geolocation: [],
        gyroscope: [],
        magnetometer: [],
        microphone: [],
        payment: [],
        usb: [],
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
});

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

const rateLimitMiddleware = createRateLimiter();

// Create authentication middleware with public paths excluded
const authMiddleware = authentication({
    excludePaths: ['/health'], // Add your public paths here
});

// Combined security middleware that runs all security measures in sequence
export const securityMiddleware = every(
    secureHeadersMiddleware,
    corsMiddleware,
    authMiddleware,
    csrfProtectionMiddleware,
    rateLimitMiddleware
);
