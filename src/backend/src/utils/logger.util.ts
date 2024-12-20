/**
 * @fileoverview Enterprise-grade logging utility implementation using Winston
 * with support for structured logging, correlation IDs, context management,
 * log rotation, ELK stack integration, and enhanced business metrics tracking.
 * @version 1.0.0
 */

import winston from 'winston'; // ^3.11.0
import DailyRotateFile from 'winston-daily-rotate-file'; // ^4.7.1
import { ElasticsearchTransport } from 'winston-elasticsearch'; // ^0.17.4
import { trace, context, SpanStatusCode } from '@opentelemetry/api'; // ^1.7.0
import { ILogger, LogLevel, LogContext, LogMetadata } from '../core/interfaces/ILogger';
import { loggerConfig } from '../config/logger.config';

/**
 * Circuit breaker for Elasticsearch transport
 */
class CircuitBreaker {
    private failures: number = 0;
    private lastFailure: number = 0;
    private readonly threshold: number = 5;
    private readonly resetTimeout: number = 60000; // 1 minute

    public async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.isOpen()) {
            throw new Error('Circuit breaker is open');
        }

        try {
            const result = await operation();
            this.reset();
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    private isOpen(): boolean {
        if (this.failures >= this.threshold) {
            const timeSinceLastFailure = Date.now() - this.lastFailure;
            if (timeSinceLastFailure < this.resetTimeout) {
                return true;
            }
            this.reset();
        }
        return false;
    }

    private recordFailure(): void {
        this.failures++;
        this.lastFailure = Date.now();
    }

    private reset(): void {
        this.failures = 0;
        this.lastFailure = 0;
    }
}

/**
 * Buffer for collecting and aggregating metrics before logging
 */
class MetricsBuffer {
    private buffer: Record<string, any>[] = [];
    private readonly flushSize: number = 100;
    private readonly flushInterval: number = 30000; // 30 seconds

    constructor() {
        setInterval(() => this.flush(), this.flushInterval);
    }

    public add(metrics: Record<string, any>): void {
        this.buffer.push({
            ...metrics,
            timestamp: new Date().toISOString()
        });

        if (this.buffer.length >= this.flushSize) {
            this.flush();
        }
    }

    public async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const metrics = [...this.buffer];
        this.buffer = [];
        return Promise.resolve(metrics);
    }
}

/**
 * Sanitizer for removing sensitive information from logs
 */
class LogSanitizer {
    private readonly sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];

    public sanitize(data: any): any {
        if (!data) return data;

        if (typeof data === 'object') {
            return Object.keys(data).reduce((acc, key) => {
                const lowerKey = key.toLowerCase();
                if (this.sensitiveKeys.some(k => lowerKey.includes(k))) {
                    acc[key] = '[REDACTED]';
                } else if (typeof data[key] === 'object') {
                    acc[key] = this.sanitize(data[key]);
                } else {
                    acc[key] = data[key];
                }
                return acc;
            }, Array.isArray(data) ? [] : {});
        }

        return data;
    }
}

/**
 * Enhanced Logger implementation using Winston with support for structured logging,
 * metrics, and distributed tracing
 */
class Logger implements ILogger {
    private readonly logger: winston.Logger;
    private context: LogContext;
    private readonly elasticsearchBreaker: CircuitBreaker;
    private readonly metricsBuffer: MetricsBuffer;
    private readonly sanitizer: LogSanitizer;

    constructor() {
        this.logger = winston.createLogger(loggerConfig);
        this.elasticsearchBreaker = new CircuitBreaker();
        this.metricsBuffer = new MetricsBuffer();
        this.sanitizer = new LogSanitizer();
        this.context = this.createDefaultContext();
    }

    private createDefaultContext(): LogContext {
        return {
            correlationId: '',
            service: process.env.SERVICE_NAME || 'task-management',
            environment: process.env.NODE_ENV || 'development',
            additionalContext: {}
        };
    }

    private formatMessage(message: string | Record<string, unknown> | Error): any {
        if (message instanceof Error) {
            return {
                message: message.message,
                stack: message.stack,
                name: message.name,
                ...message
            };
        }
        return message;
    }

    private addTraceContext(): Record<string, string> {
        const span = trace.getSpan(context.active());
        if (!span) return {};

        const spanContext = span.spanContext();
        return {
            traceId: spanContext.traceId,
            spanId: spanContext.spanId
        };
    }

    public info(message: string | Record<string, unknown>, meta?: Partial<LogMetadata>, metrics?: Record<string, unknown>): void {
        const sanitizedMessage = this.sanitizer.sanitize(this.formatMessage(message));
        const traceContext = this.addTraceContext();

        if (metrics) {
            this.metricsBuffer.add(metrics);
        }

        this.logger.info(sanitizedMessage, {
            ...meta,
            ...traceContext,
            context: { ...this.context, ...meta?.context }
        });
    }

    public error(message: string | Error | Record<string, unknown>, meta?: Partial<LogMetadata>, metrics?: Record<string, unknown>): void {
        const sanitizedMessage = this.sanitizer.sanitize(this.formatMessage(message));
        const traceContext = this.addTraceContext();
        const span = trace.getSpan(context.active());

        if (span) {
            span.setStatus({ code: SpanStatusCode.ERROR });
        }

        if (metrics) {
            metrics.error = true;
            this.metricsBuffer.add(metrics);
        }

        this.logger.error(sanitizedMessage, {
            ...meta,
            ...traceContext,
            context: { ...this.context, ...meta?.context }
        });
    }

    public warn(message: string | Record<string, unknown>, meta?: Partial<LogMetadata>, metrics?: Record<string, unknown>): void {
        const sanitizedMessage = this.sanitizer.sanitize(this.formatMessage(message));
        const traceContext = this.addTraceContext();

        if (metrics) {
            this.metricsBuffer.add(metrics);
        }

        this.logger.warn(sanitizedMessage, {
            ...meta,
            ...traceContext,
            context: { ...this.context, ...meta?.context }
        });
    }

    public debug(message: string | Record<string, unknown>, meta?: Partial<LogMetadata>, metrics?: Record<string, unknown>): void {
        const sanitizedMessage = this.sanitizer.sanitize(this.formatMessage(message));
        const traceContext = this.addTraceContext();

        if (metrics) {
            this.metricsBuffer.add(metrics);
        }

        this.logger.debug(sanitizedMessage, {
            ...meta,
            ...traceContext,
            context: { ...this.context, ...meta?.context }
        });
    }

    public setCorrelationId(correlationId: string): void {
        this.context.correlationId = correlationId;
    }

    public setContext(context: Partial<LogContext>): void {
        this.context = {
            ...this.context,
            ...context
        };
    }

    public withContext(context: Partial<LogContext>): ILogger {
        const newLogger = new Logger();
        newLogger.setContext({
            ...this.context,
            ...context
        });
        return newLogger;
    }

    public clearContext(): void {
        this.context = this.createDefaultContext();
    }

    public async flushMetrics(): Promise<void> {
        return this.metricsBuffer.flush();
    }

    public setLogLevel(level: LogLevel): void {
        this.logger.level = level.toLowerCase();
    }
}

// Export singleton instance
export const logger = new Logger();