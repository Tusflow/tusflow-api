import type { Context, Next } from "hono";

import { TusError } from "./customErrors";

// Error handler middleware
export function errorHandler() {
	return async (c: Context, next: Next) => {
		try {
			await next();
		} catch (err) {
			const timestamp = new Date().toISOString();
			const requestId = crypto.randomUUID();

			console.error(`[${timestamp}] RequestId=${requestId} Error:`, {
				name: (err as Error).name,
				message: (err as Error).message,
				stack: (err as Error).stack,
				details: (err as TusError).details,
			});

			if (err instanceof TusError) {
				return c.json({
					error: {
						code: err.errorCode,
						message: err.message,
						requestId,
						timestamp,
					},
					status: err.statusCode,
				});
			}

			return c.json({
				error: {
					code: "INTERNAL_ERROR",
					message: "An unexpected error occurred",
					requestId,
					timestamp,
				},
				status: 500,
			});
		}
	};
}
