// Custom error class for Tus errors
export class TusError extends Error {
	constructor(
		message: string,
		public statusCode: number,
		public errorCode: string,
		public details?: any,
	) {
		super(message);
		this.name = "TusError";
	}
}

// Validation error class
export class ValidationError extends TusError {
	constructor(message: string, details?: any) {
		super(message, 400, "VALIDATION_ERROR", details);
	}
}

// Storage error class
export class StorageError extends TusError {
	constructor(message: string, details?: any) {
		super(message, 500, "STORAGE_ERROR", details);
	}
}

// Cache error class
export class CacheError extends TusError {
	constructor(message: string, details?: any) {
		super(message, 500, "CACHE_ERROR", details);
	}
}
