/**
 * @fileoverview Project validation module implementing comprehensive validation rules
 * for project-related forms and data with enhanced security and data integrity checks
 * @version 1.0.0
 */

import {
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectStatus,
  ProjectMetadata
} from '../types/project.types';
import {
  validateLength,
  validateRequired,
  validateFutureDate,
  validateDateSequence,
  sanitizeInput
} from '../utils/validation.utils';
import {
  PROJECT_VALIDATION,
  VALIDATION_MESSAGES,
  STATUS_TRANSITIONS
} from '../constants/validation.constants';

/**
 * Interface for validation results
 */
interface ValidationResult {
  isValid: boolean;
  message?: string;
  sanitizedValue?: string;
  errors?: Record<string, string>;
}

/**
 * Validates and sanitizes project name
 * @param name - Project name to validate
 * @returns ValidationResult with sanitized value if valid
 */
export const validateProjectName = (name: string): ValidationResult => {
  const sanitizedName = sanitizeInput(name);

  if (!validateRequired(sanitizedName)) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.REQUIRED_FIELD
    };
  }

  if (!validateLength(
    sanitizedName,
    PROJECT_VALIDATION.NAME_MIN_LENGTH,
    PROJECT_VALIDATION.NAME_MAX_LENGTH
  )) {
    return {
      isValid: false,
      message: `Project name must be between ${PROJECT_VALIDATION.NAME_MIN_LENGTH} and ${PROJECT_VALIDATION.NAME_MAX_LENGTH} characters`
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitizedName
  };
};

/**
 * Validates project description with optional sanitization
 * @param description - Project description to validate
 * @returns ValidationResult with sanitized value if valid
 */
export const validateProjectDescription = (description?: string): ValidationResult => {
  if (!description) {
    return { isValid: true };
  }

  const sanitizedDescription = sanitizeInput(description);

  if (!validateLength(sanitizedDescription, 0, PROJECT_VALIDATION.DESCRIPTION_MAX_LENGTH)) {
    return {
      isValid: false,
      message: `Description cannot exceed ${PROJECT_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitizedDescription
  };
};

/**
 * Validates project dates with timezone awareness
 * @param startDate - Project start date
 * @param endDate - Project end date
 * @returns ValidationResult
 */
export const validateProjectDates = (
  startDate: Date,
  endDate: Date
): ValidationResult => {
  if (!validateRequired(startDate) || !validateRequired(endDate)) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.REQUIRED_FIELD
    };
  }

  if (!validateFutureDate(startDate)) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.FUTURE_DATE_REQUIRED
    };
  }

  if (!validateDateSequence(startDate, endDate)) {
    return {
      isValid: false,
      message: 'End date must be after start date'
    };
  }

  return { isValid: true };
};

/**
 * Validates project metadata structure and content
 * @param metadata - Project metadata to validate
 * @returns ValidationResult with detailed error messages
 */
export const validateProjectMetadata = (metadata: ProjectMetadata): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!metadata.tags || !Array.isArray(metadata.tags)) {
    errors.tags = 'Tags must be an array';
  }

  if (!metadata.settings?.visibility) {
    errors.visibility = 'Project visibility is required';
  }

  if (!metadata.settings?.notifications) {
    errors.notifications = 'Notification settings are required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates project status transitions
 * @param currentStatus - Current project status
 * @param newStatus - New project status
 * @returns ValidationResult
 */
export const validateStatusTransition = (
  currentStatus: ProjectStatus,
  newStatus: ProjectStatus
): ValidationResult => {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];

  if (!allowedTransitions?.includes(newStatus)) {
    return {
      isValid: false,
      message: `Invalid status transition from ${currentStatus} to ${newStatus}`
    };
  }

  return { isValid: true };
};

/**
 * Validates complete project creation payload
 * @param payload - Project creation payload
 * @returns ValidationResult with detailed error messages
 */
export const validateCreateProject = (
  payload: CreateProjectPayload
): ValidationResult => {
  const errors: Record<string, string> = {};

  const nameValidation = validateProjectName(payload.name);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.message!;
  }

  const descriptionValidation = validateProjectDescription(payload.description);
  if (!descriptionValidation.isValid) {
    errors.description = descriptionValidation.message!;
  }

  const datesValidation = validateProjectDates(payload.startDate, payload.endDate);
  if (!datesValidation.isValid) {
    errors.dates = datesValidation.message!;
  }

  const metadataValidation = validateProjectMetadata(payload.metadata);
  if (!metadataValidation.isValid) {
    errors.metadata = 'Invalid project metadata';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates project update payload with partial updates support
 * @param payload - Project update payload
 * @param currentStatus - Current project status for status transition validation
 * @returns ValidationResult with detailed error messages
 */
export const validateUpdateProject = (
  payload: UpdateProjectPayload,
  currentStatus?: ProjectStatus
): ValidationResult => {
  const errors: Record<string, string> = {};

  if (payload.name) {
    const nameValidation = validateProjectName(payload.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.message!;
    }
  }

  if (payload.description) {
    const descriptionValidation = validateProjectDescription(payload.description);
    if (!descriptionValidation.isValid) {
      errors.description = descriptionValidation.message!;
    }
  }

  if (payload.startDate && payload.endDate) {
    const datesValidation = validateProjectDates(payload.startDate, payload.endDate);
    if (!datesValidation.isValid) {
      errors.dates = datesValidation.message!;
    }
  }

  if (payload.status && currentStatus) {
    const statusValidation = validateStatusTransition(currentStatus, payload.status);
    if (!statusValidation.isValid) {
      errors.status = statusValidation.message!;
    }
  }

  if (payload.metadata) {
    const metadataValidation = validateProjectMetadata(payload.metadata);
    if (!metadataValidation.isValid) {
      errors.metadata = 'Invalid project metadata';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};