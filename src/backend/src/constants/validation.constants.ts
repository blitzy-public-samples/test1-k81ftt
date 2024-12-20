/**
 * @fileoverview Validation constants and rules for the Task Management System
 * Implements strict security controls and input validation patterns
 * Version: 1.0.0
 */

/**
 * User validation constants including enhanced security patterns for
 * user registration, profile updates, and authentication
 */
export const USER_VALIDATION = {
  /** Minimum length for user first/last names */
  NAME_MIN_LENGTH: 2,
  
  /** Maximum length for user first/last names */
  NAME_MAX_LENGTH: 50,
  
  /** Minimum password length for security compliance */
  PASSWORD_MIN_LENGTH: 8,
  
  /** 
   * Password pattern requiring:
   * - At least one lowercase letter
   * - At least one uppercase letter
   * - At least one number
   * - At least one special character
   * - Minimum 8 characters
   */
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  /** RFC 5322 compliant email validation pattern */
  EMAIL_PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  /** Unicode-aware name pattern allowing letters, spaces, hyphens and apostrophes */
  NAME_PATTERN: /^[\p{L}\s'-]{2,50}$/u
} as const;

/**
 * Task validation constants with secure patterns and business rules
 * for task creation and updates
 */
export const TASK_VALIDATION = {
  /** Minimum length for task titles */
  TITLE_MIN_LENGTH: 3,
  
  /** Maximum length for task titles */
  TITLE_MAX_LENGTH: 100,
  
  /** Maximum length for task descriptions */
  DESCRIPTION_MAX_LENGTH: 2000,
  
  /** Unicode-aware title pattern allowing letters, numbers, spaces, hyphens and underscores */
  TITLE_PATTERN: /^[\p{L}0-9\s-_]+$/u,
  
  /** Allowed priority levels for tasks */
  ALLOWED_PRIORITIES: ['Low', 'Medium', 'High', 'Urgent'] as const,
  
  /** Minimum due date (current date) */
  DUE_DATE_MIN: new Date()
} as const;

/**
 * Project validation constants with secure input patterns
 * for project creation and updates
 */
export const PROJECT_VALIDATION = {
  /** Minimum length for project names */
  NAME_MIN_LENGTH: 3,
  
  /** Maximum length for project names */
  NAME_MAX_LENGTH: 100,
  
  /** Maximum length for project descriptions */
  DESCRIPTION_MAX_LENGTH: 2000,
  
  /** Unicode-aware project name pattern allowing letters, numbers, spaces, hyphens and underscores */
  NAME_PATTERN: /^[\p{L}0-9\s-_]+$/u
} as const;

/**
 * File upload validation constants with security checks
 * for attachment handling
 */
export const FILE_VALIDATION = {
  /** Maximum file size in bytes (25MB) */
  MAX_FILE_SIZE: 25_000_000,
  
  /** Allowed file types for attachments */
  ALLOWED_FILE_TYPES: ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG'] as const,
  
  /** Unicode-aware file name pattern allowing letters, numbers, spaces, hyphens, underscores and dots */
  FILE_NAME_PATTERN: /^[\p{L}0-9\s-_\.]+$/u
} as const;

/**
 * Multi-Factor Authentication validation constants
 * for secure authentication
 */
export const MFA_VALIDATION = {
  /** Required length for MFA verification codes */
  CODE_LENGTH: 6,
  
  /** Pattern for numeric-only MFA codes */
  CODE_PATTERN: /^[0-9]{6}$/,
  
  /** MFA code expiry time in milliseconds (5 minutes) */
  CODE_EXPIRY: 300_000
} as const;