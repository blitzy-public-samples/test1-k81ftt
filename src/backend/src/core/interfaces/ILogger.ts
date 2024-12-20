/**
 * @fileoverview Core logging interface definition supporting structured logging,
 * correlation IDs, and ELK stack integration for enterprise-grade observability.
 * @version 1.0.0
 */

/**
 * Standard logging levels for consistent log categorization across the application.
 */
export enum LogLevel {
    ERROR = 'ERROR',
    WARN = 'WARN',
    INFO = 'INFO',
    DEBUG = 'DEBUG'
}

/**
 * Comprehensive structure for logging context information supporting distributed tracing.
 * Integrates with ELK stack and provides correlation capabilities across microservices.
 */
export interface LogContext {
    /** Unique identifier for tracing requests across services */
    correlationId: string;
    
    /** Optional authenticated user identifier */
    userId?: string;
    
    /** Unique identifier for the current request */
    requestId?: string;
    
    /** OpenTelemetry trace identifier */
    traceId?: string;
    
    /** OpenTelemetry span identifier */
    spanId?: string;
    
    /** Service identifier for microservice architecture */
    service: string;
    
    /** Deployment environment identifier */
    environment: string;
    
    /** Additional contextual information as key-value pairs */
    additionalContext: Record<string, unknown>;
}

/**
 * Structured metadata for log entries supporting ELK stack integration.
 * Provides consistent format for log aggregation and analysis.
 */
export interface LogMetadata {
    /** ISO 8601 timestamp of the log entry */
    timestamp: Date;
    
    /** Log severity level */
    level: LogLevel;
    
    /** Structured context information */
    context: LogContext;
    
    /** Array of searchable tags for log categorization */
    tags: string[];
}

/**
 * Core logging interface providing structured logging capabilities with
 * support for correlation IDs, context management, and ELK stack integration.
 */
export interface ILogger {
    /**
     * Logs information level messages with structured metadata.
     * @param message - Log message or structured data object
     * @param meta - Optional additional metadata for the log entry
     */
    info(message: string | Record<string, unknown>, meta?: Partial<LogMetadata>): void;

    /**
     * Logs error level messages with stack traces and structured metadata.
     * @param message - Error object, message string, or structured data
     * @param meta - Optional additional metadata for the log entry
     */
    error(message: string | Error | Record<string, unknown>, meta?: Partial<LogMetadata>): void;

    /**
     * Logs warning level messages with structured metadata.
     * @param message - Log message or structured data object
     * @param meta - Optional additional metadata for the log entry
     */
    warn(message: string | Record<string, unknown>, meta?: Partial<LogMetadata>): void;

    /**
     * Logs debug level messages with structured metadata.
     * @param message - Log message or structured data object
     * @param meta - Optional additional metadata for the log entry
     */
    debug(message: string | Record<string, unknown>, meta?: Partial<LogMetadata>): void;

    /**
     * Sets correlation ID for distributed request tracing.
     * @param correlationId - Unique identifier for request correlation
     */
    setCorrelationId(correlationId: string): void;

    /**
     * Sets comprehensive logging context for the current scope.
     * @param context - Partial context object to merge with existing context
     */
    setContext(context: Partial<LogContext>): void;

    /**
     * Creates a new logger instance with merged context.
     * Useful for creating child loggers with additional context.
     * @param context - Partial context object to merge with existing context
     * @returns New logger instance with merged context
     */
    withContext(context: Partial<LogContext>): ILogger;

    /**
     * Clears all context data from the logger.
     * Useful when reusing logger instances across requests.
     */
    clearContext(): void;
}