/**
 * @fileoverview Validation Helper providing comprehensive validation functions
 * with enhanced security features and internationalization support
 * @version 1.0.0
 */

import { isUUID, isEmail, isDate, isMimeType } from 'class-validator'; // v0.14.0
import sanitizeHtml from 'sanitize-html'; // v2.11.0

import {
  USER_VALIDATION,
  TASK_VALIDATION,
  PROJECT_VALIDATION,
  FILE_VALIDATION,
  MFA_VALIDATION
} from '../constants/validation.constants';

import { UUID, ValidationResult } from '../types/common.types';

/**
 * Interface for validation result with detailed error information
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates email format with comprehensive checks including international formats
 * @param email - Email address to validate
 * @returns ValidationResult with validation status and any error messages
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  // Basic validation
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  // Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  // Check format using class-validator
  if (!isEmail(normalizedEmail)) {
    errors.push('Invalid email format');
  }

  // Additional RFC 5322 pattern check
  if (!USER_VALIDATION.EMAIL_PATTERN.test(normalizedEmail)) {
    errors.push('Email must follow RFC 5322 format');
  }

  // Check maximum length to prevent overflow attacks
  if (normalizedEmail.length > 254) { // RFC 5321 maximum
    errors.push('Email exceeds maximum length');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates password against comprehensive security requirements
 * @param password - Password to validate
 * @returns ValidationResult with validation status and any error messages
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  // Basic validation
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Length check
  if (password.length < USER_VALIDATION.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${USER_VALIDATION.PASSWORD_MIN_LENGTH} characters long`);
  }

  // Pattern validation
  if (!USER_VALIDATION.PASSWORD_PATTERN.test(password)) {
    errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
  }

  // Check for common patterns
  const commonPatterns = [
    /^[a-zA-Z]+$/, // all letters
    /^[0-9]+$/, // all numbers
    /(.)\1{2,}/, // repeated characters
    /^(?=.*[A-Za-z0-9])\1+$/ // same character repeated
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    errors.push('Password contains common patterns that are not allowed');
  }

  // Calculate password entropy
  const entropy = calculatePasswordEntropy(password);
  if (entropy < 50) { // Minimum recommended entropy
    errors.push('Password is not strong enough');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates task content with sanitization and comprehensive checks
 * @param title - Task title
 * @param description - Task description
 * @param priority - Task priority
 * @param dueDate - Task due date
 * @returns ValidationResult with validation status and any error messages
 */
export function validateTaskContent(
  title: string,
  description: string,
  priority: string,
  dueDate: Date
): ValidationResult {
  const errors: string[] = [];

  // Title validation
  if (!title || typeof title !== 'string') {
    errors.push('Title is required');
  } else {
    const sanitizedTitle = sanitizeHtml(title.trim(), {
      allowedTags: [],
      allowedAttributes: {}
    });

    if (sanitizedTitle.length < TASK_VALIDATION.TITLE_MIN_LENGTH ||
        sanitizedTitle.length > TASK_VALIDATION.TITLE_MAX_LENGTH) {
      errors.push(`Title must be between ${TASK_VALIDATION.TITLE_MIN_LENGTH} and ${TASK_VALIDATION.TITLE_MAX_LENGTH} characters`);
    }

    if (!TASK_VALIDATION.TITLE_PATTERN.test(sanitizedTitle)) {
      errors.push('Title contains invalid characters');
    }
  }

  // Description validation
  if (description) {
    const sanitizedDescription = sanitizeHtml(description, {
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
      allowedAttributes: {}
    });

    if (sanitizedDescription.length > TASK_VALIDATION.DESCRIPTION_MAX_LENGTH) {
      errors.push(`Description exceeds maximum length of ${TASK_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`);
    }
  }

  // Priority validation
  if (!TASK_VALIDATION.ALLOWED_PRIORITIES.includes(priority as any)) {
    errors.push(`Priority must be one of: ${TASK_VALIDATION.ALLOWED_PRIORITIES.join(', ')}`);
  }

  // Due date validation
  if (!isDate(dueDate)) {
    errors.push('Invalid due date format');
  } else {
    const currentDate = new Date();
    if (dueDate < currentDate) {
      errors.push('Due date must be in the future');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates file uploads with enhanced security checks
 * @param file - File object to validate
 * @returns ValidationResult with validation status and any error messages
 */
export function validateFileUpload(file: Express.Multer.File): ValidationResult {
  const errors: string[] = [];

  // Basic validation
  if (!file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }

  // File size validation
  if (file.size > FILE_VALIDATION.MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum limit of ${FILE_VALIDATION.MAX_FILE_SIZE / 1_000_000}MB`);
  }

  // File type validation
  const fileExtension = file.originalname.split('.').pop()?.toUpperCase();
  if (!fileExtension || !FILE_VALIDATION.ALLOWED_FILE_TYPES.includes(fileExtension as any)) {
    errors.push(`File type not allowed. Allowed types: ${FILE_VALIDATION.ALLOWED_FILE_TYPES.join(', ')}`);
  }

  // MIME type validation
  if (!isMimeType(file.mimetype)) {
    errors.push('Invalid MIME type');
  }

  // Filename validation
  if (!FILE_VALIDATION.FILE_NAME_PATTERN.test(file.originalname)) {
    errors.push('Filename contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculates password entropy for strength measurement
 * @param password - Password to calculate entropy for
 * @returns number representing password entropy
 */
function calculatePasswordEntropy(password: string): number {
  const charset = {
    numbers: /[0-9]/.test(password),
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };

  let poolSize = 0;
  if (charset.numbers) poolSize += 10;
  if (charset.lowercase) poolSize += 26;
  if (charset.uppercase) poolSize += 26;
  if (charset.special) poolSize += 32;

  return Math.log2(Math.pow(poolSize, password.length));
}