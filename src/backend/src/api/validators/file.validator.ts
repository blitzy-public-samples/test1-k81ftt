// @ts-strict
import Joi from 'joi'; // v17.9.0
import { fileType } from 'file-type'; // v16.5.4

import { IFile } from '../../interfaces/IFile';
import { FILE_VALIDATION } from '../../constants/validation.constants';
import { validateFileUpload } from '../../helpers/validation.helper';

/**
 * Enhanced file size validation with security checks
 * @param size - File size in bytes
 * @returns boolean indicating if file size is valid
 */
const validateFileSize = (size: number): boolean => {
  // Validate size parameter
  if (!size || typeof size !== 'number' || size <= 0) {
    return false;
  }

  // Check for zero-byte files (potential security risk)
  if (size === 0) {
    return false;
  }

  // Validate against maximum size limit
  return size <= FILE_VALIDATION.MAX_FILE_SIZE;
};

/**
 * Enhanced file type validation with security checks
 * @param mimeType - Declared MIME type
 * @param content - File content buffer
 * @returns Promise<boolean> indicating if file type is valid
 */
const validateFileType = async (mimeType: string, content: Buffer): Promise<boolean> => {
  // Validate mimeType parameter
  if (!mimeType || typeof mimeType !== 'string') {
    return false;
  }

  // Verify MIME type against allowed types
  const isAllowedMimeType = FILE_VALIDATION.ALLOWED_FILE_TYPES.some(type => {
    const mimePattern = new RegExp(`^${type.toLowerCase()}`);
    return mimePattern.test(mimeType.toLowerCase());
  });

  if (!isAllowedMimeType) {
    return false;
  }

  try {
    // Detect actual file type from content
    const detectedType = await fileType.fromBuffer(content);
    
    // If type detection fails or doesn't match declared type, reject
    if (!detectedType || detectedType.mime !== mimeType) {
      return false;
    }

    return true;
  } catch (error) {
    // Log error for security monitoring
    console.error('File type validation error:', error);
    return false;
  }
};

/**
 * Joi schema for file upload validation
 * Implements comprehensive validation rules for file attachments
 */
export const fileUploadSchema = Joi.object({
  file: Joi.object({
    size: Joi.number()
      .required()
      .custom((value, helpers) => {
        if (!validateFileSize(value)) {
          return helpers.error('file.invalidSize');
        }
        return value;
      })
      .messages({
        'file.invalidSize': `File size must not exceed ${FILE_VALIDATION.MAX_FILE_SIZE / (1024 * 1024)}MB`
      }),

    mimeType: Joi.string()
      .required()
      .custom(async (value, helpers) => {
        const content = (helpers.state.ancestors[0] as IFile).buffer;
        if (!(await validateFileType(value, content))) {
          return helpers.error('file.invalidType');
        }
        return value;
      })
      .messages({
        'file.invalidType': `File type must be one of: ${FILE_VALIDATION.ALLOWED_FILE_TYPES.join(', ')}`
      }),

    buffer: Joi.binary().required(),

    originalName: Joi.string()
      .required()
      .pattern(FILE_VALIDATION.FILE_NAME_PATTERN)
      .messages({
        'string.pattern.base': 'Filename contains invalid characters'
      }),

    encoding: Joi.string().required(),
    
    headers: Joi.object().required()
  }).required(),

  // Security-related validations
  virusScanStatus: Joi.string()
    .valid('clean')
    .required()
    .messages({
      'any.only': 'File must pass virus scan'
    })
}).options({ abortEarly: false });

/**
 * Joi schema for file metadata validation
 * Implements enhanced security controls and data integrity checks
 */
export const fileMetadataSchema = Joi.object({
  name: Joi.string()
    .required()
    .max(255)
    .pattern(FILE_VALIDATION.FILE_NAME_PATTERN)
    .messages({
      'string.pattern.base': 'File name contains invalid characters',
      'string.max': 'File name exceeds maximum length'
    }),

  taskId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid task ID format'
    }),

  projectId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid project ID format'
    }),

  retentionPolicy: Joi.string()
    .valid('30days', '90days', '1year', 'permanent')
    .required()
    .messages({
      'any.only': 'Invalid retention policy'
    }),

  securityClassification: Joi.string()
    .valid('public', 'internal', 'confidential', 'restricted')
    .required()
    .messages({
      'any.only': 'Invalid security classification'
    }),

  description: Joi.string()
    .max(1000)
    .optional(),

  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .optional(),

  checksum: Joi.string()
    .required()
    .pattern(/^[a-fA-F0-9]{64}$/)
    .messages({
      'string.pattern.base': 'Invalid checksum format'
    })
}).options({ abortEarly: false });