/**
 * @fileoverview Core service implementation for task management functionality.
 * Provides comprehensive business logic for task operations with robust validation,
 * real-time updates, caching, and performance optimization.
 * 
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify'; // v6.0.1
import { plainToClass } from 'class-transformer'; // v0.5.1
import { Logger } from 'winston'; // v3.8.2
import { Cache } from 'cache-manager'; // v5.0.0

import { IService, QueryOptions, WriteOptions } from '../interfaces/IService';
import { ITask, TaskStatus, TaskPriority } from '../../interfaces/ITask';
import { EventBus } from '../events/EventBus';
import { EventType } from '../../types/event.types';
import { UUID, isUUID } from '../../types/common.types';
import { IRepository } from '../interfaces/IRepository';
import { CreateTaskDto, UpdateTaskDto, TaskResponseDto } from '../../dtos/task.dto';
import { ValidationError, EntityNotFoundError, BusinessRuleError } from '../../utils/errors';

/**
 * Enhanced service class implementing task management business logic with caching,
 * monitoring, and real-time updates.
 */
@injectable()
export class TaskService implements IService<ITask, CreateTaskDto, UpdateTaskDto> {
  // Cache keys
  private readonly CACHE_PREFIX = 'task:';
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_RETRIES = 3;

  constructor(
    @inject('IRepository<ITask>') private readonly taskRepository: IRepository<ITask>,
    @inject('EventBus') private readonly eventBus: EventBus,
    @inject('Cache') private readonly cache: Cache,
    @inject('Logger') private readonly logger: Logger
  ) {}

  /**
   * Retrieves a task by ID with caching and performance monitoring
   * @param id Task unique identifier
   * @param includes Optional relations to include
   * @throws EntityNotFoundError if task doesn't exist
   */
  public async findById(id: UUID, includes?: string[]): Promise<TaskResponseDto> {
    const startTime = Date.now();
    const cacheKey = `${this.CACHE_PREFIX}${id}`;

    try {
      // Check cache first
      const cachedTask = await this.cache.get<ITask>(cacheKey);
      if (cachedTask) {
        this.logger.debug('Cache hit for task', { id });
        return plainToClass(TaskResponseDto, cachedTask);
      }

      // Get from repository
      const task = await this.taskRepository.findById(id, includes);
      if (!task) {
        throw new EntityNotFoundError('Task not found', { id });
      }

      // Cache the result
      await this.cache.set(cacheKey, task, this.CACHE_TTL);
      
      const duration = Date.now() - startTime;
      this.logger.debug('Task retrieved', { id, duration });
      
      return plainToClass(TaskResponseDto, task);
    } catch (error) {
      this.logger.error('Error retrieving task', { id, error });
      throw error;
    }
  }

  /**
   * Creates a new task with validation, events, and monitoring
   * @param data Task creation data
   * @param options Optional write operation settings
   * @throws ValidationError if data is invalid
   */
  public async create(data: CreateTaskDto, options?: WriteOptions): Promise<TaskResponseDto> {
    const startTime = Date.now();

    try {
      // Validate input data
      await this.validate(data, 'create');

      // Create task
      const task = await this.taskRepository.create({
        ...data,
        status: TaskStatus.TODO,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      });

      // Cache the new task
      const cacheKey = `${this.CACHE_PREFIX}${task.id}`;
      await this.cache.set(cacheKey, task, this.CACHE_TTL);

      // Publish event
      if (options?.emitEvents !== false) {
        await this.eventBus.publish(EventType.TASK_CREATED, { task });
      }

      const duration = Date.now() - startTime;
      this.logger.info('Task created', { id: task.id, duration });

      return plainToClass(TaskResponseDto, task);
    } catch (error) {
      this.logger.error('Error creating task', { error });
      throw error;
    }
  }

