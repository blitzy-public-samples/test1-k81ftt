/**
 * @fileoverview Task-related TypeScript type definitions for the Task Management System
 * Provides comprehensive type safety and validation for task management features
 * @version 1.0.0
 */

import { ApiResponse, PaginatedResponse, Priority } from './common.types';

/**
 * Enum representing all possible task statuses in the system
 * Used for tracking task lifecycle and workflow states
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED'
}

/**
 * Comprehensive task interface representing a task entity
 * Contains all task-related properties with strict typing
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  
  /** Task title - required, user-visible identifier */
  title: string;
  
  /** Detailed task description with markdown support */
  description: string;
  
  /** Reference to the parent project */
  projectId: string;
  
  /** ID of the user assigned to the task */
  assigneeId: string;
  
  /** Current status of the task */
  status: TaskStatus;
  
  /** Task priority level */
  priority: Priority;
  
  /** Task due date */
  dueDate: Date;
  
  /** Date when task work began */
  startDate: Date;
  
  /** Date when task was marked as completed */
  completedAt: Date;
  
  /** Estimated hours to complete the task */
  estimatedHours: number;
  
  /** IDs of tasks that must be completed before this task */
  dependencies: string[];
  
  /** Array of tags for task categorization */
  tags: string[];
  
  /** Additional custom metadata for task tracking */
  metadata: Record<string, unknown>;
}

/**
 * Interface for task creation payload
 * Omits system-generated fields and enforces required properties
 */
export interface CreateTaskPayload {
  /** Task title - required */
  title: string;
  
  /** Task description - optional */
  description: string;
  
  /** Parent project ID - required */
  projectId: string;
  
  /** Assignee user ID - optional */
  assigneeId: string;
  
  /** Task priority - required */
  priority: Priority;
  
  /** Due date - required */
  dueDate: Date;
  
  /** Estimated hours - optional */
  estimatedHours: number;
  
  /** Task tags - optional */
  tags: string[];
  
  /** Additional metadata - optional */
  metadata: Record<string, unknown>;
}

/**
 * Interface for task update payload
 * All fields are optional except id, allowing partial updates
 */
export interface UpdateTaskPayload {
  /** Task ID to update - required */
  id: string;
  
  /** Updated title - optional */
  title: string;
  
  /** Updated description - optional */
  description: string;
  
  /** New assignee ID - optional */
  assigneeId: string;
  
  /** New status - optional */
  status: TaskStatus;
  
  /** New priority - optional */
  priority: Priority;
  
  /** New due date - optional */
  dueDate: Date;
  
  /** Updated hour estimate - optional */
  estimatedHours: number;
  
  /** Updated tags - optional */
  tags: string[];
  
  /** Updated metadata - optional */
  metadata: Record<string, unknown>;
}

/**
 * Interface defining available task filtering options
 * Used for task list queries and search operations
 */
export interface TaskFilters {
  /** Filter by project ID */
  projectId: string;
  
  /** Filter by assignee ID */
  assigneeId: string;
  
  /** Filter by task status */
  status: TaskStatus;
  
  /** Filter by priority level */
  priority: Priority;
  
  /** Filter by start date */
  startDate: Date;
  
  /** Filter by end date */
  endDate: Date;
  
  /** Filter by tags */
  tags: string[];
  
  /** Filter by custom metadata fields */
  metadata: Record<string, unknown>;
}

/**
 * Type alias for single task API response
 * Wraps Task type in standard API response structure
 */
export type TaskResponse = ApiResponse<Task>;

/**
 * Type alias for paginated task list API response
 * Wraps Task array in standard pagination structure
 */
export type TaskListResponse = PaginatedResponse<Task>;

// Type guard to check if an object is a valid Task
export function isTask(obj: unknown): obj is Task {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'status' in obj &&
    'priority' in obj
  );
}

// Type guard to check if a status is valid TaskStatus
export function isValidTaskStatus(status: string): status is TaskStatus {
  return Object.values(TaskStatus).includes(status as TaskStatus);
}