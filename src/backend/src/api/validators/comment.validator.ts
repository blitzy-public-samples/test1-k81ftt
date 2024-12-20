import { validate, ValidationError, isUUID as isUUIDValidator } from 'class-validator'; // v0.14.0
import { sanitize, Trim, Escape } from 'class-sanitizer'; // v2.0.0
import { CreateCommentDto, UpdateCommentDto } from '../../dto/comment.dto';
import { IComment } from '../../interfaces/IComment';
import { UUID } from '../../types/common.types';

/**
 * Validation error messages for comment-related operations
 */
export const COMMENT_VALIDATION_ERRORS = {
  CONTENT_REQUIRED: 'Comment content is required',
  CONTENT_TOO_LONG: 'Comment content exceeds maximum length of 2000 characters',
  CONTENT_INVALID: 'Comment content contains invalid characters or patterns',
  INVALID_TASK_ID: 'Invalid task ID provided',
  INVALID_PARENT_ID: 'Invalid parent comment ID provided',
  PARENT_NOT_FOUND: 'Parent comment does not exist',
  INVALID_MENTIONS: 'One or more invalid user mentions',
  TOO_MANY_MENTIONS: 'Number of mentions exceeds maximum limit of 50',
  TASK_NOT_FOUND: 'Referenced task does not exist'
} as const;

/**
 * Validation rules and constraints for comments
 */
export const COMMENT_VALIDATION_RULES = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 2000,
  ALLOWED_MENTIONS_MAX: 50,
  CONTENT_PATTERN: '^[\\p{L}\\p{N}\\p{P}\\p{Z}]+$',
  UUID_PATTERN: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
} as const;

/**
 * Interface for validation results
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: CreateCommentDto | UpdateCommentDto;
}

/**
 * Sanitizes comment content to prevent XSS and other injection attacks
 * @param content - Raw comment content
 * @returns Sanitized comment content
 */
export function sanitizeCommentContent(content: string): string {
  // Remove HTML tags
  let sanitized = content.replace(/<[^>]*>/g, '');
  
  // Encode special characters
  sanitized = Escape(sanitized);
  
  // Normalize unicode characters
  sanitized = sanitized.normalize('NFKC');
  
  // Remove potentially dangerous patterns
  sanitized = sanitized.replace(/javascript:/gi, '')
                      .replace(/data:/gi, '')
                      .replace(/vbscript:/gi, '');
  
  // Trim excessive whitespace
  sanitized = Trim(sanitized);
  
  // Validate final length
  if (sanitized.length > COMMENT_VALIDATION_RULES.MAX_LENGTH) {
    sanitized = sanitized.substring(0, COMMENT_VALIDATION_RULES.MAX_LENGTH);
  }
  
  return sanitized;
}

/**
 * Validates mentions array for proper format and limits
 * @param mentions - Array of user UUIDs
 * @returns Validation result
 */
function validateMentions(mentions: UUID[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (mentions.length > COMMENT_VALIDATION_RULES.ALLOWED_MENTIONS_MAX) {
    errors.push(COMMENT_VALIDATION_ERRORS.TOO_MANY_MENTIONS);
    return { isValid: false, errors };
  }
  
  const invalidUUIDs = mentions.filter(uuid => !isUUIDValidator(uuid));
  if (invalidUUIDs.length > 0) {
    errors.push(COMMENT_VALIDATION_ERRORS.INVALID_MENTIONS);
    return { isValid: false, errors };
  }
  
  return { isValid: true, errors: [] };
}

/**
 * Validates and sanitizes new comment creation requests
 * @param commentData - Comment creation DTO
 * @returns Validation result with sanitized data or errors
 */
export async function validateCreateComment(commentData: CreateCommentDto): Promise<ValidationResult> {
  const errors: string[] = [];
  const sanitizedData = { ...commentData };
  
  // Validate and sanitize content
  if (!commentData.content || commentData.content.trim().length < COMMENT_VALIDATION_RULES.MIN_LENGTH) {
    errors.push(COMMENT_VALIDATION_ERRORS.CONTENT_REQUIRED);
  } else {
    sanitizedData.content = sanitizeCommentContent(commentData.content);
  }
  
  // Validate taskId
  if (!isUUIDValidator(commentData.taskId)) {
    errors.push(COMMENT_VALIDATION_ERRORS.INVALID_TASK_ID);
  }
  
  // Validate parentId if provided
  if (commentData.parentId !== null && !isUUIDValidator(commentData.parentId)) {
    errors.push(COMMENT_VALIDATION_ERRORS.INVALID_PARENT_ID);
  }
  
  // Validate mentions if provided
  if (commentData.mentions?.length > 0) {
    const mentionsValidation = validateMentions(commentData.mentions);
    if (!mentionsValidation.isValid) {
      errors.push(...mentionsValidation.errors);
    }
  }
  
  // Validate using class-validator decorators
  const validationErrors = await validate(commentData);
  if (validationErrors.length > 0) {
    errors.push(...validationErrors.map(error => Object.values(error.constraints || {}).join(', ')));
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  };
}

/**
 * Validates and sanitizes comment update requests
 * @param commentData - Comment update DTO
 * @returns Validation result with sanitized data or errors
 */
export async function validateUpdateComment(commentData: UpdateCommentDto): Promise<ValidationResult> {
  const errors: string[] = [];
  const sanitizedData = { ...commentData };
  
  // Validate and sanitize content if provided
  if (commentData.content) {
    if (commentData.content.trim().length < COMMENT_VALIDATION_RULES.MIN_LENGTH) {
      errors.push(COMMENT_VALIDATION_ERRORS.CONTENT_REQUIRED);
    } else {
      sanitizedData.content = sanitizeCommentContent(commentData.content);
    }
  }
  
  // Validate mentions if provided
  if (commentData.mentions?.length > 0) {
    const mentionsValidation = validateMentions(commentData.mentions);
    if (!mentionsValidation.isValid) {
      errors.push(...mentionsValidation.errors);
    }
  }
  
  // Validate using class-validator decorators
  const validationErrors = await validate(commentData);
  if (validationErrors.length > 0) {
    errors.push(...validationErrors.map(error => Object.values(error.constraints || {}).join(', ')));
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  };
}