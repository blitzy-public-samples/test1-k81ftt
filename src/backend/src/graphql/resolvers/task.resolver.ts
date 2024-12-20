/**
 * @fileoverview GraphQL resolver implementation for task-related operations.
 * Provides comprehensive task management functionality with real-time updates,
 * optimized performance through DataLoader, and robust error handling.
 * 
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // v6.0.1
import { PubSub } from 'graphql-subscriptions'; // v2.0.1
import { IResolvers } from '@graphql-tools/utils'; // v9.0.0
import DataLoader from 'dataloader'; // v2.2.0
import { Logger } from 'winston'; // v3.8.0
import { GraphQLError } from 'graphql'; // v16.0.0

import { TaskService } from '../../core/services/TaskService';
import { ITask, TaskStatus, TaskPriority } from '../../interfaces/ITask';
import { EventBus } from '../../core/events/EventBus';
import { EventType } from '../../types/event.types';
import { UUID, Pagination } from '../../types/common.types';

// Subscription topics
const TASK_UPDATED_TOPIC = 'TASK_UPDATED';
const TASK_CREATED_TOPIC = 'TASK_CREATED';
const TASK_DELETED_TOPIC = 'TASK_DELETED';

/**
 * GraphQL resolver implementation for task-related operations.
 * Implements comprehensive task management with performance optimization and security.
 */
@injectable()
export class TaskResolver implements IResolvers {
  private readonly pubsub: PubSub;
  private readonly taskLoader: DataLoader<UUID, ITask>;
  private readonly subscriptions: Set<string>;

  constructor(
    private readonly taskService: TaskService,
    private readonly eventBus: EventBus,
    private readonly logger: Logger
  ) {
    this.pubsub = new PubSub();
    this.subscriptions = new Set();
    
    // Initialize DataLoader for batching task queries
    this.taskLoader = new DataLoader<UUID, ITask>(
      async (ids: readonly UUID[]) => {
        try {
          const tasks = await this.taskService.findByIds(Array.from(ids));
          return ids.map(id => tasks.find(task => task.id === id) || new Error(`Task not found: ${id}`));
        } catch (error) {
          this.logger.error('DataLoader error', { error });
          throw new GraphQLError('Failed to load tasks', {
            extensions: { code: 'DATALOADER_ERROR' }
          });
        }
      },
      { cache: true, maxBatchSize: 100 }
    );

    // Subscribe to task events
    this.initializeEventSubscriptions();
  }

  /**
   * Query resolver for retrieving tasks with filtering, pagination, and sorting
   */
  async tasks(
    parent: unknown,
    args: {
      filter?: {
        status?: TaskStatus[];
        priority?: TaskPriority[];
        assigneeId?: UUID;
        projectId?: UUID;
      };
      pagination?: {
        page: number;
        limit: number;
      };
      sort?: {
        field: string;
        order: 'ASC' | 'DESC';
      }[];
    },
    context: { userId: UUID }
  ): Promise<{ data: ITask[]; pagination: Pagination }> {
    try {
      this.validateContext(context);

      const { data, total, hasMore } = await this.taskService.findAll({
        filters: this.buildFilters(args.filter),
        pagination: args.pagination,
        sort: args.sort
      });

      return {
        data,
        pagination: new Pagination(
          args.pagination?.page || 1,
          args.pagination?.limit || 10,
          total
        )
      };
    } catch (error) {
      this.handleError('Failed to fetch tasks', error);
    }
  }

  /**
   * Query resolver for retrieving a single task by ID
   */
  async task(
    parent: unknown,
    args: { id: UUID },
    context: { userId: UUID }
  ): Promise<ITask> {
    try {
      this.validateContext(context);
      return await this.taskLoader.load(args.id);
    } catch (error) {
      this.handleError('Failed to fetch task', error);
    }
  }

  /**
   * Mutation resolver for creating a new task
   */
  async createTask(
    parent: unknown,
    args: { input: CreateTaskInput },
    context: { userId: UUID }
  ): Promise<ITask> {
    try {
      this.validateContext(context);
      
      const task = await this.taskService.create({
        ...args.input,
        creatorId: context.userId
      });

      await this.pubsub.publish(TASK_CREATED_TOPIC, { taskCreated: task });
      return task;
    } catch (error) {
      this.handleError('Failed to create task', error);
    }
  }

  /**
   * Mutation resolver for updating an existing task
   */
  async updateTask(
    parent: unknown,
    args: { id: UUID; input: UpdateTaskInput; version: number },
    context: { userId: UUID }
  ): Promise<ITask> {
    try {
      this.validateContext(context);
      
      const task = await this.taskService.update(
        args.id,
        args.input,
        args.version
      );

      await this.pubsub.publish(TASK_UPDATED_TOPIC, { taskUpdated: task });
      this.taskLoader.clear(args.id);
      return task;
    } catch (error) {
      this.handleError('Failed to update task', error);
    }
  }

  /**
   * Mutation resolver for deleting a task
   */
  async deleteTask(
    parent: unknown,
    args: { id: UUID },
    context: { userId: UUID }
  ): Promise<boolean> {
    try {
      this.validateContext(context);
      
      const success = await this.taskService.delete(args.id);
      if (success) {
        await this.pubsub.publish(TASK_DELETED_TOPIC, { taskDeleted: args.id });
        this.taskLoader.clear(args.id);
      }
      return success;
    } catch (error) {
      this.handleError('Failed to delete task', error);
    }
  }

  /**
   * Subscription resolver for task updates
   */
  taskUpdated: {
    subscribe: (
      parent: unknown,
      args: { projectId?: UUID },
      context: { userId: UUID }
    ) => AsyncIterator<{ taskUpdated: ITask }>;
  } = {
    subscribe: (parent, args, context) => {
      this.validateContext(context);
      return this.pubsub.asyncIterator([TASK_UPDATED_TOPIC]);
    }
  };

  /**
   * Initialize event subscriptions for real-time updates
   */
  private initializeEventSubscriptions(): void {
    this.eventBus.subscribe(EventType.TASK_UPDATED, {
      handle: async (payload) => {
        await this.pubsub.publish(TASK_UPDATED_TOPIC, {
          taskUpdated: payload.data
        });
      }
    });
  }

  /**
   * Validates the context and user authentication
   */
  private validateContext(context: { userId?: UUID }): void {
    if (!context.userId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'UNAUTHORIZED' }
      });
    }
  }

  /**
   * Builds filter criteria for task queries
   */
  private buildFilters(filter?: Record<string, unknown>): Array<{
    field: string;
    operator: string;
    value: unknown;
  }> {
    if (!filter) return [];

    return Object.entries(filter)
      .filter(([, value]) => value !== undefined)
      .map(([field, value]) => ({
        field,
        operator: Array.isArray(value) ? 'in' : 'eq',
        value
      }));
  }

  /**
   * Handles and transforms errors into GraphQL errors
   */
  private handleError(message: string, error: unknown): never {
    this.logger.error(message, { error });
    
    if (error instanceof GraphQLError) {
      throw error;
    }

    throw new GraphQLError(message, {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        originalError: error instanceof Error ? error.message : String(error)
      }
    });
  }

  /**
   * Cleanup method for subscription resources
   */
  public async cleanup(): Promise<void> {
    this.taskLoader.clearAll();
    this.subscriptions.clear();
  }
}

interface CreateTaskInput {
  title: string;
  description?: string;
  projectId: UUID;
  assigneeId: UUID;
  priority: TaskPriority;
  dueDate: Date;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeId?: UUID;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  tags?: string[];
  metadata?: Record<string, unknown>;
}