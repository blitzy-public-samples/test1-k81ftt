// @ts-strict
import { BaseEntity, Pagination } from '../types/common.types';

/**
 * Enum for categorizing error codes based on operation types
 * @version 1.0.0
 */
export enum ErrorCategory {
  Authentication = '1000-1999',
  TaskOperations = '2000-2999',
  ProjectOperations = '3000-3999',
  FileOperations = '4000-4999',
  Integration = '5000-5999'
}

/**
 * Interface for validation error details
 * Provides structured format for field-level validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Enhanced interface for detailed error information with categorization
 * Supports comprehensive error tracking and debugging
 */
export interface ErrorDetail {
  code: number;
  category: ErrorCategory;
  type: string;
  details: string[];
  metadata?: Record<string, unknown>;
  validationErrors?: ValidationError[];
}

/**
 * Interface for response performance metadata
 * Enables tracking of API performance metrics
 */
export interface ResponseMetadata {
  responseTime: number;  // Response time in milliseconds
  version: string;      // API version
  requestId: string;    // Unique request identifier
  custom?: Record<string, unknown>;  // Custom metadata fields
}

/**
 * Generic interface for standard API responses with performance tracking
 * @template T - Type of the response data
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  metadata: ResponseMetadata;
}

/**
 * Interface for API error responses with detailed error information
 * Provides comprehensive error details for debugging and client handling
 */
export interface ErrorResponse {
  success: boolean;
  message: string;
  error: ErrorDetail;
  metadata: ResponseMetadata;
}

/**
 * Type alias for successful API responses
 * @template T - Type of the successful response data
 */
export type SuccessResponse<T> = ApiResponse<T>;

/**
 * Type alias for paginated list responses
 * @template T - Type of the list items
 */
export type ListResponse<T extends BaseEntity> = ApiResponse<{
  items: T[];
  pagination: Pagination;
}>;

/**
 * Type guard to check if a response is an error response
 * @param response - API response to check
 * @returns boolean indicating if the response is an error response
 */
export function isErrorResponse(response: ApiResponse<unknown> | ErrorResponse): response is ErrorResponse {
  return !response.success && 'error' in response;
}

/**
 * Type guard to check if a response is a success response
 * @param response - API response to check
 * @returns boolean indicating if the response is a success response
 */
export function isSuccessResponse<T>(response: ApiResponse<T> | ErrorResponse): response is ApiResponse<T> {
  return response.success && 'data' in response;
}

/**
 * Type guard to check if a response is a list response
 * @param response - API response to check
 * @returns boolean indicating if the response is a list response
 */
export function isListResponse<T extends BaseEntity>(
  response: ApiResponse<unknown> | ListResponse<T>
): response is ListResponse<T> {
  return response.success && 
         'data' in response && 
         response.data !== null && 
         'items' in response.data && 
         'pagination' in response.data;
}