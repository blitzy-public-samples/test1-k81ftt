/**
 * @fileoverview Task validation module implementing comprehensive validation rules
 * for task-related operations with security and performance optimizations
 * @version 1.0.0
 */

import {
  CreateTaskPayload,
  UpdateTaskPayload,
  Task,
  TaskStatus,
  Priority
} from '../types/task.types';
import {
  validateLength,
  validateRequired,
  validateFutureDate,
  sanitizeInput,
  validatePattern
} from '../utils/validation.utils';
import {
  TASK_VALIDATION,
  VALIDATION_MESSAGES,
  SECURITY_PATTERNS
} from '../constants/validation.constants';

/**
 * Interface for validation results with detailed error tracking
 */
interface ValidationResult {
  isValid: boolean;
  message?: string;
  errors?: Record<string, string>;
}

/**
 * Validates task title with enhanced security checks and pattern matching
 * @param title - Task title to validate
 * @returns ValidationResult with validation status and error message
 */
export const validateTaskTitle = (title: string): ValidationResult => {
  // Sanitize input to prevent XSS
  const sanitizedTitle = sanitizeInput(title);

  // Required field validation
  if (!validateRequired(sanitizedTitle)) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.REQUIRED_FIELD
    };
  }

  // Length validation
  if (!validateLength(
    sanitizedTitle,
    TASK_VALIDATION.TITLE_MIN_LENGTH,
    TASK_VALIDATION.TITLE_MAX_LENGTH
  )) {
    return {
      isValid: false,
      message: `Title must be between ${TASK_VALIDATION.TITLE_MIN_LENGTH} and ${TASK_VALIDATION.TITLE_MAX_LENGTH} characters`
    };
  }

  // Pattern validation
  if (!validatePattern(sanitizedTitle, TASK_VALIDATION.TITLE_PATTERN)) {
    return {
      isValid: false,
      message: 'Title can only contain letters, numbers, spaces, dashes, and underscores'
    };
  }

  return { isValid: true };
};

/**
 * Validates task description with XSS prevention and content security
 * @param description - Task description to validate
 * @returns ValidationResult with validation status and error message
 */
export const validateTaskDescription = (description?: string): ValidationResult => {
  // Optional field check
  if (!description) {
    return { isValid: true };
  }

  // Sanitize input to prevent XSS
  const sanitizedDescription = sanitizeInput(description);

  // Length validation
  if (!validateLength(sanitizedDescription, 0, TASK_VALIDATION.DESCRIPTION_MAX_LENGTH)) {
    return {
      isValid: false,
      message: `Description cannot exceed ${TASK_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`
    };
  }

  // Check for malicious patterns
  for (const pattern of SECURITY_PATTERNS.XSS_PATTERNS) {
    if (pattern.test(sanitizedDescription)) {
      return {
        isValid: false,
        message: 'Description contains invalid characters or patterns'
      };
    }
  }

  return { isValid: true };
};

/**
 * Validates task due date with timezone awareness and date manipulation protection
 * @param dueDate - Task due date to validate
 * @returns ValidationResult with validation status and error message
 */
export const validateTaskDueDate = (dueDate: Date): ValidationResult => {
  // Required field validation
  if (!dueDate) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.REQUIRED_FIELD
    };
  }

  // Future date validation with timezone consideration
  if (!validateFutureDate(dueDate)) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.FUTURE_DATE_REQUIRED
    };
  }

  return { isValid: true };
};

/**
 * Validates complete task creation payload with comprehensive security checks
 * @param payload - Task creation payload to validate
 * @returns ValidationResult with validation status and detailed errors
 */
export const validateCreateTaskPayload = (payload: CreateTaskPayload): ValidationResult => {
  const errors: Record<string, string> = {};

  // Required fields validation
  if (!validateRequired(payload)) {
    return {
      isValid: false,
      message: 'Invalid payload structure',
      errors: { _error: 'Missing required payload' }
    };
  }

  // Title validation
  const titleValidation = validateTaskTitle(payload.title);
  if (!titleValidation.isValid) {
    errors.title = titleValidation.message!;
  }

  // Description validation
  const descriptionValidation = validateTaskDescription(payload.description);
  if (!descriptionValidation.isValid) {
    errors.description = descriptionValidation.message!;
  }

  // Due date validation
  const dueDateValidation = validateTaskDueDate(payload.dueDate);
  if (!dueDateValidation.isValid) {
    errors.dueDate = dueDateValidation.message!;
  }

  // Priority validation
  if (!Object.values(Priority).includes(payload.priority)) {
    errors.priority = 'Invalid priority value';
  }

  // Project ID validation
  if (!validateRequired(payload.projectId)) {
    errors.projectId = VALIDATION_MESSAGES.REQUIRED_FIELD;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates complete task update payload with partial update support and security validation
 * @param payload - Task update payload to validate
 * @returns ValidationResult with validation status and detailed errors
 */
export const validateUpdateTaskPayload = (payload: UpdateTaskPayload): ValidationResult => {
  const errors: Record<string, string> = {};

  // Required ID validation
  if (!validateRequired(payload.id)) {
    errors.id = VALIDATION_MESSAGES.REQUIRED_FIELD;
  }

  // Optional field validations
  if (payload.title !== undefined) {
    const titleValidation = validateTaskTitle(payload.title);
    if (!titleValidation.isValid) {
      errors.title = titleValidation.message!;
    }
  }

  if (payload.description !== undefined) {
    const descriptionValidation = validateTaskDescription(payload.description);
    if (!descriptionValidation.isValid) {
      errors.description = descriptionValidation.message!;
    }
  }

  if (payload.dueDate !== undefined) {
    const dueDateValidation = validateTaskDueDate(payload.dueDate);
    if (!dueDateValidation.isValid) {
      errors.dueDate = dueDateValidation.message!;
    }
  }

  if (payload.status !== undefined && !Object.values(TaskStatus).includes(payload.status)) {
    errors.status = 'Invalid status value';
  }

  if (payload.priority !== undefined && !Object.values(Priority).includes(payload.priority)) {
    errors.priority = 'Invalid priority value';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};