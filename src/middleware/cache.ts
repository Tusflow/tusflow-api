import { CACHE_CONFIG } from '@/config';
import type { Context } from 'hono';
import { cache } from 'hono/cache';

// Cache middleware configuration
export const cacheMiddleware = cache({
    cacheName: CACHE_CONFIG.CACHE_NAME,
    wait: true,
    // Use upload timeout as max-age to align with upload session
    cacheControl: `public, max-age=${CACHE_CONFIG.MAX_AGE}`,
    vary: CACHE_CONFIG.VARY_HEADERS,
    keyGenerator: (c: Context) => {
        // Use the full request URL as the base
        const fullUrl = new URL(
            c.req.url,
            'https://uploader-tus-api.marsappollo3.workers.dev'
        );
        const method = c.req.method;
        const isAuthenticated = c.req.header('Authorization') ? '1' : '0';

        // Append method and auth status as search parameters
        fullUrl.searchParams.append('_method', method);
        fullUrl.searchParams.append('_auth', isAuthenticated);

        return fullUrl.toString();
    },
});
