/**
 * @fileoverview Express middleware for comprehensive request/response logging
 * with OpenTelemetry tracing, correlation ID tracking, and ELK stack integration.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { trace, context, SpanStatusCode } from '@opentelemetry/api'; // ^1.4.0
import now from 'performance-now'; // ^2.1.0
import { logger } from '../../utils/logger.util';

/**
 * Sanitizes request/response data by removing sensitive information
 * @param data - Object to sanitize
 * @returns Sanitized object
 */
const sanitizeData = (data: any): any => {
    if (!data) return data;

    const sensitiveFields = ['password', 'token', 'authorization', 'cookie'];
    const sanitized = { ...data };

    Object.keys(sanitized).forEach(key => {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
            sanitized[key] = sanitizeData(sanitized[key]);
        }
    });

    return sanitized;
};

/**
 * Extracts relevant request data for logging
 * @param req - Express request object
 * @returns Sanitized request data
 */
const extractRequestData = (req: Request): Record<string, unknown> => {
    return {
        method: req.method,
        url: req.url,
        params: sanitizeData(req.params),
        query: sanitizeData(req.query),
        body: sanitizeData(req.body),
        headers: sanitizeData(req.headers),
        ip: req.ip,
        userAgent: req.get('user-agent')
    };
};

/**
 * Extracts relevant response data for logging
 * @param res - Express response object
 * @returns Sanitized response data
 */
const extractResponseData = (res: Response): Record<string, unknown> => {
    return {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: sanitizeData(res.getHeaders())
    };
};

/**
 * Express middleware for comprehensive request/response logging with tracing
 * and performance monitoring capabilities.
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = now();
    const correlationId = req.get('X-Correlation-ID') || uuidv4();
    
    // Set correlation ID for the current request
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Get current trace context
    const span = trace.getSpan(context.active());
    const traceContext = span?.spanContext();

    // Set up logger context
    logger.setCorrelationId(correlationId);
    logger.setContext({
        service: process.env.SERVICE_NAME || 'task-management',
        environment: process.env.NODE_ENV || 'development',
        requestId: req.id,
        traceId: traceContext?.traceId,
        spanId: traceContext?.spanId,
        additionalContext: {
            path: req.path,
            method: req.method
        }
    });

    // Log request
    logger.info('Incoming request', {
        tags: ['request', req.method, req.baseUrl],
        context: {
            request: extractRequestData(req)
        }
    });

    // Capture response using finished event
    res.on('finish', () => {
        const duration = now() - startTime;
        const responseData = extractResponseData(res);

        // Update span status based on response
        if (span) {
            if (res.statusCode >= 400) {
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: `HTTP ${res.statusCode}`
                });
            } else {
                span.setStatus({ code: SpanStatusCode.OK });
            }
        }

        // Log response with performance metrics
        const logMethod = res.statusCode >= 400 ? 'error' : 'info';
        logger[logMethod]('Request completed', {
            tags: ['response', req.method, req.baseUrl, `${res.statusCode}`],
            context: {
                response: responseData,
                performance: {
                    duration: duration.toFixed(2),
                    statusCode: res.statusCode
                }
            },
            metrics: {
                requestDuration: duration,
                statusCode: res.statusCode,
                method: req.method,
                path: req.path
            }
        });
    });

    // Error handling
    const errorHandler = (error: Error) => {
        logger.error('Request error', {
            tags: ['error', req.method, req.baseUrl],
            context: {
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                },
                request: extractRequestData(req)
            }
        });

        if (span) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message
            });
        }
    };

    res.on('error', errorHandler);
    
    // Continue to next middleware
    next();
};