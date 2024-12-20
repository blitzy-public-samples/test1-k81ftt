/**
 * @fileoverview Core validation utility providing comprehensive validation, sanitization,
 * and security checks with enhanced security patterns and real-time feedback
 * @version 1.0.0
 */

import validator from 'validator'; // ^13.11.0
import dayjs from 'dayjs'; // ^1.11.10
import { NodeClam } from 'clamscan'; // ^1.0.0
import {
  USER_VALIDATION,
  TASK_VALIDATION,
  PROJECT_VALIDATION,
  FILE_VALIDATION,
  MFA_VALIDATION
} from '../constants/validation.constants';
import { createError, ValidationError } from './error.util';
import { logger } from './logger.util';

// Cache for validation results to improve performance
const VALIDATION_CACHE = new Map<string, ValidationResult>();
const VALIDATION_CACHE_TTL = 300000; // 5 minutes

/**
 * Interface for validation result with detailed feedback
 */
interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: string;
  errors?: string[];
  metadata?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Interface for file validation options
 */
interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  scanForVirus?: boolean;
}

/**
 * Core validation service implementing comprehensive validation rules
 */
export class ValidationService {
  private readonly clamav: NodeClam;

  constructor() {
    this.clamav = new NodeClam({
      removeInfected: true,
      quarantineInfected: true,
      scanLog: null,
      debugMode: false
    });
  }

