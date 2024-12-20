/**
 * @fileoverview Authentication form validation schemas using Yup
 * Implements comprehensive validation rules with enhanced security measures
 * @version 1.0.0
 */

import { object, string } from 'yup'; // v1.3.0
import { 
  LoginCredentials, 
  RegisterData, 
  MfaVerificationData 
} from '../types/auth.types';
import { 
  USER_VALIDATION, 
  VALIDATION_MESSAGES 
} from '../constants/validation.constants';

const {
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  EMAIL_PATTERN
} = USER_VALIDATION;

const {
  REQUIRED_FIELD,
  INVALID_EMAIL,
  INVALID_PASSWORD,
  INVALID_NAME
} = VALIDATION_MESSAGES;

/**
 * Enhanced validation schema for login credentials
 * Implements strict email format checking and password complexity validation
 */
export const loginValidationSchema = object<LoginCredentials>({
  email: string()
    .required(REQUIRED_FIELD)
    .trim()
    .matches(EMAIL_PATTERN, {
      message: INVALID_EMAIL,
      excludeEmptyString: true
    })
    .max(255, 'Email must not exceed 255 characters'),

  password: string()
    .required(REQUIRED_FIELD)
    .min(PASSWORD_MIN_LENGTH, INVALID_PASSWORD)
    .matches(PASSWORD_PATTERN, {
      message: INVALID_PASSWORD,
      excludeEmptyString: true
    })
    .max(128, 'Password must not exceed 128 characters')
}).strict();

/**
 * Comprehensive validation schema for user registration
 * Implements enhanced security checks and input sanitization
 */
export const registerValidationSchema = object<RegisterData>({
  firstName: string()
    .required(REQUIRED_FIELD)
    .trim()
    .min(NAME_MIN_LENGTH, INVALID_NAME)
    .max(NAME_MAX_LENGTH, INVALID_NAME)
    .matches(/^[a-zA-Z\s-']+$/, {
      message: 'Name can only contain letters, spaces, hyphens, and apostrophes',
      excludeEmptyString: true
    }),

  lastName: string()
    .required(REQUIRED_FIELD)
    .trim()
    .min(NAME_MIN_LENGTH, INVALID_NAME)
    .max(NAME_MAX_LENGTH, INVALID_NAME)
    .matches(/^[a-zA-Z\s-']+$/, {
      message: 'Name can only contain letters, spaces, hyphens, and apostrophes',
      excludeEmptyString: true
    }),

  email: string()
    .required(REQUIRED_FIELD)
    .trim()
    .matches(EMAIL_PATTERN, {
      message: INVALID_EMAIL,
      excludeEmptyString: true
    })
    .max(255, 'Email must not exceed 255 characters'),

  password: string()
    .required(REQUIRED_FIELD)
    .min(PASSWORD_MIN_LENGTH, INVALID_PASSWORD)
    .matches(PASSWORD_PATTERN, {
      message: INVALID_PASSWORD,
      excludeEmptyString: true
    })
    .max(128, 'Password must not exceed 128 characters')
}).strict();

/**
 * MFA verification code validation schema
 * Implements secure code format validation and input sanitization
 */
export const mfaValidationSchema = object<MfaVerificationData>({
  code: string()
    .required(REQUIRED_FIELD)
    .trim()
    .matches(/^\d{6}$/, {
      message: 'Invalid verification code format',
      excludeEmptyString: true
    }),

  userId: string()
    .required(REQUIRED_FIELD)
    .trim()
    .matches(/^[0-9a-fA-F]{24}$/, {
      message: 'Invalid user ID format',
      excludeEmptyString: true
    })
}).strict();

/**
 * Validates login credentials with enhanced security checks
 * @param data - Login credentials to validate
 * @throws ValidationError with detailed error messages
 */
export const validateLoginCredentials = async (data: LoginCredentials): Promise<void> => {
  await loginValidationSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

/**
 * Validates registration data with comprehensive security measures
 * @param data - Registration data to validate
 * @throws ValidationError with detailed error messages
 */
export const validateRegistrationData = async (data: RegisterData): Promise<void> => {
  await registerValidationSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

/**
 * Validates MFA verification data with enhanced security
 * @param data - MFA verification data to validate
 * @throws ValidationError with detailed error messages
 */
export const validateMfaVerification = async (data: MfaVerificationData): Promise<void> => {
  await mfaValidationSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};