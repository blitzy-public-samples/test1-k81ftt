/**
 * @fileoverview Core interface defining the contract for the event bus system in the event-driven architecture.
 * Provides comprehensive type-safe methods for publishing events and managing subscriptions with
 * enhanced error handling and delivery guarantees.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { IEventHandler } from './IEventHandler';
import { EventType, EventPayload } from '../../types/event.types';

/**
 * Core interface that defines the contract for the event bus system.
 * Implements the Publisher-Subscriber pattern for the event-driven architecture,
 * ensuring reliable event delivery and type-safe event handling.
 * 
 * @interface IEventBus
 * 
 * @example
 * ```typescript
 * class RedisEventBus implements IEventBus {
 *   async publish(eventName: EventType, eventData: EventPayload): Promise<void> {
 *     // Publish event to Redis pub/sub
 *   }
 * }
 * ```
 */
export interface IEventBus {
  /**
   * Publishes an event to all subscribed handlers with guaranteed delivery.
   * Implements retry logic, error handling, and delivery confirmation.
   * 
   * @param {EventType} eventName - Type of event being published from the EventType enum
   * @param {Readonly<EventPayload>} eventData - Immutable event payload containing event details and metadata
   * @returns {Promise<void>} Resolves when event is successfully published to all handlers
   * 
   * @throws {EventPublishError} When event publishing fails after retries
   * @throws {ValidationError} When event payload fails validation
   * @throws {TimeoutError} When publishing exceeds timeout threshold
   * 
   * @remarks
   * - Implements at-least-once delivery semantics
   * - Supports event prioritization based on metadata
   * - Includes built-in retry mechanism for failed deliveries
   * - Maintains audit trail of event publishing attempts
   */
  publish(eventName: EventType, eventData: Readonly<EventPayload>): Promise<void>;

  /**
   * Subscribes an event handler to a specific event type with duplicate subscription prevention.
   * Validates handler implementation and manages subscription lifecycle.
   * 
   * @param {EventType} eventName - Type of event to subscribe to
   * @param {Readonly<IEventHandler>} handler - Event handler implementation
   * @returns {Promise<void>} Resolves when subscription is successfully registered
   * 
   * @throws {SubscriptionError} When subscription registration fails
   * @throws {ValidationError} When handler validation fails
   * @throws {DuplicateSubscriptionError} When handler is already subscribed
   * 
   * @remarks
   * - Prevents duplicate subscriptions for the same handler
   * - Validates handler implementation before subscription
   * - Supports dynamic subscription management
   * - Maintains registry of active subscriptions
   */
  subscribe(eventName: EventType, handler: Readonly<IEventHandler>): Promise<void>;

  /**
   * Unsubscribes an event handler from a specific event type with validation.
   * Manages graceful handler removal and cleanup of resources.
   * 
   * @param {EventType} eventName - Type of event to unsubscribe from
   * @param {Readonly<IEventHandler>} handler - Event handler to unsubscribe
   * @returns {Promise<void>} Resolves when unsubscription is successful
   * 
   * @throws {UnsubscriptionError} When unsubscription fails
   * @throws {HandlerNotFoundError} When handler is not found in subscription registry
   * 
   * @remarks
   * - Validates existence of subscription before removal
   * - Ensures clean removal of handler references
   * - Supports graceful shutdown of handler resources
   * - Maintains consistency of subscription registry
   */
  unsubscribe(eventName: EventType, handler: Readonly<IEventHandler>): Promise<void>;
}

/**
 * Type guard to check if an object implements the IEventBus interface
 * 
 * @param {unknown} value - Value to check
 * @returns {boolean} True if the value implements IEventBus
 */
export function isEventBus(value: unknown): value is IEventBus {
  return (
    value !== null &&
    typeof value === 'object' &&
    'publish' in value &&
    'subscribe' in value &&
    'unsubscribe' in value &&
    typeof (value as IEventBus).publish === 'function' &&
    typeof (value as IEventBus).subscribe === 'function' &&
    typeof (value as IEventBus).unsubscribe === 'function'
  );
}