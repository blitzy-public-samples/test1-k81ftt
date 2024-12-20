/**
 * @fileoverview Event system constants and configurations for the Task Management System.
 * Supports real-time updates, asynchronous processing, and event-driven architecture.
 * @version 1.0.0
 */

import { EventType, EventPriority } from '../types/event.types';

/**
 * Redis pub/sub channel names for different event types.
 * Used for routing events to appropriate handlers and maintaining separation of concerns.
 */
export const EVENT_CHANNELS = {
  /** Channel for task-related events (creation, updates, deletion) */
  TASK: 'task-events',
  /** Channel for project-level events and updates */
  PROJECT: 'project-events',
  /** Channel for user notifications and alerts */
  NOTIFICATION: 'notification-events',
  /** Channel for real-time collaboration events */
  COLLABORATION: 'collaboration-events'
} as const;

/**
 * Enhanced retry configuration for failed event processing.
 * Implements exponential backoff with jitter for improved reliability.
 */
export const EVENT_RETRY_POLICY = {
  /** Maximum number of retry attempts before moving to dead letter queue */
  MAX_RETRIES: 3,
  /** Base delay between retries in milliseconds */
  RETRY_DELAY: 1000,
  /** Exponential backoff multiplier for subsequent retries */
  BACKOFF_FACTOR: 2,
  /** Random jitter factor to prevent thundering herd problem (0-1) */
  JITTER_FACTOR: 0.1,
  /** Maximum delay cap for retries in milliseconds */
  MAX_DELAY: 30000,
  /** Threshold for consecutive failures before circuit breaking */
  FAILURE_THRESHOLD: 5
} as const;

/**
 * Priority-specific configurations for event processing.
 * Defines handling characteristics based on event priority levels.
 */
export const EVENT_PRIORITY_CONFIG = {
  /** High priority event configuration for critical updates */
  HIGH: {
    maxRetries: 5,
    retryDelay: 500,
    timeout: 5000,
    queuePriority: EventPriority.HIGH,
    deadLetterThreshold: 10,
    ackTimeout: 2000,
    processingTimeout: 4000
  },
  /** Medium priority event configuration for standard operations */
  MEDIUM: {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 10000,
    queuePriority: EventPriority.MEDIUM,
    deadLetterThreshold: 5,
    ackTimeout: 4000,
    processingTimeout: 8000
  },
  /** Low priority event configuration for background tasks */
  LOW: {
    maxRetries: 2,
    retryDelay: 2000,
    timeout: 15000,
    queuePriority: EventPriority.LOW,
    deadLetterThreshold: 3,
    ackTimeout: 6000,
    processingTimeout: 12000
  }
} as const;

/**
 * Mapping of event types to their respective channels.
 * Ensures consistent routing of events to appropriate channels.
 */
export const EVENT_TYPE_TO_CHANNEL_MAP: Readonly<Record<EventType, string>> = {
  [EventType.TASK_CREATED]: EVENT_CHANNELS.TASK,
  [EventType.TASK_UPDATED]: EVENT_CHANNELS.TASK,
  [EventType.TASK_DELETED]: EVENT_CHANNELS.TASK,
  [EventType.PROJECT_CREATED]: EVENT_CHANNELS.PROJECT,
  [EventType.PROJECT_UPDATED]: EVENT_CHANNELS.PROJECT,
  [EventType.PROJECT_DELETED]: EVENT_CHANNELS.PROJECT,
  [EventType.COMMENT_ADDED]: EVENT_CHANNELS.COLLABORATION,
  [EventType.USER_MENTIONED]: EVENT_CHANNELS.NOTIFICATION,
  [EventType.NOTIFICATION_SENT]: EVENT_CHANNELS.NOTIFICATION,
  [EventType.TEAM_ACTIVITY]: EVENT_CHANNELS.COLLABORATION,
  [EventType.REAL_TIME_UPDATE]: EVENT_CHANNELS.COLLABORATION
} as const;

/**
 * Default event processing timeouts in milliseconds.
 * Used for setting processing boundaries and preventing hung operations.
 */
export const EVENT_TIMEOUTS = {
  /** Default acknowledgment timeout */
  DEFAULT_ACK_TIMEOUT: 5000,
  /** Default processing timeout */
  DEFAULT_PROCESSING_TIMEOUT: 10000,
  /** Maximum time an event can remain in queue */
  MAX_QUEUE_TIME: 3600000, // 1 hour
  /** Time before stale events are cleaned up */
  CLEANUP_THRESHOLD: 86400000 // 24 hours
} as const;

/**
 * Configuration for event batching and bulk processing.
 * Optimizes throughput for high-volume event scenarios.
 */
export const EVENT_BATCH_CONFIG = {
  /** Maximum number of events in a batch */
  MAX_BATCH_SIZE: 100,
  /** Maximum time to wait before processing a partial batch */
  BATCH_TIMEOUT: 1000,
  /** Maximum size of the event queue */
  MAX_QUEUE_SIZE: 10000,
  /** Threshold for queue size warning */
  QUEUE_WARNING_THRESHOLD: 8000
} as const;

/**
 * Dead letter queue configuration for failed events.
 * Manages handling of events that exceed retry limits.
 */
export const DEAD_LETTER_CONFIG = {
  /** Channel name for dead letter queue */
  CHANNEL: 'dead-letter-queue',
  /** Maximum retention time for dead letter events */
  RETENTION_PERIOD: 604800000, // 7 days
  /** Interval for dead letter queue cleanup */
  CLEANUP_INTERVAL: 86400000, // 24 hours
  /** Maximum size of dead letter queue */
  MAX_SIZE: 100000
} as const;