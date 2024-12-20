/**
 * @fileoverview Task validation middleware implementing comprehensive security checks
 * and business rule validation for task-related operations
 * Version: 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.0
import { 
  validate,
  IsUUID,
  IsDate,
  IsString,
  MaxLength,
  MinLength,
  IsEnum,
  IsOptional,
  Matches,
  IsArray,
  ValidateNested
} from 'class-validator'; // v0.14.0
import { sanitize } from 'class-sanitizer'; // v1.0.1
import { plainToClass } from 'class-transformer'; // v0.5.1

import { CreateTaskDto, UpdateTaskDto } from '../../dto/task.dto';
import { TaskStatus, TaskPriority } from '../../interfaces/ITask';
import { TASK_VALIDATION, FILE_VALIDATION } from '../../constants/validation.constants';
import { isUUID } from '../../types/common.types';

/**
 * Custom error class for validation failures
 */
class ValidationError extends Error {
  constructor(public errors: any[]) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

/**
 * Validates that a date is in the future
 * @param date Date to validate
 * @returns boolean indicating if date is valid
 */
const isFutureDate = (date: Date): boolean => {
  const now = new Date();
  return date.getTime() > now.getTime();
};

/**
 * Validates file attachments for size and type
 * @param files Array of file objects to validate
 * @returns boolean indicating if all files are valid
 */
const validateAttachments = (files: Express.Multer.File[]): boolean => {
  if (!files?.length) return true;
  
  return files.every(file => 
    file.size <= FILE_VALIDATION.MAX_FILE_SIZE && 
    FILE_VALIDATION.ALLOWED_FILE_TYPES.includes(
      file.originalname.split('.').pop()?.toUpperCase() || ''
    )
  );
};

/**
 * Middleware to validate task creation requests
 * Implements comprehensive validation and security checks
 */
export const validateCreateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Sanitize input data
    sanitize(req.body);

    // Transform plain object to DTO instance
    const taskDto = plainToClass(CreateTaskDto, req.body);

    // Validate DTO using class-validator
    const errors = await validate(taskDto, { 
      whitelist: true,
      forbidNonWhitelisted: true
    });

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Additional custom validations
    if (!isFutureDate(taskDto.dueDate)) {
      throw new ValidationError([{
        property: 'dueDate',
        constraints: { isFutureDate: 'Due date must be in the future' }
      }]);
    }

    // Validate title pattern
    if (!TASK_VALIDATION.TITLE_PATTERN.test(taskDto.title)) {
      throw new ValidationError([{
        property: 'title',
        constraints: { pattern: 'Title contains invalid characters' }
      }]);
    }

    // Validate file attachments if present
    if (req.files && !validateAttachments(req.files as Express.Multer.File[])) {
      throw new ValidationError([{
        property: 'attachments',
        constraints: { 
          fileValidation: 'Invalid file type or size'
        }
      }]);
    }

    // Store validated DTO in request for later use
    req.body = taskDto;
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors
      });
    } else {
      next(error);
    }
  }
};

/**
 * Middleware to validate task update requests
 * Supports partial updates with comprehensive validation
 */
export const validateUpdateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Sanitize input data
    sanitize(req.body);

    // Transform plain object to DTO instance
    const taskDto = plainToClass(UpdateTaskDto, req.body);

    // Validate DTO using class-validator
    const errors = await validate(taskDto, { 
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true
    });

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Additional custom validations for provided fields
    if (taskDto.dueDate && !isFutureDate(taskDto.dueDate)) {
      throw new ValidationError([{
        property: 'dueDate',
        constraints: { isFutureDate: 'Due date must be in the future' }
      }]);
    }

    if (taskDto.title && !TASK_VALIDATION.TITLE_PATTERN.test(taskDto.title)) {
      throw new ValidationError([{
        property: 'title',
        constraints: { pattern: 'Title contains invalid characters' }
      }]);
    }

    // Validate file attachments if present
    if (req.files && !validateAttachments(req.files as Express.Multer.File[])) {
      throw new ValidationError([{
        property: 'attachments',
        constraints: { 
          fileValidation: 'Invalid file type or size'
        }
      }]);
    }

    // Store validated DTO in request for later use
    req.body = taskDto;
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors
      });
    } else {
      next(error);
    }
  }
};

/**
 * Middleware to validate task ID parameters
 * Ensures UUID format and prevents injection
 */
export const validateTaskId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const taskId = req.params.id;

  if (!taskId || !isUUID(taskId)) {
    res.status(400).json({
      status: 'error',
      message: 'Invalid task ID format',
      errors: [{
        property: 'id',
        constraints: { isUuid: 'Task ID must be a valid UUID' }
      }]
    });
    return;
  }

  next();
};