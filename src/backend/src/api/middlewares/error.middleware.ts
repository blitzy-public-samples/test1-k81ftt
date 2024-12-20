/**
 * @fileoverview Enterprise-grade error handling middleware for Express applications
 * Provides centralized error handling, secure error responses, and comprehensive logging
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { ErrorResponse } from '../../types/response.types';
import { AppError, formatErrorResponse } from '../../utils/error.util';
import { logger } from '../../utils/logger.util';
import { ERROR_CODES } from '../../constants/error.constants';

/**
 * Interface for enhanced error tracking metrics
 */
interface ErrorMetrics {
  path: string;
  method: string;
  statusCode: number;
  errorCode: string;
  responseTime: number;
  timestamp: string;
}

/**
 * Centralized error handling middleware for Express applications
 * Processes errors and sends standardized responses with enhanced security
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate correlation ID for error tracking
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  // Calculate request duration
  const startTime = req.startTime || Date.now();
  const duration = Date.now() - startTime;

  // Prepare error metrics
  const metrics: ErrorMetrics = {
    path: req.path,
    method: req.method,
    statusCode: 500,
    errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
    responseTime: duration,
    timestamp: new Date().toISOString()
  };

  // Set up base error response
  let errorResponse: ErrorResponse = {
    success: false,
    message: 'An unexpected error occurred',
    error: {
      code: 5000,
      category: 'INTEGRATION',
      type: 'InternalServerError',
      details: [],
      metadata: {
        correlationId,
        path: req.path,
        timestamp: new Date().toISOString()
      }
    }
  };

  // Handle AppError instances with enhanced details
  if (error instanceof AppError) {
    metrics.errorCode = error.code;
    metrics.statusCode = parseInt(error.code[0]) * 100;

    errorResponse = {
      success: false,
      message: error.message,
      error: {
        code: parseInt(error.code),
        category: error.code.startsWith('5') ? 'INTEGRATION' : 'OPERATIONAL',
        type: error.name,
        details: error.details ? [error.details] : [],
        metadata: {
          correlationId,
          path: req.path,
          timestamp: error.timestamp
        }
      }
    };
  }

  // Log error with context and metrics
  logger.error(error, {
    context: {
      correlationId,
      requestId: req.id,
      userId: req.user?.id,
      service: 'task-management',
      environment: process.env.NODE_ENV || 'development'
    },
    tags: ['error', error instanceof AppError ? error.code : 'uncaught'],
    metrics
  });

  // Set security headers
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Send formatted error response
  res.status(metrics.statusCode).json(
    formatErrorResponse(error, {
      includeDetails: process.env.NODE_ENV !== 'production',
      includeMeta: true
    })
  );
};

/**
 * Middleware for handling 404 Not Found errors
 * Provides enhanced logging and tracking for missing resources
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  // Create not found error with tracking information
  const notFoundError = new AppError(
    `Resource not found: ${req.path}`,
    '4004',
    {
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    },
    true,
    {
      correlationId,
      requestId: req.id,
      source: 'notFoundHandler'
    }
  );

  // Log 404 error with context
  logger.warn('Resource not found', {
    context: {
      correlationId,
      path: req.path,
      method: req.method
    },
    tags: ['404', 'not-found']
  });

  next(notFoundError);
};