  /**
   * Updates task with validation, cache management, and events
   * @param id Task unique identifier
   * @param data Update data
   * @param version Entity version for optimistic locking
   * @throws EntityNotFoundError if task doesn't exist
   * @throws ValidationError if data is invalid
   */
  public async update(
    id: UUID, 
    data: UpdateTaskDto, 
    version: number,
    options?: WriteOptions
  ): Promise<TaskResponseDto> {
    const startTime = Date.now();

    try {
      // Validate task exists
      const existingTask = await this.taskRepository.findById(id);
      if (!existingTask) {
        throw new EntityNotFoundError('Task not found', { id });
      }

      // Validate version
      if (existingTask.version !== version) {
        throw new BusinessRuleError('Task version mismatch', { 
          expected: version, 
          actual: existingTask.version 
        });
      }

      // Validate update data
      await this.validate(data, 'update');

      // Update task
      const updatedTask = await this.taskRepository.update(id, {
        ...data,
        updatedAt: new Date(),
        version: version + 1
      });

      // Invalidate cache
      const cacheKey = `${this.CACHE_PREFIX}${id}`;
      await this.cache.del(cacheKey);

      // Publish event
      if (options?.emitEvents !== false) {
        await this.eventBus.publish(EventType.TASK_UPDATED, { 
          task: updatedTask,
          changes: data
        });
      }

      const duration = Date.now() - startTime;
      this.logger.info('Task updated', { id, duration });

      return plainToClass(TaskResponseDto, updatedTask);
    } catch (error) {
      this.logger.error('Error updating task', { id, error });
      throw error;
    }
  }

  /**
   * Validates task data against business rules
   * @param data Data to validate
   * @param operation Operation type for context-specific validation
   * @throws ValidationError with detailed error messages
   */
  public async validate(
    data: CreateTaskDto | UpdateTaskDto,
    operation: 'create' | 'update'
  ): Promise<void> {
    const errors: string[] = [];

    // Title validation
    if ('title' in data) {
      if (!data.title?.trim()) {
        errors.push('Title is required');
      } else if (data.title.length < 3 || data.title.length > 100) {
        errors.push('Title must be between 3 and 100 characters');
      }
    }

    // Description validation
    if ('description' in data && data.description?.length > 2000) {
      errors.push('Description cannot exceed 2000 characters');
    }

    // Due date validation
    if ('dueDate' in data) {
      const dueDate = new Date(data.dueDate);
      if (isNaN(dueDate.getTime())) {
        errors.push('Invalid due date');
      } else if (dueDate < new Date()) {
        errors.push('Due date cannot be in the past');
      }
    }

    // Priority validation
    if ('priority' in data && !Object.values(TaskPriority).includes(data.priority)) {
      errors.push('Invalid priority value');
    }

    // Project ID validation
    if ('projectId' in data && !isUUID(data.projectId)) {
      errors.push('Invalid project ID');
    }

    // Assignee ID validation
    if ('assigneeId' in data && !isUUID(data.assigneeId)) {
      errors.push('Invalid assignee ID');
    }

    if (errors.length > 0) {
      throw new ValidationError('Task validation failed', errors);
    }
  }

  /**
   * Retrieves all tasks with support for pagination, sorting, and filtering
   * @param options Query options for pagination, sorting, filtering and relations
   */
  public async findAll(options?: QueryOptions): Promise<{
    data: TaskResponseDto[];
    total: number;
    hasMore: boolean;
  }> {
    const startTime = Date.now();

    try {
      const { data, total } = await this.taskRepository.findAll(options);
      
      const hasMore = options?.pagination 
        ? total > (options.pagination.page * options.pagination.limit)
        : false;

      const duration = Date.now() - startTime;
      this.logger.debug('Tasks retrieved', { count: data.length, duration });

      return {
        data: data.map(task => plainToClass(TaskResponseDto, task)),
        total,
        hasMore
      };
    } catch (error) {
      this.logger.error('Error retrieving tasks', { error });
      throw error;
    }
  }

  /**
   * Permanently deletes a task
   * @param id Task unique identifier
   * @param options Optional write operation settings
   * @throws EntityNotFoundError if task doesn't exist
   */
  public async delete(id: UUID, options?: WriteOptions): Promise<boolean> {
    try {
      const task = await this.taskRepository.findById(id);
      if (!task) {
        throw new EntityNotFoundError('Task not found', { id });
      }

      await this.taskRepository.delete(id);

      // Invalidate cache
      const cacheKey = `${this.CACHE_PREFIX}${id}`;
      await this.cache.del(cacheKey);

      // Publish event
      if (options?.emitEvents !== false) {
        await this.eventBus.publish(EventType.TASK_DELETED, { id });
      }

      this.logger.info('Task deleted', { id });
      return true;
    } catch (error) {
      this.logger.error('Error deleting task', { id, error });
      throw error;
    }
  }
}