/**
 * @fileoverview Validation constants and rules for the Task Management System
 * Implements comprehensive validation rules for form validation and data integrity
 * @version 1.0.0
 */

/**
 * User validation constants including name, password, and email requirements
 */
export const USER_VALIDATION = {
  /** Minimum length for user names (first name, last name) */
  NAME_MIN_LENGTH: 2,
  /** Maximum length for user names (first name, last name) */
  NAME_MAX_LENGTH: 50,
  /** Minimum password length requirement */
  PASSWORD_MIN_LENGTH: 8,
  /** 
   * Password pattern requiring:
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   * - At least one special character
   * - Minimum 8 characters
   */
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  /** RFC 5322 compliant email validation pattern */
  EMAIL_PATTERN: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
} as const;

/**
 * Task validation constants including title, description, and attachment requirements
 */
export const TASK_VALIDATION = {
  /** Minimum length for task titles */
  TITLE_MIN_LENGTH: 3,
  /** Maximum length for task titles */
  TITLE_MAX_LENGTH: 100,
  /** Maximum length for task descriptions */
  DESCRIPTION_MAX_LENGTH: 2000,
  /** Pattern for valid task titles (alphanumeric with spaces, dashes, and underscores) */
  TITLE_PATTERN: /^[a-zA-Z0-9\s-_]+$/,
  /** Valid priority values for tasks */
  PRIORITY_VALUES: ['Low', 'Medium', 'High', 'Urgent'] as const,
  /** Allowed file types for task attachments */
  ALLOWED_FILE_TYPES: ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG'] as const,
  /** Maximum file size for attachments in bytes (25MB) */
  MAX_FILE_SIZE: 25_000_000 // 25MB in bytes
} as const;

/**
 * Project validation constants including name and description requirements
 */
export const PROJECT_VALIDATION = {
  /** Minimum length for project names */
  NAME_MIN_LENGTH: 3,
  /** Maximum length for project names */
  NAME_MAX_LENGTH: 50,
  /** Maximum length for project descriptions */
  DESCRIPTION_MAX_LENGTH: 1000
} as const;

/**
 * Standardized validation error messages
 * These messages support internationalization and maintain consistency across the application
 */
export const VALIDATION_MESSAGES = {
  /** Required field error message */
  REQUIRED_FIELD: 'This field is required',
  /** Invalid email format error message */
  INVALID_EMAIL: 'Please enter a valid email address',
  /** Invalid password format error message */
  INVALID_PASSWORD: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character',
  /** Future date requirement error message */
  FUTURE_DATE_REQUIRED: 'Please select a future date',
  /** Invalid file type error message */
  INVALID_FILE_TYPE: 'Invalid file type. Allowed types: PDF, DOC, DOCX, JPG, PNG',
  /** File size limit error message */
  FILE_TOO_LARGE: 'File size exceeds 25MB limit'
} as const;

/**
 * Type definitions for validation constants to ensure type safety
 */
export type TaskPriority = typeof TASK_VALIDATION.PRIORITY_VALUES[number];
export type AllowedFileType = typeof TASK_VALIDATION.ALLOWED_FILE_TYPES[number];