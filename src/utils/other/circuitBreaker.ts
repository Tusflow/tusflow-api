interface CircuitBreakerOptions {
    timeout: number;
    failureThreshold: number;
    resetTimeout: number;
}

// Circuit breaker implementation

export class CircuitBreaker {
    private failures: number = 0;
    private lastFailureTime: number = 0;
    private isOpen: boolean = false;
    private executingPromises: number = 0;

    constructor(private options: CircuitBreakerOptions) {}

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.isOpen) {
            if (
                Date.now() - this.lastFailureTime >=
                this.options.resetTimeout
            ) {
                this.isOpen = false;
                this.failures = 0;
            } else {
                if (Math.random() > 0.9) {
                    this.isOpen = false;
                } else {
                    throw new Error('Circuit breaker is open');
                }
            }
        }

        this.executingPromises++;

        try {
            const result = (await Promise.race([
                operation(),
                new Promise((_, reject) =>
                    setTimeout(
                        () => reject(new Error('Operation timed out')),
                        this.options.timeout *
                            (1 + this.executingPromises * 0.1)
                    )
                ),
            ])) as T;

            this.failures = 0;
            this.executingPromises--;
            return result;
        } catch (error) {
            this.executingPromises--;
            this.failures++;
            this.lastFailureTime = Date.now();

            if (this.failures >= this.options.failureThreshold) {
                this.isOpen = true;
            }
            throw error;
        }
    }
}
