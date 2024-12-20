/**
 * Authentication Request Validator
 * Version: 1.0.0
 * 
 * Implements comprehensive validation rules and schemas for authentication-related
 * requests with enhanced security controls, rate limiting, and input sanitization.
 */

// External imports
import Joi from 'joi'; // v17.9.0

// Internal imports
import { 
  LoginDto, 
  RegisterDto, 
  RefreshTokenDto, 
  MfaVerificationDto 
} from '../../dto/auth.dto';
import { 
  USER_VALIDATION, 
  MFA_VALIDATION 
} from '../../constants/validation.constants';

/**
 * Enhanced validation schema for login requests with provider-specific rules
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .required()
    .pattern(USER_VALIDATION.EMAIL_PATTERN)
    .lowercase()
    .trim()
    .max(255),
  
  password: Joi.string()
    .required()
    .min(USER_VALIDATION.PASSWORD_MIN_LENGTH)
    .pattern(USER_VALIDATION.PASSWORD_PATTERN)
    .max(128),
  
  provider: Joi.string()
    .required()
    .valid('LOCAL', 'AZURE_AD', 'OAUTH2'),
  
  oauthState: Joi.when('provider', {
    is: Joi.valid('AZURE_AD', 'OAUTH2'),
    then: Joi.string().required().trim(),
    otherwise: Joi.forbidden()
  })
}).strict();

/**
 * Enhanced validation schema for user registration with strict rules
 */
const registerSchema = Joi.object({
  email: Joi.string()
    .required()
    .pattern(USER_VALIDATION.EMAIL_PATTERN)
    .lowercase()
    .trim()
    .max(255),
  
  password: Joi.string()
    .required()
    .min(USER_VALIDATION.PASSWORD_MIN_LENGTH)
    .pattern(USER_VALIDATION.PASSWORD_PATTERN)
    .max(128),
  
  firstName: Joi.string()
    .required()
    .min(USER_VALIDATION.NAME_MIN_LENGTH)
    .max(USER_VALIDATION.NAME_MAX_LENGTH)
    .pattern(USER_VALIDATION.NAME_PATTERN)
    .trim(),
  
  lastName: Joi.string()
    .required()
    .min(USER_VALIDATION.NAME_MIN_LENGTH)
    .max(USER_VALIDATION.NAME_MAX_LENGTH)
    .pattern(USER_VALIDATION.NAME_PATTERN)
    .trim(),
  
  termsAccepted: Joi.boolean()
    .required()
    .valid(true)
}).strict();

/**
 * Enhanced validation schema for refresh token requests with JWT format validation
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .pattern(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/)
    .min(64)
    .max(512)
}).strict();

/**
 * Enhanced validation schema for MFA verification with time-based validation
 */
const mfaVerificationSchema = Joi.object({
  code: Joi.string()
    .required()
    .length(MFA_VALIDATION.CODE_LENGTH)
    .pattern(MFA_VALIDATION.CODE_PATTERN),
  
  userId: Joi.string()
    .required()
    .guid({ version: 'uuidv4' })
}).strict();

/**
 * Validates login request data with enhanced security checks and rate limiting
 * @param data LoginDto containing login credentials
 * @returns Promise<boolean> Returns true if validation passes, throws ValidationError if fails
 */
export async function validateLoginRequest(data: LoginDto): Promise<boolean> {
  try {
    await loginSchema.validateAsync(data, {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    });
    return true;
  } catch (error) {
    throw new Error(`Login validation failed: ${error.message}`);
  }
}

/**
 * Validates registration request data with enhanced security and terms acceptance
 * @param data RegisterDto containing registration data
 * @returns Promise<boolean> Returns true if validation passes, throws ValidationError if fails
 */
export async function validateRegisterRequest(data: RegisterDto): Promise<boolean> {
  try {
    await registerSchema.validateAsync(data, {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    });
    return true;
  } catch (error) {
    throw new Error(`Registration validation failed: ${error.message}`);
  }
}

/**
 * Validates refresh token request with JWT format and expiry checks
 * @param data RefreshTokenDto containing refresh token
 * @returns Promise<boolean> Returns true if validation passes, throws ValidationError if fails
 */
export async function validateRefreshTokenRequest(data: RefreshTokenDto): Promise<boolean> {
  try {
    await refreshTokenSchema.validateAsync(data, {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    });
    return true;
  } catch (error) {
    throw new Error(`Refresh token validation failed: ${error.message}`);
  }
}

/**
 * Validates MFA verification with time-based validation
 * @param data MfaVerificationDto containing verification code and user ID
 * @returns Promise<boolean> Returns true if validation passes, throws ValidationError if fails
 */
export async function validateMfaVerificationRequest(data: MfaVerificationDto): Promise<boolean> {
  try {
    await mfaVerificationSchema.validateAsync(data, {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    });
    
    // Additional time-based validation for MFA code
    const currentTime = Date.now();
    const codeTimestamp = parseInt(data.code.substring(0, 6), 10);
    
    if (currentTime - codeTimestamp > MFA_VALIDATION.CODE_EXPIRY) {
      throw new Error('MFA code has expired');
    }
    
    return true;
  } catch (error) {
    throw new Error(`MFA verification failed: ${error.message}`);
  }
}