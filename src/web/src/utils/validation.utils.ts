/**
 * @fileoverview Validation utilities for the Task Management System
 * Implements comprehensive validation for forms, data integrity, and security
 * @version 1.0.0
 */

import { isValid, isFuture, parseISO } from 'date-fns'; // v2.30.0
import {
  USER_VALIDATION,
  TASK_VALIDATION,
  PROJECT_VALIDATION,
  VALIDATION_MESSAGES,
  TaskPriority,
  AllowedFileType
} from '../constants/validation.constants';

/**
 * Validates email format using RFC 5322 compliant regex pattern
 * @param email - Email address to validate
 * @returns boolean indicating if email is valid
 */
export const validateEmail = (email: string): boolean => {
  if (typeof email !== 'string' || !email) {
    return false;
  }

  const trimmedEmail = email.trim();
  // RFC 5321 specifies maximum length of 254 characters
  if (trimmedEmail.length > 254) {
    return false;
  }

  return USER_VALIDATION.EMAIL_PATTERN.test(trimmedEmail);
};

/**
 * Validates password strength using OWASP compliant pattern
 * @param password - Password to validate
 * @returns boolean indicating if password meets security requirements
 */
export const validatePassword = (password: string): boolean => {
  if (typeof password !== 'string' || !password) {
    return false;
  }

  if (password.length < USER_VALIDATION.PASSWORD_MIN_LENGTH) {
    return false;
  }

  return USER_VALIDATION.PASSWORD_PATTERN.test(password);
};

/**
 * Validates string length with DoS prevention
 * @param value - String to validate
 * @param minLength - Minimum allowed length
 * @param maxLength - Maximum allowed length
 * @returns boolean indicating if length is within bounds
 */
export const validateLength = (
  value: string,
  minLength: number,
  maxLength: number
): boolean => {
  if (typeof value !== 'string' || typeof minLength !== 'number' || typeof maxLength !== 'number') {
    return false;
  }

  // Normalize string to NFC form for consistent length calculation
  const normalizedValue = value.normalize('NFC').trim();
  
  // DoS prevention: reject extremely long inputs
  if (normalizedValue.length > 10000) {
    return false;
  }

  return normalizedValue.length >= minLength && normalizedValue.length <= maxLength;
};

/**
 * Validates required fields with type-specific checks
 * @param value - Value to validate
 * @returns boolean indicating if value exists and is not empty
 */
export const validateRequired = (value: any): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0 && value.every(item => item !== null && item !== undefined);
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return Boolean(value);
};

/**
 * Validates future dates with timezone awareness
 * @param date - Date to validate
 * @returns boolean indicating if date is valid and in future
 */
export const validateFutureDate = (date: Date | string): boolean => {
  try {
    const dateToValidate = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateToValidate) && isFuture(dateToValidate);
  } catch {
    return false;
  }
};

/**
 * Validates task title format and length
 * @param title - Task title to validate
 * @returns boolean indicating if title is valid
 */
export const validateTaskTitle = (title: string): boolean => {
  if (!validateRequired(title)) {
    return false;
  }

  return (
    validateLength(title, TASK_VALIDATION.TITLE_MIN_LENGTH, TASK_VALIDATION.TITLE_MAX_LENGTH) &&
    TASK_VALIDATION.TITLE_PATTERN.test(title.trim())
  );
};

/**
 * Validates task description length
 * @param description - Task description to validate
 * @returns boolean indicating if description is valid
 */
export const validateTaskDescription = (description?: string): boolean => {
  if (!description) {
    return true; // Description is optional
  }

  return validateLength(description, 0, TASK_VALIDATION.DESCRIPTION_MAX_LENGTH);
};

/**
 * Validates task priority value
 * @param priority - Priority value to validate
 * @returns boolean indicating if priority is valid
 */
export const validateTaskPriority = (priority: string): priority is TaskPriority => {
  return TASK_VALIDATION.PRIORITY_VALUES.includes(priority as TaskPriority);
};

/**
 * Validates file attachment type and size
 * @param file - File to validate
 * @returns boolean indicating if file is valid
 */
export const validateFileAttachment = (file: File): boolean => {
  const fileExtension = file.name.split('.').pop()?.toUpperCase();
  
  if (!fileExtension || !TASK_VALIDATION.ALLOWED_FILE_TYPES.includes(fileExtension as AllowedFileType)) {
    return false;
  }

  return file.size <= TASK_VALIDATION.MAX_FILE_SIZE;
};

/**
 * Validates project name format and length
 * @param name - Project name to validate
 * @returns boolean indicating if name is valid
 */
export const validateProjectName = (name: string): boolean => {
  if (!validateRequired(name)) {
    return false;
  }

  return validateLength(name, PROJECT_VALIDATION.NAME_MIN_LENGTH, PROJECT_VALIDATION.NAME_MAX_LENGTH);
};

/**
 * Validates project description length
 * @param description - Project description to validate
 * @returns boolean indicating if description is valid
 */
export const validateProjectDescription = (description?: string): boolean => {
  if (!description) {
    return true; // Description is optional
  }

  return validateLength(description, 0, PROJECT_VALIDATION.DESCRIPTION_MAX_LENGTH);
};