/**
 * @fileoverview Project-related TypeScript type definitions for the Task Management System
 * Provides comprehensive type safety and data structure definitions for project management
 * @version 1.0.0
 */

import { 
  Status, 
  Priority, 
  ApiResponse, 
  PaginatedResponse 
} from './common.types';

/**
 * Represents the possible states of a project throughout its lifecycle
 */
export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

/**
 * Defines project visibility levels for access control
 */
export enum ProjectVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  TEAM = 'TEAM'
}

/**
 * Configuration for project-level notifications
 */
export interface NotificationSettings {
  /** Enable/disable email notifications */
  emailNotifications: boolean;
  /** Enable/disable in-app notifications */
  inAppNotifications: boolean;
  /** Notification frequency for project updates */
  frequency: 'INSTANT' | 'DAILY' | 'WEEKLY';
  /** Specific events to trigger notifications */
  events: Array<'STATUS_CHANGE' | 'DUE_DATE' | 'ASSIGNMENT' | 'COMMENT'>;
}

/**
 * Date range filter for project queries
 */
export interface DateRangeFilter {
  /** Start date for filtering */
  startDate?: Date;
  /** End date for filtering */
  endDate?: Date;
  /** Whether to include projects with no dates set */
  includeUndated?: boolean;
}

/**
 * Project-specific settings configuration
 */
export interface ProjectSettings {
  /** Project visibility level */
  visibility: ProjectVisibility;
  /** Notification configuration */
  notifications: NotificationSettings;
}

/**
 * Extended metadata for projects
 */
export interface ProjectMetadata {
  /** Project tags for categorization */
  tags: string[];
  /** Custom fields for project-specific data */
  customFields: Record<string, unknown>;
  /** Project configuration settings */
  settings: ProjectSettings;
}

/**
 * Core project interface with comprehensive timeline and hierarchy support
 */
export interface Project {
  /** Unique project identifier */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description: string;
  /** Project owner's user ID */
  ownerId: string;
  /** Current project status */
  status: ProjectStatus;
  /** Project start date */
  startDate: Date;
  /** Project end date */
  endDate: Date;
  /** Project timezone (IANA timezone identifier) */
  timezone: string;
  /** Extended project metadata */
  metadata: ProjectMetadata;
  /** Parent project ID for hierarchical organization (null for root projects) */
  parentId: string | null;
  /** Project creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Project filtering criteria for queries
 */
export interface ProjectFilters {
  /** Filter by project status */
  status?: ProjectStatus[];
  /** Filter by owner ID */
  ownerId?: string;
  /** Filter by date range */
  dateRange?: DateRangeFilter;
  /** Search text for project name/description */
  search?: string;
  /** Filter by project tags */
  tags?: string[];
}

/**
 * Project creation request payload
 */
export interface CreateProjectRequest extends Omit<Project, 'id' | 'createdAt' | 'updatedAt'> {
  /** Optional template ID to create from */
  templateId?: string;
}

/**
 * Project update request payload
 */
export interface UpdateProjectRequest extends Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>> {
  /** Project ID to update */
  id: string;
}

/**
 * Project list response with pagination
 */
export type ProjectListResponse = PaginatedResponse<Project>;

/**
 * Single project response
 */
export type ProjectResponse = ApiResponse<Project>;

/**
 * Project hierarchy node for tree structure
 */
export interface ProjectHierarchyNode extends Project {
  /** Child projects */
  children: ProjectHierarchyNode[];
  /** Depth level in the hierarchy */
  level: number;
}

/**
 * Project timeline event types
 */
export enum ProjectTimelineEventType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  MILESTONE = 'MILESTONE',
  TASK_COMPLETION = 'TASK_COMPLETION',
  MEMBER_CHANGE = 'MEMBER_CHANGE'
}

/**
 * Project timeline event
 */
export interface ProjectTimelineEvent {
  /** Event ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Event type */
  type: ProjectTimelineEventType;
  /** Event timestamp */
  timestamp: Date;
  /** Event metadata */
  metadata: Record<string, unknown>;
  /** User ID who triggered the event */
  userId: string;
}