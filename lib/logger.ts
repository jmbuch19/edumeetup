/**
 * Logger Utility
 *
 * Provides centralized logging with environment-aware filtering.
 * - `info`: Only logs in non-production environments to reduce noise.
 * - `warn`: Logs warnings in all environments.
 * - `error`: Logs errors in all environments (captured by error tracking tools like Sentry).
 */
export const logger = {
    info: (message: string, ...args: any[]) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[INFO] ${message}`, ...args)
        }
    },
    warn: (message: string, ...args: any[]) => {
        console.warn(`[WARN] ${message}`, ...args)
    },
    error: (message: string, ...args: any[]) => {
        console.error(`[ERROR] ${message}`, ...args)
    }
}
