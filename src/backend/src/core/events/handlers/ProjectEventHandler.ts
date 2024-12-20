/**
 * @fileoverview Implementation of project event handler for processing project-related events
 * with comprehensive error handling, retry mechanisms, and audit logging support.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { injectable } from 'inversify'; // v6.0.1
import { IEventHandler } from '../../interfaces/IEventHandler';
import { EventType, EventPayload, EventPriority } from '../../../types/event.types';
import { NotificationService } from '../../services/NotificationService';
import { UUID } from '../../../types/common.types';
import { performance } from 'perf_hooks';

/**
 * Custom error class for project event handling errors
 */
class ProjectEventError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ProjectEventError';
  }
}

/**
 * Handles project-related events with comprehensive error handling, retry logic,
 * and audit logging capabilities. Implements real-time notifications for project changes.
 */
@injectable()
export class ProjectEventHandler implements IEventHandler {
  // Configuration constants
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // milliseconds
  private readonly NOTIFICATION_BATCH_SIZE = 100;
  private readonly RATE_LIMIT_THRESHOLD = 1000; // events per minute
  
  // Metrics tracking
  private readonly metrics: Map<string, number>;
  private readonly processingTimes: number[];

  constructor(private readonly notificationService: NotificationService) {
    this.metrics = new Map();
    this.processingTimes = [];
    this.initializeMetrics();
  }

  /**
   * Processes project events with comprehensive error handling and retry logic
   * @param {Readonly<EventPayload>} payload - Event payload containing project event data
   * @throws {ProjectEventError} When event processing fails after retries
   */
  public async handle(payload: Readonly<EventPayload>): Promise<void> {
    const startTime = performance.now();
    const correlationId = payload.correlationId;

    try {
      // Validate payload
      this.validatePayload(payload);

      // Check rate limiting
      this.checkRateLimit();

      // Process event based on type
      await this.processEventWithRetry(payload);

      // Update metrics
      this.updateMetrics(payload.type, performance.now() - startTime);

      // Log successful processing
      console.info(`Project event processed successfully`, {
        eventType: payload.type,
        correlationId,
        duration: performance.now() - startTime
      });
    } catch (error) {
      this.handleError(error, payload);
    }
  }

  /**
   * Validates event payload structure and content
   * @private
   */
  private validatePayload(payload: Readonly<EventPayload>): void {
    if (!payload || !payload.type || !payload.data) {
      throw new ProjectEventError('Invalid event payload', 'INVALID_PAYLOAD');
    }

    if (!Object.values(EventType).includes(payload.type)) {
      throw new ProjectEventError('Invalid event type', 'INVALID_EVENT_TYPE');
    }

    const requiredFields = this.getRequiredFields(payload.type);
    for (const field of requiredFields) {
      if (!(field in payload.data)) {
        throw new ProjectEventError(`Missing required field: ${field}`, 'MISSING_FIELD');
      }
    }
  }

