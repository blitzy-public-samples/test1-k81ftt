/**
 * Request Type Definitions for Task Management System API
 * Version: 1.0.0
 * 
 * This module provides comprehensive type definitions for HTTP request payloads
 * and parameters used throughout the API endpoints. It ensures type safety and
 * validation for all incoming requests while maintaining strict security controls.
 */

import { UUID, Pagination, SortOrder } from '../types/common.types';
import { LoginCredentials, RegisterData } from '../types/auth.types';

/**
 * Enumeration for task status filtering
 */
export enum TaskStatus {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    REVIEW = 'REVIEW',
    DONE = 'DONE'
}

/**
 * Enumeration for task priority filtering
 */
export enum TaskPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

/**
 * Enumeration for project status filtering
 */
export enum ProjectStatus {
    ACTIVE = 'ACTIVE',
    ON_HOLD = 'ON_HOLD',
    COMPLETED = 'COMPLETED',
    ARCHIVED = 'ARCHIVED'
}

/**
 * Enumeration for search entity types
 */
export enum SearchEntityType {
    TASK = 'TASK',
    PROJECT = 'PROJECT',
    USER = 'USER',
    COMMENT = 'COMMENT'
}

/**
 * Base interface for paginated requests with sorting capabilities
 * Extends the Pagination interface to include sorting parameters
 */
export interface PaginatedRequest extends Pagination {
    /**
     * Field name to sort by
     */
    sortBy: string;

    /**
     * Sort direction (ASC or DESC)
     */
    sortOrder: SortOrder;
}

/**
 * Interface for task list request parameters
 * Provides comprehensive filtering options with pagination
 */
export interface TaskListRequest extends PaginatedRequest {
    /**
     * Optional project ID filter
     */
    projectId?: UUID;

    /**
     * Optional assignee ID filter
     */
    assigneeId?: UUID;

    /**
     * Optional task status filter
     */
    status?: TaskStatus;

    /**
     * Optional task priority filter
     */
    priority?: TaskPriority;
}

/**
 * Interface for project list request parameters
 * Enables filtering projects with pagination
 */
export interface ProjectListRequest extends PaginatedRequest {
    /**
     * Optional owner ID filter
     */
    ownerId?: UUID;

    /**
     * Optional project status filter
     */
    status?: ProjectStatus;
}

/**
 * Interface for global search request parameters
 * Supports entity-specific searching with pagination
 */
export interface SearchRequest extends PaginatedRequest {
    /**
     * Search query string
     * Minimum length: 3 characters
     */
    query: string;

    /**
     * Entity type to search within
     */
    type: SearchEntityType;
}

/**
 * Interface for task creation request
 */
export interface CreateTaskRequest {
    title: string;
    description?: string;
    projectId: UUID;
    assigneeId?: UUID;
    priority: TaskPriority;
    dueDate?: Date;
}

/**
 * Interface for task update request
 */
export interface UpdateTaskRequest {
    title?: string;
    description?: string;
    assigneeId?: UUID;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: Date;
}

/**
 * Interface for project creation request
 */
export interface CreateProjectRequest {
    name: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    ownerId: UUID;
}

/**
 * Interface for project update request
 */
export interface UpdateProjectRequest {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    startDate?: Date;
    endDate?: Date;
    ownerId?: UUID;
}

/**
 * Interface for comment creation request
 */
export interface CreateCommentRequest {
    taskId: UUID;
    content: string;
    attachments?: string[];
}

/**
 * Type guard for TaskStatus enum validation
 */
export function isTaskStatus(value: any): value is TaskStatus {
    return Object.values(TaskStatus).includes(value);
}

/**
 * Type guard for ProjectStatus enum validation
 */
export function isProjectStatus(value: any): value is ProjectStatus {
    return Object.values(ProjectStatus).includes(value);
}

/**
 * Type guard for TaskPriority enum validation
 */
export function isTaskPriority(value: any): value is TaskPriority {
    return Object.values(TaskPriority).includes(value);
}

/**
 * Type guard for SearchEntityType enum validation
 */
export function isSearchEntityType(value: any): value is SearchEntityType {
    return Object.values(SearchEntityType).includes(value);
}