/**
 * @fileoverview Express middleware for request validation with comprehensive security controls
 * Implements robust input validation, sanitization, rate limiting, and security measures
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible'; // ^2.4.1
import { ValidationService } from '../utils/validation.util';
import { createError } from '../utils/error.util';
import logger from '../utils/logger.util';
import {
  USER_VALIDATION,
  TASK_VALIDATION,
  PROJECT_VALIDATION,
  FILE_VALIDATION
} from '../constants/validation.constants';

// Global rate limiter configuration
const RATE_LIMITER = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per minute
  blockDuration: 300 // Block for 5 minutes if exceeded
});

// Validation attempt tracking
const VALIDATION_ATTEMPTS = new Map<string, number>();
const MAX_VALIDATION_ATTEMPTS = 5;
const ATTEMPT_RESET_INTERVAL = 3600000; // 1 hour

/**
 * Decorator for rate limiting validation requests
 */
function rateLimited() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const req = args[0] as Request;
      const res = args[1] as Response;
      
      try {
        await RATE_LIMITER.consume(req.ip);
      } catch (error) {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          endpoint: req.path,
          correlationId: req.headers['x-correlation-id']
        });
        throw createError('5002', 'Too many validation attempts. Please try again later.');
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Validation middleware class implementing comprehensive request validation
 */
export class ValidationMiddleware {
  private readonly validationService: ValidationService;

  constructor() {
    this.validationService = new ValidationService();
  }

  /**
   * Validates authentication requests with enhanced security
   */
  @rateLimited()
  public async validateAuthRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password } = req.body;
      const clientIp = req.ip;

      // Check validation attempts
      this.checkValidationAttempts(clientIp);

      // Validate email
      const emailValidation = await this.validationService.validateEmail(email);
      if (!emailValidation.isValid) {
        this.incrementValidationAttempts(clientIp);
        throw createError('4002', 'Invalid email format', emailValidation.errors);
      }

      // Validate password
      const passwordValidation = this.validationService.validatePassword(password);
      if (!passwordValidation.isValid) {
        this.incrementValidationAttempts(clientIp);
        throw createError('4003', 'Invalid password format', passwordValidation.errors);
      }

      // Reset validation attempts on success
      VALIDATION_ATTEMPTS.delete(clientIp);
      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validates task creation/update requests
   */
  @rateLimited()
  public async validateTaskRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const taskData = req.body;
      const validation = this.validationService.validateTaskData(taskData);

      if (!validation.isValid) {
        throw createError('4005', 'Invalid task data', validation.errors);
      }

      // Validate attachments if present
      if (req.files?.length) {
        await this.validateAttachments(req.files);
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validates file uploads with virus scanning
   */
  private async validateAttachments(files: Express.Multer.File[]): Promise<void> {
    for (const file of files) {
      const validation = await this.validationService.validateFileUpload(
        file.buffer,
        {
          maxSize: FILE_VALIDATION.MAX_FILE_SIZE,
          allowedTypes: FILE_VALIDATION.ALLOWED_FILE_TYPES,
          scanForVirus: true
        }
      );

      if (!validation.isValid) {
        throw createError('4004', 'Invalid file attachment', validation.errors);
      }
    }
  }

  /**
   * Checks and enforces validation attempt limits
   */
  private checkValidationAttempts(clientIp: string): void {
    const attempts = VALIDATION_ATTEMPTS.get(clientIp) || 0;
    
    if (attempts >= MAX_VALIDATION_ATTEMPTS) {
      logger.warn('Maximum validation attempts exceeded', {
        ip: clientIp,
        attempts
      });
      throw createError('5002', 'Maximum validation attempts exceeded. Please try again later.');
    }
  }

  /**
   * Increments validation attempts counter
   */
  private incrementValidationAttempts(clientIp: string): void {
    const attempts = (VALIDATION_ATTEMPTS.get(clientIp) || 0) + 1;
    VALIDATION_ATTEMPTS.set(clientIp, attempts);

    // Schedule attempt counter reset
    if (attempts === 1) {
      setTimeout(() => {
        VALIDATION_ATTEMPTS.delete(clientIp);
      }, ATTEMPT_RESET_INTERVAL);
    }
  }
}

// Export singleton instance
export const validationMiddleware = new ValidationMiddleware();

// Export middleware functions for direct use
export const validateAuth = (req: Request, res: Response, next: NextFunction) =>
  validationMiddleware.validateAuthRequest(req, res, next);

export const validateTask = (req: Request, res: Response, next: NextFunction) =>
  validationMiddleware.validateTaskRequest(req, res, next);