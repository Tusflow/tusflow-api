import { UPLOAD_CONFIG } from '@/config';
import { StorageError } from '@/utils/error/customErrors';

import { CircuitBreaker } from './circuitBreaker';

const circuitBreaker = new CircuitBreaker({
    timeout: UPLOAD_CONFIG.CIRCUIT_BREAKER.TIMEOUT,
    failureThreshold: UPLOAD_CONFIG.CIRCUIT_BREAKER.FAILURE_THRESHOLD,
    resetTimeout: UPLOAD_CONFIG.CIRCUIT_BREAKER.RESET_TIMEOUT,
});

export async function retryOperation<T>(
    operation: () => Promise<T>,
    errorMessage: string
): Promise<T> {
    const { MAX_ATTEMPTS, DELAY } = UPLOAD_CONFIG.RETRY;
    let lastError: Error | null = null;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        try {
            return await circuitBreaker.execute(operation);
        } catch (error) {
            lastError = error as Error;
            console.error(
                `Operation failed (attempt ${i + 1}/${MAX_ATTEMPTS}):`,
                error
            );

            if (i < MAX_ATTEMPTS - 1) {
                const backoffDelay = DELAY * Math.pow(2, i); // Exponential backoff
                await new Promise((resolve) =>
                    setTimeout(resolve, backoffDelay)
                );
            }
        }
    }

    throw new StorageError(errorMessage, {
        originalError: lastError,
        attempts: MAX_ATTEMPTS,
    });
}
