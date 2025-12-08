/**
 * Production-ready logger that replaces console.log
 * - In development: logs everything
 * - In production: only logs warnings and errors
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerConfig {
    isDevelopment: boolean;
    prefix?: string;
}

const config: LoggerConfig = {
    isDevelopment: process.env.NODE_ENV === "development",
    prefix: "[Santini]",
};

function formatMessage(
    level: LogLevel,
    prefix: string,
    ...args: unknown[]
): string {
    const timestamp = new Date().toISOString();
    const levelTag = level.toUpperCase().padEnd(5);
    return `${timestamp} ${levelTag} ${prefix}`;
}

function shouldLog(level: LogLevel): boolean {
    if (config.isDevelopment) return true;

    // In production, only log warnings and errors
    return level === "warn" || level === "error";
}

/**
 * Logger utility with environment-aware logging
 */
export const logger = {
    /**
     * Debug level - only in development
     */
    debug: (...args: unknown[]) => {
        if (shouldLog("debug")) {
            console.log(formatMessage("debug", config.prefix || ""), ...args);
        }
    },

    /**
     * Info level - only in development
     */
    info: (...args: unknown[]) => {
        if (shouldLog("info")) {
            console.info(formatMessage("info", config.prefix || ""), ...args);
        }
    },

    /**
     * Warning level - always logged
     */
    warn: (...args: unknown[]) => {
        if (shouldLog("warn")) {
            console.warn(formatMessage("warn", config.prefix || ""), ...args);
        }
    },

    /**
     * Error level - always logged
     */
    error: (...args: unknown[]) => {
        if (shouldLog("error")) {
            console.error(formatMessage("error", config.prefix || ""), ...args);
        }
    },

    /**
     * Create a scoped logger with a custom prefix
     */
    scope: (scope: string) => ({
        debug: (...args: unknown[]) => {
            if (shouldLog("debug")) {
                console.log(
                    formatMessage("debug", `${config.prefix} [${scope}]`),
                    ...args,
                );
            }
        },
        info: (...args: unknown[]) => {
            if (shouldLog("info")) {
                console.info(
                    formatMessage("info", `${config.prefix} [${scope}]`),
                    ...args,
                );
            }
        },
        warn: (...args: unknown[]) => {
            if (shouldLog("warn")) {
                console.warn(
                    formatMessage("warn", `${config.prefix} [${scope}]`),
                    ...args,
                );
            }
        },
        error: (...args: unknown[]) => {
            if (shouldLog("error")) {
                console.error(
                    formatMessage("error", `${config.prefix} [${scope}]`),
                    ...args,
                );
            }
        },
    }),

    /**
     * Log API request details (only in development)
     */
    api: (method: string, path: string, details?: Record<string, unknown>) => {
        if (shouldLog("debug")) {
            console.log(
                formatMessage("debug", `${config.prefix} [API]`),
                `${method} ${path}`,
                details || "",
            );
        }
    },

    /**
     * Log database query (only in development)
     */
    db: (
        operation: string,
        table: string,
        details?: Record<string, unknown>,
    ) => {
        if (shouldLog("debug")) {
            console.log(
                formatMessage("debug", `${config.prefix} [DB]`),
                `${operation} ${table}`,
                details || "",
            );
        }
    },
};

export default logger;
