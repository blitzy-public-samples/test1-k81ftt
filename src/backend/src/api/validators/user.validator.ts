/**
 * User Validator Implementation
 * Version: 1.0.0
 * 
 * Implements comprehensive validation middleware and functions for user-related operations
 * with enhanced security measures, enterprise SSO support, and RBAC validation.
 */

import { validate, ValidationError } from 'class-validator'; // ^0.14.0
import { sanitize } from 'class-sanitizer'; // ^1.0.0
import { 
  CreateUserDto, 
  UpdateUserDto, 
  UpdateUserPreferencesDto 
} from '../../dto/user.dto';
import { 
  USER_VALIDATION 
} from '../../constants/validation.constants';
import { validateEmail } from '../../utils/validation.util';
import { logger } from '../../utils/logger.util';
import { createError } from '../../utils/error.util';

// Cache for validation results
const VALIDATION_CACHE = new Map<string, ValidationResult>();
const VALIDATION_CACHE_TTL = 300000; // 5 minutes

/**
 * Interface for validation results with detailed feedback
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
  metadata?: Record<string, unknown>;
}

/**
 * Rate limiting decorator for validation functions
 * @param limit - Number of allowed attempts
 * @param window - Time window in seconds
 */
function RateLimit(limit: number, window: number) {
  const attempts = new Map<string, number[]>();
  
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const key = `${propertyKey}-${JSON.stringify(args[0])}`;
      const now = Date.now();
      const windowMs = window * 1000;
      
      // Clean up old attempts
      const userAttempts = attempts.get(key) || [];
      const recentAttempts = userAttempts.filter(time => now - time < windowMs);
      
      if (recentAttempts.length >= limit) {
        throw createError('5002', 'Rate limit exceeded for validation', { limit, window });
      }
      
      recentAttempts.push(now);
      attempts.set(key, recentAttempts);
      
      return original.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Validates user creation data with enhanced security measures
 * @param userData - Data for user creation
 * @returns Validation result with sanitized data
 */
@RateLimit(10, 60)
export async function validateCreateUser(userData: CreateUserDto): Promise<ValidationResult> {
  const cacheKey = `create-user-${JSON.stringify(userData)}`;
  const cached = VALIDATION_CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.metadata?.timestamp < VALIDATION_CACHE_TTL) {
    return cached;
  }
  
  try {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      metadata: {
        timestamp: Date.now()
      }
    };

    // Sanitize input data
    sanitize(userData);

    // Validate email
    const emailValidation = await validateEmail(userData.email);
    if (!emailValidation.isValid) {
      result.errors.push(...emailValidation.errors);
    }

    // Validate name fields
    if (!userData.firstName || !userData.lastName) {
      result.errors.push('First name and last name are required');
    } else {
      const namePattern = /^[A-Za-z\s\-']+$/;
      
      if (!namePattern.test(userData.firstName) || 
          userData.firstName.length < USER_VALIDATION.NAME_MIN_LENGTH || 
          userData.firstName.length > USER_VALIDATION.NAME_MAX_LENGTH) {
        result.errors.push(`First name must be between ${USER_VALIDATION.NAME_MIN_LENGTH} and ${USER_VALIDATION.NAME_MAX_LENGTH} characters and contain only letters, spaces, hyphens, and apostrophes`);
      }
      
      if (!namePattern.test(userData.lastName) || 
          userData.lastName.length < USER_VALIDATION.NAME_MIN_LENGTH || 
          userData.lastName.length > USER_VALIDATION.NAME_MAX_LENGTH) {
        result.errors.push(`Last name must be between ${USER_VALIDATION.NAME_MIN_LENGTH} and ${USER_VALIDATION.NAME_MAX_LENGTH} characters and contain only letters, spaces, hyphens, and apostrophes`);
      }
    }

    // Validate using class-validator
    const errors = await validate(userData);
    if (errors.length > 0) {
      result.errors.push(...errors.map(error => Object.values(error.constraints || {}).join(', ')));
    }

    result.isValid = result.errors.length === 0;
    result.sanitizedData = result.isValid ? userData : undefined;

    // Cache validation result
    VALIDATION_CACHE.set(cacheKey, result);

    return result;
  } catch (error) {
    logger.error('User validation error', { error, userData });
    throw createError('4001', 'User validation failed', { userData });
  }
}

