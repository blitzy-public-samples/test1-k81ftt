/**
 * @fileoverview Enterprise-grade REST API controller for task management.
 * Implements comprehensive CRUD operations with caching, monitoring,
 * real-time updates, and security measures.
 * 
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express'; // ^4.18.0
import { injectable } from 'inversify'; // ^6.0.1
import { plainToClass } from 'class-transformer'; // ^0.5.1
import rateLimit from 'express-rate-limit'; // ^6.7.0
import sanitizeHtml from 'sanitize-html'; // ^2.10.0
import { EventBusService } from '@nestjs/event-emitter'; // ^1.0.0
import { CacheService } from '@nestjs/cache-manager'; // ^1.0.0
import { LoggerService } from '@nestjs/common'; // ^9.0.0

import { TaskService } from '../../core/services/TaskService';
import { ITask, TaskStatus, TaskPriority } from '../../interfaces/ITask';
import { QueryOptions, WriteOptions } from '../../core/interfaces/IService';
import { UUID, Pagination } from '../../types/common.types';
import { EventType } from '../../types/event.types';

@injectable()
export class TaskController {
  // Cache configuration
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'task:';

  // Rate limiting configuration
  private readonly rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
  });

  constructor(
    private readonly taskService: TaskService,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService
  ) {}

  /**
   * Retrieves a paginated list of tasks with caching and monitoring
   * @param req Express request object
   * @param res Express response object
   */
  public async getTasks(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Parse and validate query parameters
      const queryOptions: QueryOptions = this.parseQueryOptions(req);
      const cacheKey = this.generateCacheKey('list', queryOptions);

      // Check cache first
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug('Cache hit for tasks list', { requestId });
        res.json(cachedResult);
        return;
      }

      // Get tasks from service
      const result = await this.taskService.findAll(queryOptions);

      // Cache the result
      await this.cacheService.set(cacheKey, result, this.CACHE_TTL);

      // Log performance metrics
      const duration = Date.now() - startTime;
      this.logger.debug('Tasks retrieved', { 
        requestId, 
        duration,
        count: result.data.length 
      });

      res.json(result);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Creates a new task with validation and real-time updates
   * @param req Express request object
   * @param res Express response object
   */
  public async createTask(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Sanitize and validate input
      const sanitizedData = this.sanitizeTaskData(req.body);
      
      // Create task with real-time notification
      const task = await this.taskService.create(sanitizedData, {
        emitEvents: true
      });

      // Invalidate relevant caches
      await this.invalidateTaskCaches();

      // Emit real-time event
      await this.eventBus.emit(EventType.TASK_CREATED, { task });

      // Log success
      const duration = Date.now() - startTime;
      this.logger.info('Task created', { 
        requestId, 
        taskId: task.id,
        duration 
      });

      res.status(201).json(task);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Updates an existing task with optimistic locking
   * @param req Express request object
   * @param res Express response object
   */
  public async updateTask(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;
    const taskId = req.params.id as UUID;
    const version = parseInt(req.headers['if-match'] as string, 10);

    try {
      // Validate task ID and version
      if (!taskId || isNaN(version)) {
        res.status(400).json({ 
          error: 'Invalid task ID or version' 
        });
        return;
      }

      // Sanitize and validate update data
      const sanitizedData = this.sanitizeTaskData(req.body);

      // Update task with optimistic locking
      const task = await this.taskService.update(
        taskId,
        sanitizedData,
        version,
        { emitEvents: true }
      );

      // Invalidate caches
      await this.invalidateTaskCaches(taskId);

      // Emit real-time event
      await this.eventBus.emit(EventType.TASK_UPDATED, { 
        task,
        changes: sanitizedData
      });

      // Log success
      const duration = Date.now() - startTime;
      this.logger.info('Task updated', { 
        requestId, 
        taskId,
        version: task.version,
        duration 
      });

      res.json(task);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Deletes a task with proper cleanup and notifications
   * @param req Express request object
   * @param res Express response object
   */
  public async deleteTask(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;
    const taskId = req.params.id as UUID;

    try {
      // Delete task
      await this.taskService.delete(taskId, { emitEvents: true });

      // Invalidate caches
      await this.invalidateTaskCaches(taskId);

      // Emit real-time event
      await this.eventBus.emit(EventType.TASK_DELETED, { taskId });

      // Log success
      const duration = Date.now() - startTime;
      this.logger.info('Task deleted', { 
        requestId, 
        taskId,
        duration 
      });

      res.status(204).send();
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Parses and validates query options from request
   * @private
   */
  private parseQueryOptions(req: Request): QueryOptions {
    const { page = 1, limit = 10, sort, filter } = req.query;

    return {
      pagination: {
        page: Number(page),
        limit: Math.min(Number(limit), 100)
      },
      sort: sort ? JSON.parse(String(sort)) : undefined,
      filters: filter ? JSON.parse(String(filter)) : undefined,
      includes: req.query.includes?.toString().split(',')
    };
  }

  /**
   * Sanitizes task input data
   * @private
   */
  private sanitizeTaskData(data: any): Partial<ITask> {
    return {
      ...data,
      title: data.title ? sanitizeHtml(data.title) : undefined,
      description: data.description ? sanitizeHtml(data.description) : undefined
    };
  }

  /**
   * Generates cache key based on operation and parameters
   * @private
   */
  private generateCacheKey(operation: string, params?: any): string {
    const key = `${this.CACHE_PREFIX}${operation}`;
    return params ? `${key}:${JSON.stringify(params)}` : key;
  }

  /**
   * Invalidates task-related caches
   * @private
   */
  private async invalidateTaskCaches(taskId?: UUID): Promise<void> {
    const keys = await this.cacheService.store.keys(`${this.CACHE_PREFIX}*`);
    await Promise.all(keys.map(key => this.cacheService.del(key)));
  }

  /**
   * Handles and logs errors with proper response codes
   * @private
   */
  private handleError(error: any, req: Request, res: Response): void {
    const requestId = req.headers['x-request-id'] as string;

    this.logger.error('Task operation failed', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
    } else if (error.name === 'EntityNotFoundError') {
      res.status(404).json({ error: 'Task not found' });
    } else if (error.name === 'BusinessRuleError') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default TaskController;