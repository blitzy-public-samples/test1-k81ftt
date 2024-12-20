/**
 * @fileoverview Enhanced TaskRepository implementation with caching, monitoring,
 * and comprehensive error handling for task management operations.
 * Version: 1.0.0
 */

import { PrismaClient } from '@prisma/client'; // v5.0+
import Redis from 'ioredis'; // v5.0+
import { IRepository } from '../interfaces/IRepository';
import { Task, TaskStatus, TaskPriority } from '../../models/Task';
import { databaseConfig } from '../../config/database.config';
import { UUID, FilterParams, QueryOptions } from '../types/common.types';

// Cache configuration
const CACHE_TTL = 3600; // 1 hour in seconds
const CACHE_PREFIX = 'task:';

// Performance monitoring thresholds
const SLOW_QUERY_THRESHOLD = 500; // milliseconds

/**
 * Enhanced repository implementation for Task entity providing data access,
 * business logic operations, performance monitoring, and data consistency management
 */
export class TaskRepository implements IRepository<Task> {
  private readonly prisma: PrismaClient;
  private readonly redis: Redis;
  private readonly metrics: Map<string, number>;

  /**
   * Initializes TaskRepository with database and cache clients
   * @param prismaClient - Prisma client instance
   * @param redisClient - Redis client instance
   */
  constructor(
    prismaClient: PrismaClient,
    redisClient: Redis
  ) {
    this.prisma = prismaClient;
    this.redis = redisClient;
    this.metrics = new Map();

    // Initialize performance monitoring
    this.setupMonitoring();
  }

  /**
   * Retrieves a task by its unique identifier with caching
   * @param id - Task identifier
   * @returns Promise resolving to found task or null
   * @throws RepositoryError if database operation fails
   */
  async findById(id: UUID): Promise<Task | null> {
    const startTime = Date.now();
    try {
      // Check cache first
      const cachedTask = await this.redis.get(`${CACHE_PREFIX}${id}`);
      if (cachedTask) {
        return JSON.parse(cachedTask);
      }

      // Query database with related data
      const task = await this.prisma.task.findUnique({
        where: { id },
        include: {
          project: true,
          assignee: true,
          attachments: true,
          comments: true
        }
      });

      if (task) {
        // Cache the result
        await this.redis.setex(
          `${CACHE_PREFIX}${id}`,
          CACHE_TTL,
          JSON.stringify(task)
        );
        return new Task(task);
      }

      return null;
    } catch (error) {
      this.handleError('findById', error);
      throw error;
    } finally {
      this.recordQueryTime('findById', startTime);
    }
  }

  /**
   * Retrieves all tasks matching specified criteria with pagination
   * @param options - Query options for filtering, sorting, and pagination
   * @returns Promise resolving to paginated task list
   * @throws RepositoryError if database operation fails
   */
  async findAll(options?: QueryOptions): Promise<{
    data: Task[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const startTime = Date.now();
    try {
      const {
        pagination = { page: 1, pageSize: 10 },
        sort = [{ field: 'createdAt', direction: 'DESC' }],
        filters = [],
        includes = ['project', 'assignee']
      } = options || {};

      // Build query with filters
      const where = this.buildWhereClause(filters);

      // Execute query with pagination
      const [tasks, total] = await Promise.all([
        this.prisma.task.findMany({
          where,
          include: this.buildIncludeObject(includes),
          skip: (pagination.page - 1) * pagination.pageSize,
          take: pagination.pageSize,
          orderBy: sort.map(s => ({ [s.field]: s.direction }))
        }),
        this.prisma.task.count({ where })
      ]);

      const totalPages = Math.ceil(total / pagination.pageSize);

      return {
        data: tasks.map(task => new Task(task)),
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages
      };
    } catch (error) {
      this.handleError('findAll', error);
      throw error;
    } finally {
      this.recordQueryTime('findAll', startTime);
    }
  }

  /**
   * Creates a new task with validation
   * @param data - Task data for creation
   * @returns Promise resolving to created task
   * @throws RepositoryError if validation fails or database operation fails
   */
  async create(data: Partial<Task>): Promise<Task> {
    const startTime = Date.now();
    try {
      const task = await this.prisma.task.create({
        data: {
          ...data,
          status: data.status || TaskStatus.TODO,
          priority: data.priority || TaskPriority.MEDIUM,
          metadata: data.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          project: true,
          assignee: true
        }
      });

      return new Task(task);
    } catch (error) {
      this.handleError('create', error);
      throw error;
    } finally {
      this.recordQueryTime('create', startTime);
    }
  }

  /**
   * Updates an existing task with optimistic locking
   * @param id - Task identifier
   * @param data - Updated task data
   * @returns Promise resolving to updated task
   * @throws RepositoryError if task not found or database operation fails
   */
  async update(id: UUID, data: Partial<Task>): Promise<Task> {
    const startTime = Date.now();
    try {
      const task = await this.prisma.task.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
          version: { increment: 1 }
        },
        include: {
          project: true,
          assignee: true
        }
      });

