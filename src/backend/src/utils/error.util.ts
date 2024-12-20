/**
 * @fileoverview Advanced error handling utility providing standardized error management,
 * secure error responses, and comprehensive error tracking capabilities.
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { ERROR_CODES, ERROR_MESSAGES } from '../constants/error.constants';
import { Logger } from './logger.util';

/**
 * Interface for error metadata containing additional context
 */
interface ErrorMetadata {
  source?: string;
  timestamp?: string;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Enhanced custom error class for application-specific error handling
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly details: any;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly correlationId: string;
  public readonly metadata: ErrorMetadata;

  constructor(
    message: string,
    code: string,
    details?: any,
    isOperational = true,
    metadata: ErrorMetadata = {}
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.code = code;
    this.details = this.sanitizeDetails(details);
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.correlationId = uuidv4();
    this.metadata = this.sanitizeMetadata(metadata);

    Error.captureStackTrace(this, this.constructor);
    Object.freeze(this);
  }

  /**
   * Sanitizes error details by removing sensitive information
   */
  private sanitizeDetails(details: any): any {
    if (!details) return undefined;

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
    
    if (typeof details === 'object') {
      return Object.keys(details).reduce((acc: any, key: string) => {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          acc[key] = '[REDACTED]';
        } else if (typeof details[key] === 'object') {
          acc[key] = this.sanitizeDetails(details[key]);
        } else {
          acc[key] = details[key];
        }
        return acc;
      }, Array.isArray(details) ? [] : {});
    }

    return details;
  }

  /**
   * Sanitizes metadata by removing sensitive information
   */
  private sanitizeMetadata(metadata: ErrorMetadata): ErrorMetadata {
    const safeMetadata = { ...metadata };
    delete safeMetadata.password;
    delete safeMetadata.token;
    delete safeMetadata.secret;
    return safeMetadata;
  }
}

/**
 * Creates a standardized error instance with comprehensive validation
 */
export function createError(
  code: string,
  message?: string,
  details?: any,
  metadata: ErrorMetadata = {}
): AppError {
  // Validate error code format
  if (!code.match(/^[1-5]\d{3}$/)) {
    throw new Error('Invalid error code format');
  }

  // Determine error category and operational status
  const isOperational = parseInt(code[0]) < 5;
  const defaultMessage = ERROR_MESSAGES[code] || ERROR_MESSAGES.DEFAULT_ERROR;

  // Create error instance with sanitized data
  const error = new AppError(
    message || defaultMessage,
    code,
    details,
    isOperational,
    {
      ...metadata,
      timestamp: new Date().toISOString(),
      source: new Error().stack?.split('\n')[2]?.trim()
    }
  );

  // Log error with appropriate severity
  if (!isOperational) {
    Logger.error('Programming error occurred', {
      error,
      correlationId: error.correlationId,
      metadata: error.metadata
    });
  } else {
    Logger.warn('Operational error occurred', {
      error,
      correlationId: error.correlationId,
      metadata: error.metadata
    });
  }

  return error;
}

/**
 * Advanced error classification for operational vs programming errors
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }

  // Analyze error properties and context
  const errorCode = (error as any).code;
  if (errorCode && typeof errorCode === 'string') {
    const category = parseInt(errorCode[0]);
    return category >= 1 && category <= 4;
  }

  // Default to non-operational for unknown errors
  return false;
}

/**
 * Formats error for secure API response
 */
export function formatErrorResponse(
  error: Error,
  options: { includeDetails?: boolean; includeMeta?: boolean } = {}
): Record<string, unknown> {
  const { includeDetails = false, includeMeta = false } = options;

  if (error instanceof AppError) {
    const response: Record<string, unknown> = {
      status: 'error',
      code: error.code,
      message: error.message,
      correlationId: error.correlationId
    };

    if (includeDetails && error.details) {
      response.details = error.details;
    }

    if (includeMeta) {
      response.metadata = {
        timestamp: error.timestamp,
        ...error.metadata
      };
    }

    return response;
  }

  // Handle unknown errors
  return {
    status: 'error',
    code: '5000',
    message: 'An unexpected error occurred',
    correlationId: uuidv4()
  };
}