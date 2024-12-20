// @ts-strict
import { UUID } from './common.types';

/**
 * Comprehensive enumeration of all possible event types in the system.
 * Supports real-time updates, asynchronous processing, and team collaboration features.
 */
export enum EventType {
  // Task-related events
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',

  // Project-related events
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_DELETED = 'PROJECT_DELETED',

  // Collaboration events
  COMMENT_ADDED = 'COMMENT_ADDED',
  USER_MENTIONED = 'USER_MENTIONED',
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
  TEAM_ACTIVITY = 'TEAM_ACTIVITY',
  REAL_TIME_UPDATE = 'REAL_TIME_UPDATE'
}

/**
 * Enumeration of event priority levels for processing.
 * Used to determine the order and urgency of event handling.
 */
export enum EventPriority {
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3
}

/**
 * Enhanced interface defining the structure of event payloads with audit support.
 * Implements comprehensive tracking and tracing capabilities for the event-driven system.
 */
export interface EventPayload {
  /** Unique identifier for the event */
  readonly id: UUID;

  /** Type of the event from the EventType enum */
  readonly type: EventType;

  /** Actual event data payload */
  readonly data: Record<string, unknown>;

  /** Timestamp when the event was created */
  readonly timestamp: Date;

  /** ID of the user who triggered the event */
  readonly userId: UUID;

  /** Correlation ID for tracking related events */
  readonly correlationId: UUID;

  /** Event schema version for backward compatibility */
  readonly version: number;
}

/**
 * Enhanced interface for event metadata with advanced processing configuration.
 * Provides detailed control over event handling and delivery mechanisms.
 */
export interface EventMetadata {
  /** Priority level for event processing */
  readonly priority: EventPriority;

  /** Number of retry attempts made */
  readonly retryCount: number;

  /** Maximum number of retry attempts allowed */
  readonly maxRetries: number;

  /** Channel or topic for event routing */
  readonly channel: string;

  /** Time-to-live in milliseconds */
  readonly ttl: number;

  /** Whether acknowledgment is required from consumers */
  readonly acknowledgmentRequired: boolean;
}

/**
 * Type guard to check if a value is a valid EventType
 * @param value - Value to check against EventType enum
 */
export function isEventType(value: unknown): value is EventType {
  return Object.values(EventType).includes(value as EventType);
}

/**
 * Type guard to check if a value is a valid EventPriority
 * @param value - Value to check against EventPriority enum
 */
export function isEventPriority(value: unknown): value is EventPriority {
  return Object.values(EventPriority).includes(value as EventPriority);
}

/**
 * Type for event handler function signature
 */
export type EventHandler<T = unknown> = (
  payload: EventPayload,
  metadata: EventMetadata
) => Promise<T>;

/**
 * Type for event subscription configuration
 */
export interface EventSubscription {
  readonly eventType: EventType;
  readonly handler: EventHandler;
  readonly metadata?: Partial<EventMetadata>;
}

/**
 * Default metadata values for events
 */
export const DEFAULT_EVENT_METADATA: EventMetadata = {
  priority: EventPriority.MEDIUM,
  retryCount: 0,
  maxRetries: 3,
  channel: 'default',
  ttl: 3600000, // 1 hour in milliseconds
  acknowledgmentRequired: true
};