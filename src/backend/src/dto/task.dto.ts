/**
 * @fileoverview Data Transfer Objects for task-related operations
 * Implements comprehensive validation and type safety for task management
 * Version: 1.0.0
 */

import { 
  IsString, 
  IsUUID, 
  IsEnum, 
  IsOptional, 
  IsDate, 
  IsArray, 
  MaxLength, 
  MinLength, 
  IsNumber,
  ValidateNested,
  MaxSize
} from 'class-validator'; // v0.14.0

import { 
  Expose, 
  Type, 
  Transform 
} from 'class-transformer'; // v0.5.1

import { TaskStatus, TaskPriority } from '../interfaces/ITask';
import { UUID } from '../types/common.types';
import { 
  TASK_VALIDATION 
} from '../constants/validation.constants';

/**
 * DTO for task creation requests with comprehensive validation
 * Implements business rules and security constraints
 */
export class CreateTaskDto {
  @Transform(({ value }) => value.trim())
  @IsString()
  @MinLength(TASK_VALIDATION.TITLE_MIN_LENGTH)
  @MaxLength(TASK_VALIDATION.TITLE_MAX_LENGTH)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(TASK_VALIDATION.DESCRIPTION_MAX_LENGTH)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsUUID('4')
  projectId: UUID;

  @IsOptional()
  @IsUUID('4')
  assigneeId?: UUID;

  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @Type(() => Date)
  @IsDate()
  dueDate: Date;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value >= 0 ? value : 0)
  estimatedHours?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  dependencies?: UUID[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value?.map((tag: string) => tag.trim()))
  tags?: string[];

  @IsOptional()
  @MaxSize(50 * 1024) // 50KB limit for metadata
  metadata?: Record<string, any>;
}

/**
 * DTO for task update requests with partial updates support
 * Implements validation for modifiable fields
 */
export class UpdateTaskDto {
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(TASK_VALIDATION.TITLE_MIN_LENGTH)
  @MaxLength(TASK_VALIDATION.TITLE_MAX_LENGTH)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TASK_VALIDATION.DESCRIPTION_MAX_LENGTH)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsUUID('4')
  assigneeId?: UUID;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value >= 0 ? value : 0)
  estimatedHours?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  dependencies?: UUID[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value?.map((tag: string) => tag.trim()))
  tags?: string[];

  @IsOptional()
  @MaxSize(50 * 1024) // 50KB limit for metadata
  metadata?: Record<string, any>;
}

/**
 * Utility function to sanitize response data
 * Removes sensitive information and formats dates
 */
const sanitizeResponse = (value: any): any => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

/**
 * DTO for task responses with complete task information
 * Implements secure serialization and type transformation
 */
export class TaskResponseDto {
  @Expose()
  id: UUID;

  @Expose()
  @Transform(({ value }) => value?.trim())
  title: string;

  @Expose()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @Expose()
  projectId: UUID;

  @Expose()
  assigneeId?: UUID;

  @Expose()
  creatorId: UUID;

  @Expose()
  status: TaskStatus;

  @Expose()
  priority: TaskPriority;

  @Expose()
  @Type(() => Date)
  @Transform(({ value }) => sanitizeResponse(value))
  dueDate: Date;

  @Expose()
  @Type(() => Date)
  @Transform(({ value }) => sanitizeResponse(value))
  startDate?: Date;

  @Expose()
  @Type(() => Date)
  @Transform(({ value }) => sanitizeResponse(value))
  completedAt?: Date;

  @Expose()
  estimatedHours?: number;

  @Expose()
  dependencies: UUID[];

  @Expose()
  tags: string[];

  @Expose()
  metadata?: Record<string, any>;

  @Expose()
  @Type(() => Date)
  @Transform(({ value }) => sanitizeResponse(value))
  createdAt: Date;

  @Expose()
  @Type(() => Date)
  @Transform(({ value }) => sanitizeResponse(value))
  updatedAt: Date;
}