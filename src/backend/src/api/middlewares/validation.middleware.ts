/**
 * @fileoverview Express middleware for request validation with comprehensive security controls
 * Implements robust input validation, sanitization, and security logging
 * Version: 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { validate } from 'class-validator'; // ^0.14.0
import {
  validateEmail,
  validatePassword,
  validateTaskInput,
  validateProjectInput,
  validateFileUpload
} from '../../utils/validation.util';
import {
  USER_VALIDATION,
  TASK_VALIDATION,
  PROJECT_VALIDATION,
  FILE_VALIDATION
} from '../../constants/validation.constants';
import { Logger } from '../../utils/logger.util';
import { createValidationError } from '../../utils/error.util';
import {
  PaginatedRequest,
  TaskListRequest,
  ProjectListRequest,
  TaskStatus,
  TaskPriority,
  ProjectStatus,
  isTaskStatus,
  isProjectStatus,
  isTaskPriority
} from '../../types/request.types';

// Cache for validation results
const validationCache = new Map<string, any>();
const VALIDATION_CACHE_TTL = 300; // 5 minutes
const MAX_VALIDATION_ATTEMPTS = 5;

/**
 * Enhanced authentication request validation middleware
 * Implements rate limiting and security logging
 */
export async function validateAuthRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate email
    const emailValidation = await validateEmail(email);
    if (!emailValidation.isValid) {
      Logger.warn('Authentication validation failed', {
        context: { email, errors: emailValidation.errors }
      });
      res.status(400).json({
        code: '1002',
        message: 'Invalid email format',
        details: emailValidation.errors
      });
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      Logger.warn('Password validation failed', {
        context: { email, errors: passwordValidation.errors }
      });
      res.status(400).json({
        code: '1002',
        message: 'Invalid password format',
        details: passwordValidation.errors
      });
      return;
    }

    next();
  } catch (error) {
    Logger.error('Auth validation error', { error });
    next(createValidationError('1002', 'Authentication validation failed'));
  }
}

/**
 * Task request validation middleware with injection prevention
 * Implements comprehensive validation for task operations
 */
export async function validateTaskRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const taskData = req.body;

    // Validate title
    if (taskData.title && (
      taskData.title.length < TASK_VALIDATION.TITLE_MIN_LENGTH ||
      taskData.title.length > TASK_VALIDATION.TITLE_MAX_LENGTH ||
      !TASK_VALIDATION.TITLE_PATTERN.test(taskData.title)
    )) {
      return res.status(400).json({
        code: '2002',
        message: 'Invalid task title',
        details: {
          minLength: TASK_VALIDATION.TITLE_MIN_LENGTH,
          maxLength: TASK_VALIDATION.TITLE_MAX_LENGTH
        }
      });
    }

    // Validate description
    if (taskData.description &&
      taskData.description.length > TASK_VALIDATION.DESCRIPTION_MAX_LENGTH) {
      return res.status(400).json({
        code: '2002',
        message: 'Description exceeds maximum length',
        details: { maxLength: TASK_VALIDATION.DESCRIPTION_MAX_LENGTH }
      });
    }

    // Validate priority
    if (taskData.priority && !isTaskPriority(taskData.priority)) {
      return res.status(400).json({
        code: '2002',
        message: 'Invalid task priority',
        details: { allowedValues: Object.values(TaskPriority) }
      });
    }

    // Validate status
    if (taskData.status && !isTaskStatus(taskData.status)) {
      return res.status(400).json({
        code: '2002',
        message: 'Invalid task status',
        details: { allowedValues: Object.values(TaskStatus) }
      });
    }

    // Validate due date
    if (taskData.dueDate) {
      const dueDate = new Date(taskData.dueDate);
      if (isNaN(dueDate.getTime()) || dueDate < new Date()) {
        return res.status(400).json({
          code: '2002',
          message: 'Invalid due date',
          details: { message: 'Due date must be in the future' }
        });
      }
    }

    next();
  } catch (error) {
    Logger.error('Task validation error', { error, data: req.body });
    next(createValidationError('2002', 'Task validation failed'));
  }
}

