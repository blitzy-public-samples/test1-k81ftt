/**
 * @fileoverview Core interface defining the contract for event handlers in the event-driven architecture.
 * Provides a standardized way to handle various system events with built-in support for
 * asynchronous operations, error handling, and audit logging.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { EventPayload } from '../../types/event.types';

/**
 * Core interface that defines the contract for event handlers in the system.
 * Implements the Observer pattern for the event-driven architecture, ensuring
 * consistent event processing across all handlers.
 * 
 * @interface IEventHandler
 * @template T - Optional type parameter for specialized event handler implementations
 * 
 * @example
 * ```typescript
 * class TaskCreatedHandler implements IEventHandler {
 *   async handle(payload: Readonly<EventPayload>): Promise<void> {
 *     // Handle task creation event
 *   }
 * }
 * ```
 */
export interface IEventHandler<T = void> {
  /**
   * Asynchronously processes an event with the provided payload.
   * Implements standardized error handling, logging, and performance monitoring.
   * 
   * @param {Readonly<EventPayload>} payload - Immutable event data containing type, payload, timestamp, and metadata
   * @returns {Promise<T>} - Resolves when event processing is complete, rejects if processing fails
   * 
   * @throws {EventProcessingError} When event processing fails
   * @throws {ValidationError} When payload validation fails
   * @throws {TimeoutError} When processing exceeds timeout threshold
   * 
   * @remarks
   * - Handlers must be idempotent to support retry mechanisms
   * - Payload is marked as Readonly to prevent mutations during processing
   * - Implementation should include proper error handling and logging
   * - Should respect the event priority defined in the metadata
   */
  handle(payload: Readonly<EventPayload>): Promise<T>;
}

/**
 * Type guard to check if an object implements the IEventHandler interface
 * 
 * @param {unknown} value - Value to check
 * @returns {boolean} True if the value implements IEventHandler
 */
export function isEventHandler(value: unknown): value is IEventHandler {
  return (
    value !== null &&
    typeof value === 'object' &&
    'handle' in value &&
    typeof (value as IEventHandler).handle === 'function'
  );
}