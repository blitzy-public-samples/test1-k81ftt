// @ts-strict
import { BaseEntity, UUID } from '../types/common.types';

/**
 * Enumeration of possible task statuses with enhanced workflow states
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED'
}

/**
 * Enumeration of task priority levels for importance classification
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * Core interface defining the structure and relationships of task entities
 * Extends BaseEntity to inherit standard fields (id, createdAt, updatedAt)
 * Implements comprehensive task tracking with metadata support
 */
export interface ITask extends BaseEntity {
  /**
   * Unique identifier for the task
   */
  readonly id: UUID;

  /**
   * Task title - required field with business logic constraints
   * @minLength 3
   * @maxLength 100
   */
  title: string;

  /**
   * Detailed task description
   * @maxLength 2000
   */
  description: string | null;

  /**
   * Reference to the parent project
   */
  projectId: UUID;

  /**
   * Reference to the assigned user
   */
  assigneeId: UUID;

  /**
   * Reference to the task creator
   */
  creatorId: UUID;

  /**
   * Current task status
   */
  status: TaskStatus;

  /**
   * Task priority level
   */
  priority: TaskPriority;

  /**
   * Task due date - required for task scheduling
   */
  dueDate: Date;

  /**
   * Actual start date of the task
   */
  startDate: Date | null;

  /**
   * Timestamp when task was marked as completed
   */
  completedAt: Date | null;

  /**
   * Estimated hours to complete the task
   * @min 0
   */
  estimatedHours: number | null;

  /**
   * Array of task IDs that this task depends on
   */
  dependencies: UUID[];

  /**
   * Array of tags for task categorization and filtering
   */
  tags: string[];

  /**
   * Flexible metadata storage for additional task properties
   * Supports extensibility without schema changes
   */
  metadata: Record<string, any>;

  /**
   * Creation timestamp inherited from BaseEntity
   */
  readonly createdAt: Date;

  /**
   * Last update timestamp inherited from BaseEntity
   */
  readonly updatedAt: Date;
}