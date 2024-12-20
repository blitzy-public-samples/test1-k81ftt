/**
 * @fileoverview Implementation of a robust event emitter pattern for event-driven architecture
 * with enhanced features including performance monitoring, error handling, and event metadata processing.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { IEventBus } from '../interfaces/IEventBus';
import { IEventHandler } from '../interfaces/IEventHandler';
import { EventType, EventPayload, EventMetadata, EventPriority, DEFAULT_EVENT_METADATA } from '../../types/event.types';
import { UUID } from '../../types/common.types';

/**
 * Custom error types for event handling
 */
class EventEmitterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventEmitterError';
  }
}

class HandlerTimeoutError extends EventEmitterError {
  constructor(eventType: EventType, handlerId: string) {
    super(`Handler ${handlerId} timed out while processing event ${eventType}`);
    this.name = 'HandlerTimeoutError';
  }
}

/**
 * Interface for handler performance metrics
 */
interface HandlerMetrics {
  successCount: number;
  failureCount: number;
  averageLatency: number;
  lastExecutionTime: Date;
}

/**
 * Implementation of the event bus interface providing event publishing and subscription
 * management with enhanced reliability features.
 */
export class EventEmitter implements IEventBus {
  private readonly handlers: Map<EventType, Set<IEventHandler>>;
  private readonly handlerMetrics: Map<string, HandlerMetrics>;
  private readonly defaultTimeout: number;
  private readonly maxRetries: number;
  private readonly cleanupInterval: NodeJS.Timer;

  /**
   * Creates a new instance of EventEmitter with configurable timeout and retry settings
   * 
   * @param defaultTimeout - Default timeout for event handlers in milliseconds
   * @param maxRetries - Maximum number of retry attempts for failed handlers
   */
  constructor(
    defaultTimeout: number = 5000,
    maxRetries: number = 3
  ) {
    this.handlers = new Map();
    this.handlerMetrics = new Map();
    this.defaultTimeout = defaultTimeout;
    this.maxRetries = maxRetries;

    // Start periodic cleanup of stale handlers
    this.cleanupInterval = setInterval(() => this.cleanup(), 3600000); // Run cleanup every hour
  }

  /**
   * Publishes an event to all subscribed handlers with timeout and retry mechanism
   * 
   * @param eventType - Type of event being published
   * @param eventData - Event payload data
   * @param metadata - Optional event metadata
   */
  public async publish(
    eventType: EventType,
    eventData: Record<string, unknown>,
    metadata: Partial<EventMetadata> = {}
  ): Promise<void> {
    const handlers = this.handlers.get(eventType);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const eventPayload: EventPayload = {
      id: crypto.randomUUID() as UUID,
      type: eventType,
      data: eventData,
      timestamp: new Date(),
      userId: metadata.userId as UUID || ('system' as UUID),
      correlationId: metadata.correlationId as UUID || crypto.randomUUID() as UUID,
      version: 1
    };

    const mergedMetadata = { ...DEFAULT_EVENT_METADATA, ...metadata };
    const handlerPromises: Promise<void>[] = [];

    for (const handler of handlers) {
      const handlerId = this.getHandlerId(handler);
      handlerPromises.push(
        this.executeHandlerWithRetry(handler, eventPayload, mergedMetadata, handlerId)
      );
    }

    try {
      await Promise.all(handlerPromises);
    } catch (error) {
      console.error('Error publishing event:', error);
      throw new EventEmitterError(`Failed to publish event ${eventType}: ${error.message}`);
    }
  }

  /**
   * Subscribes an event handler to a specific event type
   * 
   * @param eventType - Type of event to subscribe to
   * @param handler - Event handler implementation
   */
  public async subscribe(eventType: EventType, handler: IEventHandler): Promise<void> {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType)!;
    const handlerId = this.getHandlerId(handler);

    if (handlers.has(handler)) {
      throw new EventEmitterError(`Handler ${handlerId} is already subscribed to ${eventType}`);
    }

    handlers.add(handler);
    this.initializeMetrics(handlerId);
  }

  /**
   * Unsubscribes an event handler from a specific event type
   * 
   * @param eventType - Type of event to unsubscribe from
   * @param handler - Event handler to unsubscribe
   */
  public async unsubscribe(eventType: EventType, handler: IEventHandler): Promise<void> {
    const handlers = this.handlers.get(eventType);
    if (!handlers) {
      return;
    }

    const handlerId = this.getHandlerId(handler);
    handlers.delete(handler);
    this.handlerMetrics.delete(handlerId);

    if (handlers.size === 0) {
      this.handlers.delete(eventType);
    }
  }

  /**
   * Performs cleanup of stale handlers and metrics
   */
  private cleanup(): void {
    const now = new Date();
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    for (const [handlerId, metrics] of this.handlerMetrics.entries()) {
      const timeSinceLastExecution = now.getTime() - metrics.lastExecutionTime.getTime();
      
      // Remove handlers that haven't executed in 24 hours or have high failure rates
      if (timeSinceLastExecution > staleThreshold || 
          (metrics.failureCount > 100 && metrics.failureCount / (metrics.successCount + metrics.failureCount) > 0.5)) {
        this.handlerMetrics.delete(handlerId);
        
        // Remove handler from all event types
        for (const [eventType, handlers] of this.handlers.entries()) {
          for (const handler of handlers) {
            if (this.getHandlerId(handler) === handlerId) {
              handlers.delete(handler);
            }
          }
        }
      }
    }
  }

  /**
   * Executes a handler with retry mechanism and timeout
   */
  private async executeHandlerWithRetry(
    handler: IEventHandler,
    payload: EventPayload,
    metadata: EventMetadata,
    handlerId: string,
    attempt: number = 1
  ): Promise<void> {
    const startTime = Date.now();

    try {
      await Promise.race([
        handler.handle(payload),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new HandlerTimeoutError(payload.type, handlerId));
          }, this.defaultTimeout);
        })
      ]);

      this.updateMetrics(handlerId, Date.now() - startTime, true);
    } catch (error) {
      this.updateMetrics(handlerId, Date.now() - startTime, false);

      if (attempt < this.maxRetries && metadata.priority === EventPriority.HIGH) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this.executeHandlerWithRetry(handler, payload, metadata, handlerId, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Generates a unique identifier for a handler
   */
  private getHandlerId(handler: IEventHandler): string {
    return `${handler.constructor.name}_${crypto.randomUUID()}`;
  }

  /**
   * Initializes metrics for a new handler
   */
  private initializeMetrics(handlerId: string): void {
    this.handlerMetrics.set(handlerId, {
      successCount: 0,
      failureCount: 0,
      averageLatency: 0,
      lastExecutionTime: new Date()
    });
  }

  /**
   * Updates performance metrics for a handler
   */
  private updateMetrics(handlerId: string, latency: number, success: boolean): void {
    const metrics = this.handlerMetrics.get(handlerId)!;
    
    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }

    metrics.averageLatency = (metrics.averageLatency * (metrics.successCount + metrics.failureCount - 1) + latency) / 
                            (metrics.successCount + metrics.failureCount);
    metrics.lastExecutionTime = new Date();
  }

  /**
   * Cleans up resources when the emitter is destroyed
   */
  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.handlers.clear();
    this.handlerMetrics.clear();
  }
}