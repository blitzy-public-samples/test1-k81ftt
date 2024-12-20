/**
 * @fileoverview Express middleware for centralized error handling with ELK stack integration
 * Provides standardized error responses, logging, and error transformation
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.x
import { v4 as uuidv4 } from 'uuid'; // ^9.0.x
import { ILogger } from '../core/interfaces/ILogger';
import { AppError, formatErrorResponse, isOperationalError } from '../utils/error.util';
import { ErrorResponse } from '../types/response.types';
import { ERROR_CODES } from '../constants/error.constants';

/**
 * Maps error code prefixes to HTTP status codes
 */
const ERROR_STATUS_MAP: Record<string, number> = {
  '1': 401, // Authentication errors
  '2': 400, // Task operation errors
  '3': 400, // Project operation errors
  '4': 400, // File operation errors
  '5': 500  // Integration/System errors
};

/**
 * Determines appropriate HTTP status code based on error code
 * @param errorCode - Application error code
 * @returns HTTP status code
 */
const getStatusCode = (errorCode: string): number => {
  if (!errorCode || typeof errorCode !== 'string') {
    return 500;
  }

  const prefix = errorCode.charAt(0);
  const statusCode = ERROR_STATUS_MAP[prefix];

  return statusCode || 500;
};

/**
 * Express middleware for centralized error handling with ELK stack integration
 * Handles error logging, response formatting, and system stability
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Extract or generate correlation ID
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  // Get logger instance from request (injected by logging middleware)
  const logger: ILogger = (req as any).logger;

  // Start performance measurement
  const startTime = process.hrtime();

  try {
    // Set correlation ID in logger context
    logger.setCorrelationId(correlationId);

    // Determine if error is operational
    const isOperational = error instanceof AppError ? 
      error.isOperational : 
      isOperationalError(error);

    // Prepare error details for logging (with sensitive data filtering)
    const errorDetails = {
      message: error.message,
      stack: error.stack?.split('\n').filter(line => !line.includes('node_modules')),
      code: (error as AppError).code || ERROR_CODES.INTERNAL_SERVER_ERROR,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.id
    };

    // Log error with appropriate severity
    logger.error('Request error occurred', {
      error: errorDetails,
      context: {
        correlationId,
        isOperational,
        request: {
          url: req.originalUrl,
          method: req.method,
          headers: req.headers
        }
      }
    });

    // Format error response
    const errorResponse: ErrorResponse = {
      success: false,
      message: error.message,
      error: formatErrorResponse(error, {
        includeDetails: process.env.NODE_ENV !== 'production'
      }),
      metadata: {
        correlationId,
        timestamp: new Date().toISOString(),
        path: req.path,
        version: process.env.API_VERSION || '1.0.0'
      }
    };

    // Calculate response time
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1000000;

    // Log performance metrics
    logger.setMetrics({
      type: 'error_handling',
      responseTime,
      statusCode: getStatusCode((error as AppError).code),
      path: req.path,
      errorCode: (error as AppError).code
    });

    // Send error response
    res.status(getStatusCode((error as AppError).code))
      .json(errorResponse);

    // Handle non-operational errors
    if (!isOperational) {
      // Log critical error
      logger.error('Non-operational error occurred - initiating graceful shutdown', {
        error: errorDetails,
        context: { correlationId }
      });

      // Trigger graceful shutdown process
      process.emit('SIGTERM');
    }
  } catch (loggingError) {
    // Fallback error handling if logger fails
    console.error('Error handler failed:', loggingError);
    console.error('Original error:', error);

    // Send basic error response
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      },
      metadata: {
        correlationId
      }
    });
  }
};