  /**
   * Processes event with retry logic
   * @private
   */
  private async processEventWithRetry(
    payload: Readonly<EventPayload>,
    attempt: number = 1
  ): Promise<void> {
    try {
      switch (payload.type) {
        case EventType.PROJECT_CREATED:
          await this.handleProjectCreated(payload);
          break;
        case EventType.PROJECT_UPDATED:
          await this.handleProjectUpdated(payload);
          break;
        case EventType.PROJECT_DELETED:
          await this.handleProjectDeleted(payload);
          break;
        default:
          throw new ProjectEventError('Unsupported event type', 'UNSUPPORTED_EVENT');
      }
    } catch (error) {
      if (attempt < this.MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => 
          setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, attempt - 1))
        );
        await this.processEventWithRetry(payload, attempt + 1);
      } else {
        throw error;
      }
    }
  }

  /**
   * Handles project creation events
   * @private
   */
  private async handleProjectCreated(payload: Readonly<EventPayload>): Promise<void> {
    const { data } = payload;
    const projectId = data.projectId as UUID;
    const projectName = data.name as string;

    await this.notificationService.broadcastNotification(
      {
        id: projectId,
        type: 'PROJECT_CREATED',
        title: 'New Project Created',
        message: `Project "${projectName}" has been created`,
        priority: EventPriority.MEDIUM,
        metadata: {
          projectId,
          projectName,
          createdBy: payload.userId
        },
        createdAt: new Date()
      },
      'project_updates',
      {
        priority: EventPriority.MEDIUM,
        targetRoles: ['PROJECT_MANAGER', 'TEAM_LEAD']
      }
    );
  }

  /**
   * Handles project update events
   * @private
   */
  private async handleProjectUpdated(payload: Readonly<EventPayload>): Promise<void> {
    const { data } = payload;
    const projectId = data.projectId as UUID;
    const projectName = data.name as string;
    const changes = data.changes as Record<string, unknown>;

    await this.notificationService.broadcastNotification(
      {
        id: projectId,
        type: 'PROJECT_UPDATED',
        title: 'Project Updated',
        message: `Project "${projectName}" has been updated`,
        priority: EventPriority.MEDIUM,
        metadata: {
          projectId,
          projectName,
          updatedBy: payload.userId,
          changes
        },
        createdAt: new Date()
      },
      `project:${projectId}:updates`,
      {
        priority: EventPriority.MEDIUM,
        targetRoles: ['PROJECT_MANAGER', 'TEAM_MEMBER']
      }
    );
  }

  /**
   * Handles project deletion events
   * @private
   */
  private async handleProjectDeleted(payload: Readonly<EventPayload>): Promise<void> {
    const { data } = payload;
    const projectId = data.projectId as UUID;
    const projectName = data.name as string;

    await this.notificationService.broadcastNotification(
      {
        id: projectId,
        type: 'PROJECT_DELETED',
        title: 'Project Deleted',
        message: `Project "${projectName}" has been deleted`,
        priority: EventPriority.HIGH,
        metadata: {
          projectId,
          projectName,
          deletedBy: payload.userId
        },
        createdAt: new Date()
      },
      'project_deletions',
      {
        priority: EventPriority.HIGH,
        targetRoles: ['PROJECT_MANAGER', 'TEAM_LEAD', 'ADMIN']
      }
    );
  }

  /**
   * Gets required fields for event type
   * @private
   */
  private getRequiredFields(eventType: EventType): string[] {
    const baseFields = ['projectId', 'name'];
    switch (eventType) {
      case EventType.PROJECT_CREATED:
        return [...baseFields, 'description', 'ownerId'];
      case EventType.PROJECT_UPDATED:
        return [...baseFields, 'changes', 'version'];
      case EventType.PROJECT_DELETED:
        return baseFields;
      default:
        return baseFields;
    }
  }

  /**
   * Checks rate limiting thresholds
   * @private
   */
  private checkRateLimit(): void {
    const currentRate = this.metrics.get('eventsPerMinute') || 0;
    if (currentRate >= this.RATE_LIMIT_THRESHOLD) {
      throw new ProjectEventError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
    }
  }

  /**
   * Initializes metrics tracking
   * @private
   */
  private initializeMetrics(): void {
    this.metrics.set('eventsProcessed', 0);
    this.metrics.set('eventsPerMinute', 0);
    this.metrics.set('failedEvents', 0);
    this.metrics.set('averageProcessingTime', 0);

    // Reset events per minute counter periodically
    setInterval(() => {
      this.metrics.set('eventsPerMinute', 0);
    }, 60000);
  }

  /**
   * Updates metrics after event processing
   * @private
   */
  private updateMetrics(eventType: EventType, duration: number): void {
    this.metrics.set('eventsProcessed', (this.metrics.get('eventsProcessed') || 0) + 1);
    this.metrics.set('eventsPerMinute', (this.metrics.get('eventsPerMinute') || 0) + 1);
    
    this.processingTimes.push(duration);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    
    const avgProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    this.metrics.set('averageProcessingTime', avgProcessingTime);
    this.metrics.set(`${eventType}_count`, (this.metrics.get(`${eventType}_count`) || 0) + 1);
  }

  /**
   * Handles and logs errors during event processing
   * @private
   */
  private handleError(error: unknown, payload: Readonly<EventPayload>): void {
    this.metrics.set('failedEvents', (this.metrics.get('failedEvents') || 0) + 1);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error instanceof ProjectEventError ? error.code : 'UNKNOWN_ERROR';

    console.error('Failed to process project event', {
      eventType: payload.type,
      correlationId: payload.correlationId,
      error: errorMessage,
      errorCode
    });

    throw error instanceof ProjectEventError 
      ? error 
      : new ProjectEventError('Event processing failed', errorCode);
  }
}