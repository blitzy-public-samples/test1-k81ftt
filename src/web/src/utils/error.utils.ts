// @ts-check
import axios, { AxiosError } from 'axios'; // ^1.6.0
import { api, validation, auth, common } from '../i18n/en/errors.json';

/**
 * Custom error class for standardized frontend error handling
 * with enhanced stack trace and type safety
 */
export class AppError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;
  readonly isUserFacing: boolean;
  readonly stack: string;

  constructor(
    message: string,
    code: string,
    details: Record<string, unknown> = {},
    isUserFacing: boolean = true
  ) {
    super(message);
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
    
    this.name = 'AppError';
    this.code = this.validateErrorCode(code);
    this.details = this.sanitizeDetails(details);
    this.isUserFacing = isUserFacing;
    
    // Enhance stack trace
    Error.captureStackTrace(this, AppError);
    
    // Add error metadata for tracking
    this.details = {
      ...this.details,
      timestamp: new Date().toISOString(),
      browserInfo: this.getBrowserInfo(),
    };
  }

  private validateErrorCode(code: string): string {
    const codeNumber = parseInt(code, 10);
    if (isNaN(codeNumber) || codeNumber < 1000 || codeNumber > 5999) {
      return 'UNKNOWN_ERROR';
    }
    return code;
  }

  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    // Remove sensitive information
    const sanitized = { ...details };
    const sensitiveKeys = ['password', 'token', 'secret'];
    sensitiveKeys.forEach(key => delete sanitized[key]);
    return sanitized;
  }

  private getBrowserInfo(): Record<string, string> {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
    };
  }
}

/**
 * Handles API errors with enhanced rate limiting and error detail extraction
 */
export const handleApiError = (error: Error): AppError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    const status = axiosError.response?.status;
    const errorData = axiosError.response?.data;

    // Handle rate limiting specifically
    if (status === 429) {
      const retryAfter = axiosError.response?.headers['retry-after'];
      return new AppError(
        api.rateLimited,
        '4029',
        { retryAfter },
        true
      );
    }

    // Map status codes to appropriate error messages
    const errorMap: Record<number, { message: string; code: string }> = {
      400: { message: api.default, code: '4000' },
      401: { message: api.unauthorized, code: '4001' },
      403: { message: api.forbidden, code: '4003' },
      404: { message: api.notFound, code: '4004' },
      408: { message: api.timeout, code: '4008' },
      409: { message: api.conflict, code: '4009' },
      500: { message: api.server, code: '5000' },
      503: { message: api.maintenance, code: '5003' }
    };

    const errorInfo = status ? errorMap[status] : { message: api.default, code: '5000' };
    
    return new AppError(
      errorInfo.message,
      errorInfo.code,
      { originalError: errorData },
      true
    );
  }

  // Handle network errors
  if (isNetworkError(error)) {
    return new AppError(
      api.network,
      '4030',
      { originalError: error.message },
      true
    );
  }

  // Default error handling
  return new AppError(
    api.default,
    '5000',
    { originalError: error.message },
    true
  );
};

/**
 * Handles form validation errors with support for nested fields
 */
export const handleValidationError = (
  validationErrors: Record<string, unknown>
): Record<string, string> => {
  const formattedErrors: Record<string, string> = {};

  const formatNestedError = (
    obj: Record<string, unknown>,
    prefix: string = ''
  ): void => {
    Object.entries(obj).forEach(([key, value]) => {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        formatNestedError(value as Record<string, unknown>, fieldPath);
      } else {
        const errorMessage = getErrorMessage(
          'validation',
          fieldPath,
          { field: key }
        );
        formattedErrors[fieldPath] = errorMessage;
      }
    });
  };

  formatNestedError(validationErrors);
  return formattedErrors;
};

/**
 * Gets translated error message with fallback chains and interpolation
 */
export const getErrorMessage = (
  errorCode: string,
  errorType: string,
  interpolationValues: Record<string, string> = {}
): string => {
  const errorCategories = { api, validation, auth, common };
  
  // Navigate through nested error objects
  const getNestedValue = (obj: any, path: string): string => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj) as string;
  };

  // Find appropriate error category
  const category = errorCode.charAt(0) === '4' ? 'api' : 
                  errorCode.charAt(0) === '5' ? 'server' : 'common';
  
  let message = getNestedValue(errorCategories[category], errorType) || 
                common.unknown;

  // Apply message interpolation
  Object.entries(interpolationValues).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  return message;
};

/**
 * Checks if error is a network connectivity issue with enhanced detection
 */
export const isNetworkError = (error: Error): boolean => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Check for specific network error conditions
    if (!axiosError.response && axiosError.code === 'ECONNABORTED') {
      return true;
    }

    if (axiosError.message.includes('Network Error')) {
      return true;
    }
  }

  // Check browser online status
  if (!navigator.onLine) {
    return true;
  }

  // Check for timeout conditions
  if (error.message.includes('timeout') || 
      error.message.includes('TIMEOUT_ERROR')) {
    return true;
  }

  return false;
};