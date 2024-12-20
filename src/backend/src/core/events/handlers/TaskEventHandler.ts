/**
 * @fileoverview Enhanced event handler for processing task-related events with robust error handling,
 * retry mechanisms, monitoring capabilities, and real-time notification delivery.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { injectable } from 'inversify'; // v6.0.1
import { Logger } from 'winston'; // v3.8.0
import { IEventHandler } from '../../interfaces/IEventHandler';
import { EventType, EventPayload, EventPriority } from '../../../types/event.types';
import { NotificationService } from '../../services/NotificationService';
import { UUID } from '../../../types/common.types';

/**
 * Configuration interface for retry mechanism
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

/**
 * Interface for task event data
 */
interface TaskEventData {
  taskId: UUID;
  projectId: UUID;
  userId: UUID;
  title: string;
  description?: string;
  assigneeId?: UUID;
  metadata?: Record<string, unknown>;
}

/**
 * Enhanced handler for task-related events implementing comprehensive error handling,
 * retry mechanisms, and real-time notifications.
 */
@injectable()
export class TaskEventHandler implements IEventHandler {
  private readonly logger: Logger;
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000  // 10 seconds
  };

  constructor(
    private readonly notificationService: NotificationService,
    logger: Logger
  ) {
    this.logger = logger.child({ context: 'TaskEventHandler' });
  }

  /**
   * Handles task-related events with comprehensive error handling and monitoring
   * @param {EventPayload} payload - Event payload containing task event data
   */
  public async handle(payload: Readonly<EventPayload>): Promise<void> {
    const startTime = Date.now();
    const correlationId = payload.correlationId;

    try {
      this.validatePayload(payload);
      this.logger.info('Processing task event', { 
        type: payload.type, 
        correlationId 
      });

      switch (payload.type) {
        case EventType.TASK_CREATED:
          await this.handleTaskCreated(payload.data as TaskEventData);
          break;
        case EventType.TASK_UPDATED:
          await this.handleTaskUpdated(payload.data as TaskEventData);
          break;
        case EventType.TASK_DELETED:
          await this.handleTaskDeleted(payload.data as TaskEventData);
          break;
        default:
          throw new Error(`Unsupported event type: ${payload.type}`);
      }

      this.logger.info('Task event processed successfully', {
        type: payload.type,
        correlationId,
        duration: Date.now() - startTime
      });
    } catch (error) {
      await this.handleError(error, payload);
      throw error;
    }
  }

  /**
   * Handles task creation events with notification delivery
   * @private
   */
  private async handleTaskCreated(taskData: TaskEventData): Promise<void> {
    try {
      const notification = {
        id: crypto.randomUUID() as UUID,
        type: 'TASK_CREATED',
        title: 'New Task Created',
        message: `Task "${taskData.title}" has been created`,
        priority: EventPriority.MEDIUM,
        metadata: {
          taskId: taskData.taskId,
          projectId: taskData.projectId,
          createdBy: taskData.userId
        },
        createdAt: new Date()
      };

      if (taskData.assigneeId) {
        await this.notificationService.sendNotification(
          notification,
          [taskData.assigneeId],
          { priority: EventPriority.HIGH }
        );
      }

      // Broadcast to project team members
      await this.notificationService.broadcastNotification(
        notification,
        `project:${taskData.projectId}`,
        { 
          excludeUsers: [taskData.userId],
          priority: EventPriority.LOW
        }
      );
    } catch (error) {
      this.logger.error('Failed to process task creation event', {
        taskId: taskData.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Handles task update events with notification delivery
   * @private
   */
  private async handleTaskUpdated(taskData: TaskEventData): Promise<void> {
    try {
      const notification = {
        id: crypto.randomUUID() as UUID,
        type: 'TASK_UPDATED',
        title: 'Task Updated',
        message: `Task "${taskData.title}" has been updated`,
        priority: EventPriority.MEDIUM,
        metadata: {
          taskId: taskData.taskId,
          projectId: taskData.projectId,
          updatedBy: taskData.userId
        },
        createdAt: new Date()
      };

      const recipients: UUID[] = [];
      if (taskData.assigneeId) {
        recipients.push(taskData.assigneeId);
      }

      await this.notificationService.sendNotification(
        notification,
        recipients,
        { 
          priority: EventPriority.MEDIUM,
          aggregationKey: `task:${taskData.taskId}:updates`
        }
      );
    } catch (error) {
      this.logger.error('Failed to process task update event', {
        taskId: taskData.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Handles task deletion events with notification delivery
   * @private
   */
  private async handleTaskDeleted(taskData: TaskEventData): Promise<void> {
    try {
      const notification = {
        id: crypto.randomUUID() as UUID,
        type: 'TASK_DELETED',
        title: 'Task Deleted',
        message: `Task "${taskData.title}" has been deleted`,
        priority: EventPriority.HIGH,
        metadata: {
          taskId: taskData.taskId,
          projectId: taskData.projectId,
          deletedBy: taskData.userId
        },
        createdAt: new Date()
      };

      await this.notificationService.broadcastNotification(
        notification,
        `project:${taskData.projectId}`,
        { priority: EventPriority.HIGH }
      );
    } catch (error) {
      this.logger.error('Failed to process task deletion event', {
        taskId: taskData.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Validates event payload schema
   * @private
   */
  private validatePayload(payload: Readonly<EventPayload>): void {
    if (!payload || !payload.type || !payload.data) {
      throw new Error('Invalid event payload');
    }

    const data = payload.data as TaskEventData;
    if (!data.taskId || !data.projectId || !data.userId || !data.title) {
      throw new Error('Missing required task event data');
    }
  }

  /**
   * Handles errors with retry logic and logging
   * @private
   */
  private async handleError(error: unknown, payload: EventPayload): Promise<void> {
    this.logger.error('Task event processing failed', {
      type: payload.type,
      correlationId: payload.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    if (error instanceof Error && error.message.includes('RETRY')) {
      await this.retryWithBackoff(async () => this.handle(payload));
    }
  }

  /**
   * Implements exponential backoff retry mechanism
   * @private
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.retryConfig.maxRetries) {
        throw error;
      }

      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
        this.retryConfig.maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryWithBackoff(operation, attempt + 1);
    }
  }
}