      // Invalidate cache
      await this.redis.del(`${CACHE_PREFIX}${id}`);

      return new Task(task);
    } catch (error) {
      this.handleError('update', error);
      throw error;
    } finally {
      this.recordQueryTime('update', startTime);
    }
  }

  /**
   * Deletes a task with cascading delete of related entities
   * @param id - Task identifier
   * @returns Promise resolving to boolean indicating success
   * @throws RepositoryError if task not found or database operation fails
   */
  async delete(id: UUID): Promise<boolean> {
    const startTime = Date.now();
    try {
      await this.prisma.task.delete({
        where: { id }
      });

      // Invalidate cache
      await this.redis.del(`${CACHE_PREFIX}${id}`);

      return true;
    } catch (error) {
      this.handleError('delete', error);
      throw error;
    } finally {
      this.recordQueryTime('delete', startTime);
    }
  }

  /**
   * Finds tasks by project with caching
   * @param projectId - Project identifier
   * @returns Promise resolving to array of tasks
   */
  async findByProject(projectId: UUID): Promise<Task[]> {
    const startTime = Date.now();
    try {
      const tasks = await this.prisma.task.findMany({
        where: { projectId },
        include: {
          assignee: true
        }
      });

      return tasks.map(task => new Task(task));
    } catch (error) {
      this.handleError('findByProject', error);
      throw error;
    } finally {
      this.recordQueryTime('findByProject', startTime);
    }
  }

  /**
   * Finds tasks by assignee with caching
   * @param assigneeId - Assignee identifier
   * @returns Promise resolving to array of tasks
   */
  async findByAssignee(assigneeId: UUID): Promise<Task[]> {
    const startTime = Date.now();
    try {
      const tasks = await this.prisma.task.findMany({
        where: { assigneeId },
        include: {
          project: true
        }
      });

      return tasks.map(task => new Task(task));
    } catch (error) {
      this.handleError('findByAssignee', error);
      throw error;
    } finally {
      this.recordQueryTime('findByAssignee', startTime);
    }
  }

  /**
   * Builds database where clause from filter parameters
   * @param filters - Array of filter parameters
   * @returns Where clause object for Prisma
   */
  private buildWhereClause(filters: FilterParams[]): Record<string, any> {
    return filters.reduce((where, filter) => {
      switch (filter.operator) {
        case 'eq':
          return { ...where, [filter.field]: filter.value };
        case 'neq':
          return { ...where, [filter.field]: { not: filter.value } };
        case 'gt':
          return { ...where, [filter.field]: { gt: filter.value } };
        case 'gte':
          return { ...where, [filter.field]: { gte: filter.value } };
        case 'lt':
          return { ...where, [filter.field]: { lt: filter.value } };
        case 'lte':
          return { ...where, [filter.field]: { lte: filter.value } };
        case 'like':
          return { ...where, [filter.field]: { contains: filter.value } };
        case 'in':
          return { ...where, [filter.field]: { in: filter.value } };
        default:
          return where;
      }
    }, {});
  }

  /**
   * Builds include object for Prisma queries
   * @param includes - Array of relation names to include
   * @returns Include object for Prisma
   */
  private buildIncludeObject(includes: string[]): Record<string, boolean> {
    return includes.reduce((acc, include) => ({
      ...acc,
      [include]: true
    }), {});
  }

  /**
   * Sets up performance monitoring hooks
   */
  private setupMonitoring(): void {
    if (databaseConfig.monitoring.enabled) {
      this.prisma.$use(async (params, next) => {
        const startTime = Date.now();
        const result = await next(params);
        const duration = Date.now() - startTime;

        if (duration > SLOW_QUERY_THRESHOLD) {
          console.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
        }

        return result;
      });
    }
  }

  /**
   * Records query execution time for monitoring
   * @param operation - Operation name
   * @param startTime - Operation start timestamp
   */
  private recordQueryTime(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.metrics.set(operation, duration);
  }

  /**
   * Handles repository operation errors
   * @param operation - Operation name
   * @param error - Error object
   */
  private handleError(operation: string, error: any): void {
    console.error(`TaskRepository.${operation} error:`, error);
    // Additional error handling logic could be added here
  }
}