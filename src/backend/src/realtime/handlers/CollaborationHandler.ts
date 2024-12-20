/**
 * @fileoverview Handles real-time collaboration events for tasks and projects with thread safety
 * and comprehensive error handling. Implements rate limiting and circuit breaking patterns.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { injectable } from 'inversify';
import { Logger } from 'winston';
import { CircuitBreaker } from 'opossum';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { IEventHandler } from '../../core/interfaces/IEventHandler';
import { EventType, EventPayload } from '../../types/event.types';
import { UUID } from '../../types/common.types';

/**
 * Error types specific to collaboration handling
 */
enum CollaborationErrorType {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  MAX_COLLABORATORS_EXCEEDED = 'MAX_COLLABORATORS_EXCEEDED',
  INVALID_RESOURCE = 'INVALID_RESOURCE',
  INVALID_USER = 'INVALID_USER'
}

/**
 * Custom error class for collaboration-specific errors
 */
class CollaborationError extends Error {
  constructor(
    public type: CollaborationErrorType,
    message: string
  ) {
    super(message);
    this.name = 'CollaborationError';
  }
}

/**
 * Handles real-time collaboration events and manages concurrent user actions
 * with thread safety and rate limiting
 */
@injectable()
export class CollaborationHandler implements IEventHandler {
  private readonly activeCollaborators: Map<string, Set<string>>;
  private readonly cleanupInterval: number = 300000; // 5 minutes
  private readonly maxCollaboratorsPerResource: number = 50;
  private readonly locks: Map<string, Promise<void>>;

  constructor(
    private readonly logger: Logger,
    private readonly rateLimiter: RateLimiterMemory,
    private readonly circuitBreaker: CircuitBreaker
  ) {
    this.activeCollaborators = new Map();
    this.locks = new Map();

    // Initialize cleanup interval
    setInterval(() => {
      this.cleanupStaleCollaborators().catch(error => {
        this.logger.error('Failed to cleanup stale collaborators', { error });
      });
    }, this.cleanupInterval);
  }

  /**
   * Handles incoming collaboration events with validation and error handling
   * @param payload - Event payload containing collaboration data
   */
  public async handle(payload: Readonly<EventPayload>): Promise<void> {
    try {
      // Rate limiting check
      await this.rateLimiter.consume(payload.userId);

      // Circuit breaker wrapped execution
      await this.circuitBreaker.fire(async () => {
        this.logger.info('Processing collaboration event', {
          eventType: payload.type,
          correlationId: payload.correlationId
        });

        switch (payload.type) {
          case EventType.TASK_UPDATED:
          case EventType.PROJECT_UPDATED:
            await this.handleResourceUpdate(payload);
            break;
          case EventType.COMMENT_ADDED:
            await this.handleCommentAdded(payload);
            break;
          default:
            this.logger.warn('Unhandled event type', { type: payload.type });
        }
      });
    } catch (error) {
      if (error.name === 'RateLimiterError') {
        throw new CollaborationError(
          CollaborationErrorType.RATE_LIMIT_EXCEEDED,
          'Too many collaboration requests'
        );
      }
      if (error.name === 'CircuitBreakerOpenError') {
        throw new CollaborationError(
          CollaborationErrorType.CIRCUIT_BREAKER_OPEN,
          'Collaboration service is temporarily unavailable'
        );
      }
      throw error;
    }
  }

  /**
   * Adds a user as an active collaborator with thread safety
   * @param resourceId - ID of the resource being collaborated on
   * @param userId - ID of the collaborating user
   */
  public async addCollaborator(resourceId: UUID, userId: UUID): Promise<boolean> {
    await this.acquireLock(resourceId);
    try {
      const collaborators = this.activeCollaborators.get(resourceId) || new Set();
      
      if (collaborators.size >= this.maxCollaboratorsPerResource) {
        throw new CollaborationError(
          CollaborationErrorType.MAX_COLLABORATORS_EXCEEDED,
          `Maximum collaborators (${this.maxCollaboratorsPerResource}) exceeded for resource`
        );
      }

      collaborators.add(userId);
      this.activeCollaborators.set(resourceId, collaborators);

      this.logger.info('Added collaborator', {
        resourceId,
        userId,
        totalCollaborators: collaborators.size
      });

      return true;
    } finally {
      await this.releaseLock(resourceId);
    }
  }

  /**
   * Removes a user from active collaborators with cleanup
   * @param resourceId - ID of the resource being collaborated on
   * @param userId - ID of the user to remove
   */
  public async removeCollaborator(resourceId: UUID, userId: UUID): Promise<void> {
    await this.acquireLock(resourceId);
    try {
      const collaborators = this.activeCollaborators.get(resourceId);
      if (collaborators) {
        collaborators.delete(userId);
        if (collaborators.size === 0) {
          this.activeCollaborators.delete(resourceId);
        }

        this.logger.info('Removed collaborator', {
          resourceId,
          userId,
          remainingCollaborators: collaborators.size
        });
      }
    } finally {
      await this.releaseLock(resourceId);
    }
  }

  /**
   * Retrieves active collaborators for a resource
   * @param resourceId - ID of the resource
   * @returns Set of active collaborator IDs
   */
  public async getActiveCollaborators(resourceId: UUID): Promise<Set<string>> {
    await this.acquireLock(resourceId);
    try {
      return new Set(this.activeCollaborators.get(resourceId) || []);
    } finally {
      await this.releaseLock(resourceId);
    }
  }

  /**
   * Handles resource update events
   * @param payload - Event payload for resource update
   */
  private async handleResourceUpdate(payload: Readonly<EventPayload>): Promise<void> {
    const { data } = payload;
    const resourceId = data.resourceId as string;
    const userId = payload.userId;

    await this.addCollaborator(resourceId, userId);
    // Additional resource update logic here
  }

  /**
   * Handles comment added events
   * @param payload - Event payload for comment addition
   */
  private async handleCommentAdded(payload: Readonly<EventPayload>): Promise<void> {
    const { data } = payload;
    const resourceId = data.resourceId as string;
    const userId = payload.userId;

    await this.addCollaborator(resourceId, userId);
    // Additional comment handling logic here
  }

  /**
   * Acquires a lock for thread-safe operations
   * @param resourceId - ID of the resource to lock
   */
  private async acquireLock(resourceId: string): Promise<void> {
    while (this.locks.has(resourceId)) {
      await this.locks.get(resourceId);
    }
    let resolveLock: () => void;
    const lockPromise = new Promise<void>(resolve => {
      resolveLock = resolve;
    });
    this.locks.set(resourceId, lockPromise);
    return new Promise(resolve => {
      resolve();
      resolveLock!();
    });
  }

  /**
   * Releases a lock after thread-safe operations
   * @param resourceId - ID of the resource to unlock
   */
  private async releaseLock(resourceId: string): Promise<void> {
    this.locks.delete(resourceId);
  }

  /**
   * Cleans up stale collaborator entries
   */
  private async cleanupStaleCollaborators(): Promise<void> {
    const staleThreshold = Date.now() - this.cleanupInterval;
    
    for (const [resourceId, collaborators] of this.activeCollaborators) {
      await this.acquireLock(resourceId);
      try {
        if (collaborators.size === 0) {
          this.activeCollaborators.delete(resourceId);
          this.logger.info('Cleaned up empty resource', { resourceId });
        }
      } finally {
        await this.releaseLock(resourceId);
      }
    }
  }
}