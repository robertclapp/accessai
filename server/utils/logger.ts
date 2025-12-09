/**
 * Logger Utility
 * 
 * Provides structured logging with consistent formatting,
 * log levels, and context tracking.
 * 
 * @module server/utils/logger
 */

// ============================================
// TYPES
// ============================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  userId?: number;
  requestId?: string;
  service?: string;
  action?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ============================================
// CONFIGURATION
// ============================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Get log level from environment or default to "info"
const currentLogLevel: LogLevel = 
  (process.env.LOG_LEVEL as LogLevel) || 
  (process.env.NODE_ENV === "development" ? "debug" : "info");

// ============================================
// LOGGER CLASS
// ============================================

/**
 * Logger class for structured logging
 */
class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Creates a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Checks if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
  }

  /**
   * Formats and outputs a log entry
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context }
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    // In production, output JSON for log aggregation
    // In development, use readable format
    if (process.env.NODE_ENV === "production") {
      console[level](JSON.stringify(entry));
    } else {
      const contextStr = entry.context && Object.keys(entry.context).length > 0
        ? ` ${JSON.stringify(entry.context)}`
        : "";
      const errorStr = entry.error
        ? `\n  Error: ${entry.error.name}: ${entry.error.message}\n  ${entry.error.stack}`
        : "";
      
      const prefix = `[${entry.timestamp}] [${level.toUpperCase().padEnd(5)}]`;
      console[level](`${prefix} ${message}${contextStr}${errorStr}`);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const err = error instanceof Error ? error : undefined;
    this.log("error", message, context, err);
  }

  /**
   * Log the start of an operation (for timing)
   */
  startOperation(operation: string, context?: LogContext): () => void {
    const startTime = Date.now();
    this.debug(`Starting: ${operation}`, context);

    return () => {
      const duration = Date.now() - startTime;
      this.debug(`Completed: ${operation}`, { ...context, durationMs: duration });
    };
  }

  /**
   * Log an API request
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    context?: LogContext
  ): void {
    const level: LogLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    this.log(level, `${method} ${path} ${statusCode}`, {
      ...context,
      method,
      path,
      statusCode,
      durationMs
    });
  }
}

// ============================================
// EXPORTS
// ============================================

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger for a specific service
 */
export function createLogger(service: string, context?: LogContext): Logger {
  return new Logger({ service, ...context });
}

/**
 * Pre-configured loggers for common services
 */
export const loggers = {
  api: createLogger("api"),
  db: createLogger("database"),
  ai: createLogger("ai"),
  social: createLogger("social"),
  scheduler: createLogger("scheduler"),
  auth: createLogger("auth"),
  stripe: createLogger("stripe"),
  export: createLogger("export")
};
