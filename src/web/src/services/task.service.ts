/**
 * @fileoverview Task Service Implementation for Task Management System
 * @version 1.0.0
 * 
 * Provides comprehensive task management functionality with enterprise-grade
 * features including error handling, performance monitoring, and type safety.
 */

import axios from 'axios'; // ^1.6.0
import { httpService } from './http.service';
import { handleApiError } from '../utils/error.utils';
import { 
  Task, 
  TaskStatus, 
  CreateTaskPayload, 
  UpdateTaskPayload,
  TaskFilters,
  TaskResponse,
  TaskListResponse 
} from '../types/task.types';
import { API_ENDPOINTS, API_TIMEOUTS } from '../constants/api.constants';
import { CircuitBreaker } from '../utils/circuit-breaker';

/**
 * Task Service class providing comprehensive task management functionality
 * with enterprise-grade features and error handling
 */
class TaskService {
  private readonly baseUrl: string = API_ENDPOINTS.TASKS.BASE;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly defaultTimeout: number = API_TIMEOUTS.DEFAULT;

  constructor(circuitBreaker: CircuitBreaker) {
    this.circuitBreaker = circuitBreaker;
  }

  /**
   * Retrieves a paginated list of tasks with filtering options
   * @param page - Page number (1-based)
   * @param limit - Number of items per page
   * @param filters - Optional task filtering criteria
   * @returns Promise resolving to paginated task list
   */
  public async getTasks(
    page: number = 1,
    limit: number = 10,
    filters?: TaskFilters
  ): Promise<TaskListResponse> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...this.formatFilters(filters)
      });

      const response = await httpService.get<TaskListResponse>(
        `${this.baseUrl}?${queryParams.toString()}`
      );

      return response;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Retrieves a specific task by ID
   * @param taskId - Unique task identifier
   * @returns Promise resolving to task details
   */
  public async getTaskById(taskId: string): Promise<TaskResponse> {
    try {
      const response = await httpService.get<TaskResponse>(
        `${this.baseUrl}/${taskId}`
      );

      return response;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Creates a new task with validation
   * @param taskData - Task creation payload
   * @returns Promise resolving to created task
   */
  public async createTask(taskData: CreateTaskPayload): Promise<TaskResponse> {
    try {
      this.validateTaskPayload(taskData);

      const response = await httpService.post<TaskResponse>(
        this.baseUrl,
        taskData
      );

      return response;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Updates an existing task
   * @param taskId - Task identifier
   * @param updateData - Task update payload
   * @returns Promise resolving to updated task
   */
  public async updateTask(
    taskId: string,
    updateData: UpdateTaskPayload
  ): Promise<TaskResponse> {
    try {
      this.validateTaskPayload(updateData);

      const response = await httpService.put<TaskResponse>(
        `${this.baseUrl}/${taskId}`,
        updateData
      );

      return response;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Deletes a task by ID
   * @param taskId - Task identifier
   * @returns Promise resolving to success status
   */
  public async deleteTask(taskId: string): Promise<boolean> {
    try {
      await httpService.delete<void>(`${this.baseUrl}/${taskId}`);
      return true;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Updates task status with validation
   * @param taskId - Task identifier
   * @param status - New task status
   * @returns Promise resolving to updated task
   */
  public async updateTaskStatus(
    taskId: string,
    status: TaskStatus
  ): Promise<TaskResponse> {
    try {
      const response = await httpService.put<TaskResponse>(
        `${this.baseUrl}/${taskId}/status`,
        { status }
      );

      return response;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Assigns a task to a user
   * @param taskId - Task identifier
   * @param assigneeId - User identifier
   * @returns Promise resolving to updated task
   */
  public async assignTask(
    taskId: string,
    assigneeId: string
  ): Promise<TaskResponse> {
    try {
      const response = await httpService.put<TaskResponse>(
        `${this.baseUrl}/${taskId}/assign`,
        { assigneeId }
      );

      return response;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Performs bulk task update operation
   * @param taskIds - Array of task identifiers
   * @param updateData - Common update payload for all tasks
   * @returns Promise resolving to update status
   */
  public async bulkUpdateTasks(
    taskIds: string[],
    updateData: Partial<UpdateTaskPayload>
  ): Promise<boolean> {
    try {
      await httpService.put(
        `${this.baseUrl}/bulk`,
        {
          taskIds,
          updateData
        }
      );
      return true;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Formats task filters into query parameters
   * @param filters - Task filtering criteria
   * @returns Formatted query parameters
   */
  private formatFilters(filters?: TaskFilters): Record<string, string> {
    if (!filters) return {};

    const formattedFilters: Record<string, string> = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          formattedFilters[key] = value.toISOString();
        } else if (Array.isArray(value)) {
          formattedFilters[key] = value.join(',');
        } else if (typeof value === 'object') {
          formattedFilters[key] = JSON.stringify(value);
        } else {
          formattedFilters[key] = value.toString();
        }
      }
    });

    return formattedFilters;
  }

  /**
   * Validates task payload before submission
   * @param payload - Task creation or update payload
   * @throws Error if validation fails
   */
  private validateTaskPayload(
    payload: CreateTaskPayload | UpdateTaskPayload
  ): void {
    if ('title' in payload && (!payload.title || payload.title.length > 100)) {
      throw new Error('Invalid task title');
    }

    if ('description' in payload && payload.description?.length > 2000) {
      throw new Error('Description exceeds maximum length');
    }

    if ('dueDate' in payload && payload.dueDate) {
      const dueDate = new Date(payload.dueDate);
      if (dueDate < new Date()) {
        throw new Error('Due date must be in the future');
      }
    }

    if ('estimatedHours' in payload && payload.estimatedHours !== undefined) {
      if (payload.estimatedHours < 0 || payload.estimatedHours > 1000) {
        throw new Error('Invalid estimated hours');
      }
    }
  }
}

// Export singleton instance
export const taskService = new TaskService(
  new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000
  })
);