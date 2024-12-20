/**
 * @fileoverview Common TypeScript type definitions for the Task Management System
 * Provides enterprise-grade type safety and standardization across the application
 * @version 1.0.0
 */

/**
 * Represents the status of various entities in the system
 * Used for tasks, projects, and other stateful entities
 */
export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Represents priority levels for tasks and projects
 * Provides clear hierarchical importance levels
 */
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * Generic API response wrapper ensuring consistent response handling
 * @template T - The type of data contained in the response
 */
export interface ApiResponse<T> {
  /** The actual response data */
  data: T;
  /** Indicates if the operation was successful */
  success: boolean;
  /** Human-readable message about the operation */
  message: string;
  /** Unix timestamp of when the response was generated */
  timestamp: number;
  /** Unique identifier for tracing requests across the system */
  correlationId: string;
}

/**
 * Standardized pagination response structure
 * @template T - The type of items being paginated
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  items: T[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of pages available */
  totalPages: number;
  /** Indicates if there is a next page available */
  hasNextPage: boolean;
  /** Indicates if there is a previous page available */
  hasPreviousPage: boolean;
}

/**
 * Comprehensive error response structure for error handling
 * Provides detailed information for debugging and user feedback
 */
export interface ErrorResponse {
  /** Error code for categorizing the error */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details, field-specific errors */
  details: Record<string, string>;
  /** Stack trace (only included in development) */
  stack?: string;
  /** Correlation ID for error tracking */
  correlationId: string;
}

/**
 * Sort direction options for query ordering
 * Used consistently across all sortable endpoints
 */
export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC'
}

/**
 * Date range structure with timezone support
 * Used for time-based filtering and reporting
 */
export interface DateRange {
  /** Start date of the range */
  startDate: Date;
  /** End date of the range */
  endDate: Date;
  /** IANA timezone identifier */
  timezone: string;
}

/**
 * Loading state type for async operations
 * Provides consistent state management across the application
 */
export type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed';

/**
 * Type guard to check if a response is an error response
 * @param response - The response to check
 * @returns True if the response is an error response
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'code' in response &&
    'message' in response
  );
}

/**
 * Type guard to check if a response is paginated
 * @param response - The response to check
 * @returns True if the response is a paginated response
 */
export function isPaginatedResponse<T>(
  response: unknown
): response is PaginatedResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'items' in response &&
    'total' in response &&
    'page' in response
  );
}

// Export additional type utilities for common use cases
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ReadonlyDate = Readonly<Date>;
export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};