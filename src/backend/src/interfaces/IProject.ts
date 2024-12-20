/**
 * @fileoverview Project interface definitions for the task management system.
 * Provides comprehensive type definitions for project entities with enhanced
 * timeline management and status tracking capabilities.
 * @version 1.0.0
 */

import { BaseEntity } from '../types/common.types';

/**
 * Enumeration of all possible project statuses in the task management system.
 * Supports the complete project lifecycle from planning to completion or cancellation.
 */
export enum ProjectStatus {
  /** Initial planning phase of the project */
  PLANNING = 'PLANNING',
  /** Project is actively being worked on */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Project temporarily suspended */
  ON_HOLD = 'ON_HOLD',
  /** Project successfully finished */
  COMPLETED = 'COMPLETED',
  /** Project terminated before completion */
  CANCELLED = 'CANCELLED'
}

/**
 * Core interface defining the structure of Project entities in the system.
 * Extends BaseEntity to inherit standard fields while maintaining immutability
 * through readonly properties.
 * 
 * @extends BaseEntity
 */
export interface IProject extends BaseEntity {
  /** Unique identifier for the project */
  readonly id: UUID;

  /** Project name - required, non-empty string */
  readonly name: string;

  /** Detailed project description */
  readonly description: string;

  /** UUID of the project owner/manager */
  readonly ownerId: UUID;

  /** Current project status */
  readonly status: ProjectStatus;

  /** Project start date */
  readonly startDate: Date;

  /** Project target completion date */
  readonly endDate: Date;

  /**
   * Project configuration settings
   * Supports flexible project-specific configurations
   * @example
   * {
   *   "allowExternalSharing": true,
   *   "defaultTaskPriority": "MEDIUM",
   *   "notificationPreferences": { "email": true, "slack": false }
   * }
   */
  readonly settings: Record<string, unknown>;

  /**
   * Additional project metadata
   * Stores supplementary project information and custom fields
   * @example
   * {
   *   "department": "Engineering",
   *   "costCenter": "CC-123",
   *   "priority": "HIGH"
   * }
   */
  readonly metadata: Record<string, unknown>;

  /** Timestamp of project creation */
  readonly createdAt: Date;

  /** Timestamp of last project update */
  readonly updatedAt: Date;
}