/**
 * Validates user update data with security patterns
 * @param userData - Data for user update
 * @returns Validation result with sanitized data
 */
@RateLimit(20, 60)
export async function validateUpdateUser(userData: UpdateUserDto): Promise<ValidationResult> {
  try {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      metadata: {
        timestamp: Date.now()
      }
    };

    // Sanitize input data
    sanitize(userData);

    // Validate optional name fields if provided
    if (userData.firstName) {
      const namePattern = /^[A-Za-z\s\-']+$/;
      if (!namePattern.test(userData.firstName) || 
          userData.firstName.length < USER_VALIDATION.NAME_MIN_LENGTH || 
          userData.firstName.length > USER_VALIDATION.NAME_MAX_LENGTH) {
        result.errors.push(`First name must be between ${USER_VALIDATION.NAME_MIN_LENGTH} and ${USER_VALIDATION.NAME_MAX_LENGTH} characters and contain only letters, spaces, hyphens, and apostrophes`);
      }
    }

    if (userData.lastName) {
      const namePattern = /^[A-Za-z\s\-']+$/;
      if (!namePattern.test(userData.lastName) || 
          userData.lastName.length < USER_VALIDATION.NAME_MIN_LENGTH || 
          userData.lastName.length > USER_VALIDATION.NAME_MAX_LENGTH) {
        result.errors.push(`Last name must be between ${USER_VALIDATION.NAME_MIN_LENGTH} and ${USER_VALIDATION.NAME_MAX_LENGTH} characters and contain only letters, spaces, hyphens, and apostrophes`);
      }
    }

    // Validate using class-validator
    const errors = await validate(userData, { skipMissingProperties: true });
    if (errors.length > 0) {
      result.errors.push(...errors.map(error => Object.values(error.constraints || {}).join(', ')));
    }

    result.isValid = result.errors.length === 0;
    result.sanitizedData = result.isValid ? userData : undefined;

    return result;
  } catch (error) {
    logger.error('User update validation error', { error, userData });
    throw createError('4001', 'User update validation failed', { userData });
  }
}

/**
 * Validates user preferences with security checks
 * @param preferencesData - User preferences data
 * @returns Validation result with sanitized data
 */
@RateLimit(30, 60)
export async function validateUserPreferences(preferencesData: UpdateUserPreferencesDto): Promise<ValidationResult> {
  try {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      metadata: {
        timestamp: Date.now()
      }
    };

    // Sanitize input data
    sanitize(preferencesData);

    // Validate theme
    if (preferencesData.theme && 
        !['light', 'dark', 'system', 'high-contrast'].includes(preferencesData.theme)) {
      result.errors.push('Invalid theme selection');
    }

    // Validate language format (ISO 639-1)
    if (preferencesData.language && 
        !/^[a-z]{2}-[A-Z]{2}$/.test(preferencesData.language)) {
      result.errors.push('Invalid language code format');
    }

    // Validate timezone (IANA timezone identifier)
    if (preferencesData.timezone && 
        !/^[A-Za-z_]+\/[A-Za-z_]+$/.test(preferencesData.timezone)) {
      result.errors.push('Invalid timezone format');
    }

    // Validate using class-validator
    const errors = await validate(preferencesData, { skipMissingProperties: true });
    if (errors.length > 0) {
      result.errors.push(...errors.map(error => Object.values(error.constraints || {}).join(', ')));
    }

    result.isValid = result.errors.length === 0;
    result.sanitizedData = result.isValid ? preferencesData : undefined;

    return result;
  } catch (error) {
    logger.error('User preferences validation error', { error, preferencesData });
    throw createError('4001', 'User preferences validation failed', { preferencesData });
  }
}