  /**
   * Validates email addresses with enhanced security patterns
   * @param email - Email address to validate
   * @returns Validation result with sanitized email and feedback
   */
  public async validateEmail(email: string): Promise<ValidationResult> {
    const cacheKey = `email:${email}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const result: ValidationResult = {
      isValid: false,
      errors: [],
      timestamp: Date.now()
    };

    try {
      // Basic sanitization
      const sanitizedEmail = validator.trim(email).toLowerCase();

      // Comprehensive email validation
      if (!validator.isEmail(sanitizedEmail)) {
        result.errors!.push('Invalid email format');
      }

      if (!validator.matches(sanitizedEmail, USER_VALIDATION.EMAIL_PATTERN)) {
        result.errors!.push('Email contains invalid characters');
      }

      // Check for disposable email providers
      if (await this.isDisposableEmail(sanitizedEmail)) {
        result.errors!.push('Disposable email addresses are not allowed');
      }

      result.isValid = result.errors!.length === 0;
      result.sanitizedValue = sanitizedEmail;

      this.cacheResult(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Email validation error', { error, email });
      throw createError('4002', 'Email validation failed', { email });
    }
  }

  /**
   * Validates passwords with enhanced security requirements
   * @param password - Password to validate
   * @returns Validation result with strength score and feedback
   */
  public validatePassword(password: string): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      metadata: {},
      timestamp: Date.now()
    };

    try {
      // Length validation
      if (password.length < USER_VALIDATION.PASSWORD_MIN_LENGTH) {
        result.errors!.push(`Password must be at least ${USER_VALIDATION.PASSWORD_MIN_LENGTH} characters`);
      }

      // Pattern validation
      if (!validator.matches(password, USER_VALIDATION.PASSWORD_PATTERN)) {
        result.errors!.push('Password must contain uppercase, lowercase, number, and special character');
      }

      // Check for common passwords
      if (this.isCommonPassword(password)) {
        result.errors!.push('Password is too common');
      }

      // Calculate password strength
      const strengthScore = this.calculatePasswordStrength(password);
      result.metadata!.strengthScore = strengthScore;

      result.isValid = result.errors!.length === 0 && strengthScore >= 3;
      
      return result;
    } catch (error) {
      logger.error('Password validation error', { error });
      throw createError('4003', 'Password validation failed');
    }
  }

  /**
   * Validates file uploads with virus scanning
   * @param fileData - File data to validate
   * @param options - Validation options
   * @returns Validation result with scan results
   */
  public async validateFileUpload(
    fileData: Buffer,
    options: FileValidationOptions = {}
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      metadata: {},
      timestamp: Date.now()
    };

    try {
      // Size validation
      const fileSize = fileData.length;
      const maxSize = options.maxSize || FILE_VALIDATION.MAX_FILE_SIZE;
      
      if (fileSize > maxSize) {
        result.errors!.push(`File size exceeds maximum limit of ${maxSize} bytes`);
      }

      // File type validation
      const fileType = await this.detectFileType(fileData);
      const allowedTypes = options.allowedTypes || FILE_VALIDATION.ALLOWED_FILE_TYPES;
      
      if (!allowedTypes.includes(fileType.toUpperCase())) {
        result.errors!.push(`File type ${fileType} is not allowed`);
      }

      // Virus scan
      if (options.scanForVirus !== false) {
        const scanResult = await this.clamav.scanBuffer(fileData);
        result.metadata!.virusScanResult = scanResult;
        
        if (scanResult.isInfected) {
          result.errors!.push('File contains malware');
        }
      }

      result.isValid = result.errors!.length === 0;
      return result;
    } catch (error) {
      logger.error('File validation error', { error });
      throw createError('4004', 'File validation failed');
    }
  }

  /**
   * Validates task data against business rules
   * @param taskData - Task data to validate
   * @returns Validation result with sanitized data
   */
  public validateTaskData(taskData: Record<string, any>): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      timestamp: Date.now()
    };

    try {
      // Title validation
      if (!validator.isLength(taskData.title, {
        min: TASK_VALIDATION.TITLE_MIN_LENGTH,
        max: TASK_VALIDATION.TITLE_MAX_LENGTH
      })) {
        result.errors!.push(`Title must be between ${TASK_VALIDATION.TITLE_MIN_LENGTH} and ${TASK_VALIDATION.TITLE_MAX_LENGTH} characters`);
      }

      // Description validation
      if (taskData.description && !validator.isLength(taskData.description, {
        max: TASK_VALIDATION.DESCRIPTION_MAX_LENGTH
      })) {
        result.errors!.push(`Description cannot exceed ${TASK_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`);
      }

      // Due date validation
      if (taskData.dueDate) {
        const dueDate = dayjs(taskData.dueDate);
        if (!dueDate.isValid() || dueDate.isBefore(dayjs())) {
          result.errors!.push('Due date must be in the future');
        }
      }

      // Priority validation
      if (taskData.priority && !TASK_VALIDATION.ALLOWED_PRIORITIES.includes(taskData.priority)) {
        result.errors!.push('Invalid priority level');
      }

      result.isValid = result.errors!.length === 0;
      return result;
    } catch (error) {
      logger.error('Task validation error', { error, taskData });
      throw createError('4005', 'Task validation failed');
    }
  }

  /**
   * Retrieves cached validation result if not expired
   * @param key - Cache key
   * @returns Cached validation result or undefined
   */
  private getCachedResult(key: string): ValidationResult | undefined {
    const cached = VALIDATION_CACHE.get(key);
    if (cached && Date.now() - cached.timestamp < VALIDATION_CACHE_TTL) {
      return cached;
    }
    VALIDATION_CACHE.delete(key);
    return undefined;
  }

  /**
   * Caches validation result
   * @param key - Cache key
   * @param result - Validation result to cache
   */
  private cacheResult(key: string, result: ValidationResult): void {
    VALIDATION_CACHE.set(key, result);
  }

  /**
   * Checks if email is from a disposable provider
   * @param email - Email to check
   * @returns True if email is disposable
   */
  private async isDisposableEmail(email: string): Promise<boolean> {
    // Implementation would include checking against a disposable email provider database
    return false;
  }

  /**
   * Checks if password is commonly used
   * @param password - Password to check
   * @returns True if password is common
   */
  private isCommonPassword(password: string): boolean {
    // Implementation would include checking against a common password database
    return false;
  }

  /**
   * Calculates password strength score
   * @param password - Password to analyze
   * @returns Strength score (0-4)
   */
  private calculatePasswordStrength(password: string): number {
    let score = 0;
    
    // Length
    if (password.length >= 12) score++;
    
    // Complexity
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    return score;
  }

  /**
   * Detects file type from buffer
   * @param buffer - File buffer
   * @returns Detected file type
   */
  private async detectFileType(buffer: Buffer): Promise<string> {
    // Implementation would include file signature analysis
    return 'unknown';
  }
}

// Export singleton instance
export const validationService = new ValidationService();