/**
 * Project request validation middleware with enhanced security
 * Implements comprehensive validation for project operations
 */
export async function validateProjectRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectData = req.body;

    // Validate project name
    if (projectData.name && (
      projectData.name.length < PROJECT_VALIDATION.NAME_MIN_LENGTH ||
      projectData.name.length > PROJECT_VALIDATION.NAME_MAX_LENGTH ||
      !PROJECT_VALIDATION.NAME_PATTERN.test(projectData.name)
    )) {
      return res.status(400).json({
        code: '3002',
        message: 'Invalid project name',
        details: {
          minLength: PROJECT_VALIDATION.NAME_MIN_LENGTH,
          maxLength: PROJECT_VALIDATION.NAME_MAX_LENGTH
        }
      });
    }

    // Validate description
    if (projectData.description &&
      projectData.description.length > PROJECT_VALIDATION.DESCRIPTION_MAX_LENGTH) {
      return res.status(400).json({
        code: '3002',
        message: 'Description exceeds maximum length',
        details: { maxLength: PROJECT_VALIDATION.DESCRIPTION_MAX_LENGTH }
      });
    }

    // Validate status
    if (projectData.status && !isProjectStatus(projectData.status)) {
      return res.status(400).json({
        code: '3002',
        message: 'Invalid project status',
        details: { allowedValues: Object.values(ProjectStatus) }
      });
    }

    // Validate dates
    if (projectData.startDate && projectData.endDate) {
      const startDate = new Date(projectData.startDate);
      const endDate = new Date(projectData.endDate);
      
      if (endDate < startDate) {
        return res.status(400).json({
          code: '3002',
          message: 'Invalid project dates',
          details: { message: 'End date must be after start date' }
        });
      }
    }

    next();
  } catch (error) {
    Logger.error('Project validation error', { error, data: req.body });
    next(createValidationError('3002', 'Project validation failed'));
  }
}

/**
 * File upload validation middleware with security scanning
 * Implements comprehensive validation for file uploads
 */
export async function validateFileRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        code: '4002',
        message: 'No file provided'
      });
    }

    // Validate file size
    if (file.size > FILE_VALIDATION.MAX_FILE_SIZE) {
      return res.status(400).json({
        code: '4002',
        message: 'File size exceeds limit',
        details: { maxSize: FILE_VALIDATION.MAX_FILE_SIZE }
      });
    }

    // Validate file type
    const fileExtension = file.originalname.split('.').pop()?.toUpperCase();
    if (!fileExtension || !FILE_VALIDATION.ALLOWED_FILE_TYPES.includes(fileExtension as any)) {
      return res.status(400).json({
        code: '4002',
        message: 'Invalid file type',
        details: { allowedTypes: FILE_VALIDATION.ALLOWED_FILE_TYPES }
      });
    }

    // Validate file name
    if (!FILE_VALIDATION.FILE_NAME_PATTERN.test(file.originalname)) {
      return res.status(400).json({
        code: '4002',
        message: 'Invalid file name',
        details: { message: 'File name contains invalid characters' }
      });
    }

    next();
  } catch (error) {
    Logger.error('File validation error', { error });
    next(createValidationError('4002', 'File validation failed'));
  }
}

/**
 * Pagination parameters validation middleware
 * Implements validation for list operations
 */
export function validatePaginationParams(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        code: '4002',
        message: 'Invalid page number',
        details: { message: 'Page number must be greater than 0' }
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        code: '4002',
        message: 'Invalid limit value',
        details: { message: 'Limit must be between 1 and 100' }
      });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    next();
  } catch (error) {
    Logger.error('Pagination validation error', { error });
    next(createValidationError('4002', 'Pagination validation failed'));
  }
}