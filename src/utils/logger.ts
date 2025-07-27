/**
 * Simplified logger utility for consistent logging across the application
 */

// Configurable log level
type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
  minLevel?: LogLevel;
  timestamp?: boolean;
  enabled?: boolean;
}

// Default options
const defaultOptions: LoggerOptions = {
  minLevel: process.env.NODE_ENV === "production" ? "info" : "debug",
  timestamp: true,
  enabled: true,
};

// Log level priority (higher number = higher priority)
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Global logger configuration
let globalOptions: LoggerOptions = { ...defaultOptions };

/**
 * Configure the global logger settings
 */
export function configureLogger(options: LoggerOptions): void {
  globalOptions = { ...globalOptions, ...options };
}

/**
 * Create a logger instance with a specific context
 */
export function createLogger(context: string) {
  return {
    debug(message: string, ...args: any[]): void {
      if (
        !globalOptions.enabled ||
        LOG_LEVELS[globalOptions.minLevel || "info"] > LOG_LEVELS["debug"]
      )
        return;
      console.debug(
        `${globalOptions.timestamp ? new Date().toISOString() + " " : ""}[${context}] ${message}`,
        ...args,
      );
    },

    info(message: string, ...args: any[]): void {
      if (
        !globalOptions.enabled ||
        LOG_LEVELS[globalOptions.minLevel || "info"] > LOG_LEVELS["info"]
      )
        return;
      console.info(
        `${globalOptions.timestamp ? new Date().toISOString() + " " : ""}[${context}] ${message}`,
        ...args,
      );
    },

    warn(message: string, ...args: any[]): void {
      if (
        !globalOptions.enabled ||
        LOG_LEVELS[globalOptions.minLevel || "info"] > LOG_LEVELS["warn"]
      )
        return;
      console.warn(
        `${globalOptions.timestamp ? new Date().toISOString() + " " : ""}[${context}] ${message}`,
        ...args,
      );
    },

    error(message: string, ...args: any[]): void {
      if (
        !globalOptions.enabled ||
        LOG_LEVELS[globalOptions.minLevel || "info"] > LOG_LEVELS["error"]
      )
        return;
      console.error(
        `${globalOptions.timestamp ? new Date().toISOString() + " " : ""}[${context}] ${message}`,
        ...args,
      );
    },
  };
}

// Default logger instance
export const logger = createLogger("App");
