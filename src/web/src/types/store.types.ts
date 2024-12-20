/**
 * @fileoverview Redux store type definitions for the Task Management System
 * Provides comprehensive type safety for state management, actions, and reducers
 * @version 1.0.0
 */

import { ThunkAction, Action } from '@reduxjs/toolkit'; // v2.0.0
import { LoadingState } from './common.types';
import { AuthState, AuthUser, AuthTokens } from './auth.types';
import { Task, TaskStatus, TaskPriority } from './task.types';
import { Project, ProjectStatus } from './project.types';
import { AnalyticsMetrics, AnalyticsTimeRange } from './analytics.types';

/**
 * Task state slice interface with comprehensive task management features
 */
export interface TaskState {
  items: Task[];
  selectedTask: Task | null;
  loading: LoadingState;
  error: ErrorState | null;
  filters: TaskFilters;
  totalCount: number;
  lastUpdated: Date | null;
}

/**
 * Project state slice interface for project management
 */
export interface ProjectState {
  items: Project[];
  selectedProject: Project | null;
  loading: LoadingState;
  error: ErrorState | null;
  filters: {
    status: ProjectStatus[];
    search: string | null;
    dateRange: {
      startDate: Date | null;
      endDate: Date | null;
    };
  };
  totalCount: number;
  lastUpdated: Date | null;
}

/**
 * Authentication state slice interface with enhanced security features
 */
export interface AuthenticationState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  status: AuthState;
  loading: LoadingState;
  error: ErrorState | null;
  lastActivity: Date | null;
  sessionExpiry: Date | null;
}

/**
 * Analytics state slice interface for metrics and reporting
 */
export interface AnalyticsState {
  metrics: AnalyticsMetrics | null;
  timeRange: AnalyticsTimeRange;
  loading: LoadingState;
  error: ErrorState | null;
  comparisonData: AnalyticsMetrics | null;
  lastUpdated: Date | null;
}

/**
 * UI state slice interface for managing application-wide UI state
 */
export interface UIState {
  theme: 'light' | 'dark' | 'system';
  notifications: Notification[];
  sidebarExpanded: boolean;
  modalStack: string[];
  currentBreakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading: {
    global: boolean;
    operations: Record<string, boolean>;
  };
}

/**
 * Task filtering interface with comprehensive filter options
 */
export interface TaskFilters {
  searchQuery: string | null;
  status: TaskStatus[];
  priority: TaskPriority[];
  assigneeId: string | null;
  projectId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  showArchived: boolean;
}

/**
 * Enhanced notification interface for UI notifications
 */
export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  timestamp: Date;
  isRead: boolean;
  actionUrl: string | null;
  onAction: (() => void) | null;
}

/**
 * Detailed error state interface for better error handling
 */
export interface ErrorState {
  message: string | null;
  code: string | null;
  details: any | null;
  timestamp: Date | null;
  isDisplayed: boolean;
}

/**
 * Root state interface combining all feature states
 */
export interface RootState {
  auth: AuthenticationState;
  tasks: TaskState;
  projects: ProjectState;
  analytics: AnalyticsState;
  ui: UIState;
}

/**
 * Type-safe thunk action definition for async operations
 * Provides proper typing for thunk actions with the RootState
 */
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

/**
 * Type guard to check if an error is an ErrorState
 */
export function isErrorState(error: unknown): error is ErrorState {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error &&
    'timestamp' in error
  );
}

/**
 * Type guard to check if a notification is valid
 */
export function isValidNotification(notification: unknown): notification is Notification {
  return (
    typeof notification === 'object' &&
    notification !== null &&
    'id' in notification &&
    'message' in notification &&
    'type' in notification &&
    'timestamp' in notification
  );
}