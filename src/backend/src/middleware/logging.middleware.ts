/**
 * @fileoverview Express middleware for comprehensive request/response logging
 * with correlation ID tracking, performance monitoring, and security-aware data handling.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import now from 'performance-now'; // ^2.1.0
import { logger } from '../utils/logger.util';

/**
 * Sensitive data patterns that should be redacted from logs
 */
const SENSITIVE_PATTERNS = {
    headers: ['authorization', 'cookie', 'x-api-key'],
    body: ['password', 'token', 'secret', 'key'],
    query: ['token', 'key', 'secret']
};

/**
 * Maximum length for logged request/response bodies
 */
const MAX_BODY_LENGTH = 10000;

/**
 * Sanitizes request data by removing sensitive information and truncating large payloads
 * @param requestData - Raw request data to sanitize
 * @returns Sanitized data safe for logging
 */
const sanitizeRequestData = (requestData: Record<string, any>): Record<string, any> => {
    const sanitized = { ...requestData };

    // Sanitize headers
    if (sanitized.headers) {
        SENSITIVE_PATTERNS.headers.forEach(header => {
            if (sanitized.headers[header]) {
                sanitized.headers[header] = '[REDACTED]';
            }
        });
    }

    // Sanitize body
    if (sanitized.body) {
        SENSITIVE_PATTERNS.body.forEach(field => {
            if (sanitized.body[field]) {
                sanitized.body[field] = '[REDACTED]';
            }
        });

        // Truncate large bodies
        if (JSON.stringify(sanitized.body).length > MAX_BODY_LENGTH) {
            sanitized.body = {
                _truncated: true,
                _originalSize: JSON.stringify(sanitized.body).length,
                _message: 'Request body too large to log'
            };
        }
    }

    // Sanitize query parameters
    if (sanitized.query) {
        SENSITIVE_PATTERNS.query.forEach(param => {
            if (sanitized.query[param]) {
                sanitized.query[param] = '[REDACTED]';
            }
        });
    }

    return sanitized;
};

/**
 * Express middleware for comprehensive request/response logging with security,
 * performance monitoring, and correlation tracking
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = now();
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    const initialMemoryUsage = process.memoryUsage();

    // Set correlation ID in logger and response headers
    logger.setCorrelationId(correlationId);
    res.setHeader('x-correlation-id', correlationId);

    // Set initial context
    logger.setContext({
        service: process.env.SERVICE_NAME || 'task-management',
        environment: process.env.NODE_ENV || 'development',
        additionalContext: {
            requestId: uuidv4(),
            userId: (req as any).user?.id
        }
    });

    // Log incoming request
    logger.info('Incoming request', {
        tags: ['request', 'http'],
        context: {
            http: sanitizeRequestData({
                method: req.method,
                path: req.path,
                headers: req.headers,
                query: req.query,
                body: req.body
            })
        }
    });

    // Capture original end function
    const originalEnd = res.end;
    let responseBody: any;

    // Override end function to capture response
    res.end = function(chunk: any, ...rest: any[]): any {
        if (chunk) {
            responseBody = chunk.toString();
        }

        // Calculate performance metrics
        const duration = now() - startTime;
        const currentMemoryUsage = process.memoryUsage();
        const memoryDelta = {
            heapUsed: currentMemoryUsage.heapUsed - initialMemoryUsage.heapUsed,
            external: currentMemoryUsage.external - initialMemoryUsage.external,
            rss: currentMemoryUsage.rss - initialMemoryUsage.rss
        };

        // Log response
        logger.info('Outgoing response', {
            tags: ['response', 'http'],
            context: {
                http: {
                    statusCode: res.statusCode,
                    headers: res.getHeaders(),
                    responseSize: responseBody ? responseBody.length : 0
                },
                performance: {
                    duration: Math.round(duration),
                    memoryDelta
                }
            },
            metrics: {
                requestDuration: duration,
                responseSize: responseBody ? responseBody.length : 0,
                statusCode: res.statusCode
            }
        });

        // Clear logger context
        logger.clearContext();

        // Call original end
        return originalEnd.call(this, chunk, ...rest);
    };

    // Error handling
    const errorHandler = (error: Error): void => {
        logger.error('Request error', {
            tags: ['error', 'http'],
            context: {
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                },
                http: {
                    method: req.method,
                    path: req.path
                }
            }
        });
    };

    // Add error handler
    res.on('error', errorHandler);

    // Continue to next middleware
    next();
};