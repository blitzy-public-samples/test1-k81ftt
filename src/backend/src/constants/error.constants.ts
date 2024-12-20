/**
 * @fileoverview Error constants and types for the Task Management System
 * Implements a comprehensive error handling system with type safety and categorization
 * Version: 1.0.0
 */

/**
 * Enum for error categories providing type-safe error classification
 */
export enum ERROR_CATEGORIES {
  AUTHENTICATION = 'AUTHENTICATION',
  TASK = 'TASK',
  PROJECT = 'PROJECT',
  FILE = 'FILE',
  INTEGRATION = 'INTEGRATION'
}

/**
 * Type definition for error code structure
 */
export type ErrorCode = {
  code: string;
  category: ERROR_CATEGORIES;
};

/**
 * Error code prefixes for different categories
 */
const ERROR_PREFIX = {
  AUTH: '1',
  TASK: '2',
  PROJECT: '3',
  FILE: '4',
  INTEGRATION: '5'
} as const;

/**
 * Authentication error codes (1000-1999)
 */
export const AUTH_ERROR_CODES = {
  UNAUTHORIZED: '1001',
  INVALID_CREDENTIALS: '1002',
  TOKEN_EXPIRED: '1003',
  INVALID_TOKEN: '1004',
  SESSION_EXPIRED: '1005',
  MFA_REQUIRED: '1006',
  INVALID_MFA_CODE: '1007',
  ACCOUNT_LOCKED: '1008',
  PASSWORD_EXPIRED: '1009',
  SSO_ERROR: '1010'
} as const;

/**
 * Task operation error codes (2000-2999)
 */
export const TASK_ERROR_CODES = {
  TASK_NOT_FOUND: '2001',
  INVALID_STATUS: '2002',
  INVALID_PRIORITY: '2003',
  INVALID_ASSIGNMENT: '2004',
  DUPLICATE_TASK: '2005',
  DEPENDENCY_CONFLICT: '2006',
  INVALID_DUE_DATE: '2007',
  MAX_ATTACHMENTS_EXCEEDED: '2008',
  INVALID_TASK_TYPE: '2009',
  TASK_LOCKED: '2010'
} as const;

/**
 * Project operation error codes (3000-3999)
 */
export const PROJECT_ERROR_CODES = {
  PROJECT_NOT_FOUND: '3001',
  INVALID_PROJECT_STATUS: '3002',
  DUPLICATE_PROJECT: '3003',
  INVALID_MEMBER_ROLE: '3004',
  PROJECT_LIMIT_EXCEEDED: '3005',
  INVALID_PROJECT_TYPE: '3006',
  PROJECT_ARCHIVED: '3007',
  INVALID_TIMELINE: '3008',
  BUDGET_EXCEEDED: '3009',
  RESOURCE_CONFLICT: '3010'
} as const;

/**
 * File operation error codes (4000-4999)
 */
export const FILE_ERROR_CODES = {
  FILE_NOT_FOUND: '4001',
  INVALID_FILE_TYPE: '4002',
  FILE_SIZE_EXCEEDED: '4003',
  UPLOAD_FAILED: '4004',
  DOWNLOAD_FAILED: '4005',
  STORAGE_LIMIT_EXCEEDED: '4006',
  FILE_CORRUPTED: '4007',
  VIRUS_DETECTED: '4008',
  FILE_LOCKED: '4009',
  VERSION_CONFLICT: '4010'
} as const;

/**
 * Integration error codes (5000-5999)
 */
export const INTEGRATION_ERROR_CODES = {
  API_ERROR: '5001',
  RATE_LIMIT_EXCEEDED: '5002',
  SERVICE_UNAVAILABLE: '5003',
  INVALID_RESPONSE: '5004',
  TIMEOUT: '5005',
  WEBHOOK_FAILED: '5006',
  INVALID_PAYLOAD: '5007',
  SYNC_FAILED: '5008',
  INTEGRATION_DISABLED: '5009',
  AUTH_CONFIGURATION_ERROR: '5010'
} as const;

/**
 * User-friendly error messages mapped to error codes
 * Ensures security by not exposing sensitive system information
 */
export const ERROR_MESSAGES = {
  AUTH_ERRORS: {
    [AUTH_ERROR_CODES.UNAUTHORIZED]: 'Access denied. Please log in to continue.',
    [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid username or password.',
    [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
    [AUTH_ERROR_CODES.INVALID_TOKEN]: 'Invalid authentication token.',
    [AUTH_ERROR_CODES.SESSION_EXPIRED]: 'Your session has timed out. Please log in again.',
    [AUTH_ERROR_CODES.MFA_REQUIRED]: 'Multi-factor authentication is required.',
    [AUTH_ERROR_CODES.INVALID_MFA_CODE]: 'Invalid verification code.',
    [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: 'Account has been locked. Please contact support.',
    [AUTH_ERROR_CODES.PASSWORD_EXPIRED]: 'Password has expired. Please reset your password.',
    [AUTH_ERROR_CODES.SSO_ERROR]: 'Single sign-on authentication failed.'
  },
  TASK_ERRORS: {
    [TASK_ERROR_CODES.TASK_NOT_FOUND]: 'The requested task could not be found.',
    [TASK_ERROR_CODES.INVALID_STATUS]: 'Invalid task status provided.',
    [TASK_ERROR_CODES.INVALID_PRIORITY]: 'Invalid task priority level.',
    [TASK_ERROR_CODES.INVALID_ASSIGNMENT]: 'Invalid task assignment.',
    [TASK_ERROR_CODES.DUPLICATE_TASK]: 'A task with this name already exists.',
    [TASK_ERROR_CODES.DEPENDENCY_CONFLICT]: 'Task dependency conflict detected.',
    [TASK_ERROR_CODES.INVALID_DUE_DATE]: 'Invalid due date provided.',
    [TASK_ERROR_CODES.MAX_ATTACHMENTS_EXCEEDED]: 'Maximum number of attachments exceeded.',
    [TASK_ERROR_CODES.INVALID_TASK_TYPE]: 'Invalid task type specified.',
    [TASK_ERROR_CODES.TASK_LOCKED]: 'Task is locked for editing.'
  },
  PROJECT_ERRORS: {
    [PROJECT_ERROR_CODES.PROJECT_NOT_FOUND]: 'The requested project could not be found.',
    [PROJECT_ERROR_CODES.INVALID_PROJECT_STATUS]: 'Invalid project status provided.',
    [PROJECT_ERROR_CODES.DUPLICATE_PROJECT]: 'A project with this name already exists.',
    [PROJECT_ERROR_CODES.INVALID_MEMBER_ROLE]: 'Invalid project member role.',
    [PROJECT_ERROR_CODES.PROJECT_LIMIT_EXCEEDED]: 'Project limit has been exceeded.',
    [PROJECT_ERROR_CODES.INVALID_PROJECT_TYPE]: 'Invalid project type specified.',
    [PROJECT_ERROR_CODES.PROJECT_ARCHIVED]: 'Project is archived and cannot be modified.',
    [PROJECT_ERROR_CODES.INVALID_TIMELINE]: 'Invalid project timeline.',
    [PROJECT_ERROR_CODES.BUDGET_EXCEEDED]: 'Project budget limit exceeded.',
    [PROJECT_ERROR_CODES.RESOURCE_CONFLICT]: 'Resource conflict detected.'
  },
  FILE_ERRORS: {
    [FILE_ERROR_CODES.FILE_NOT_FOUND]: 'The requested file could not be found.',
    [FILE_ERROR_CODES.INVALID_FILE_TYPE]: 'File type is not supported.',
    [FILE_ERROR_CODES.FILE_SIZE_EXCEEDED]: 'File size exceeds the maximum limit.',
    [FILE_ERROR_CODES.UPLOAD_FAILED]: 'File upload failed. Please try again.',
    [FILE_ERROR_CODES.DOWNLOAD_FAILED]: 'File download failed. Please try again.',
    [FILE_ERROR_CODES.STORAGE_LIMIT_EXCEEDED]: 'Storage limit exceeded.',
    [FILE_ERROR_CODES.FILE_CORRUPTED]: 'File appears to be corrupted.',
    [FILE_ERROR_CODES.VIRUS_DETECTED]: 'Security threat detected in file.',
    [FILE_ERROR_CODES.FILE_LOCKED]: 'File is locked for editing.',
    [FILE_ERROR_CODES.VERSION_CONFLICT]: 'File version conflict detected.'
  },
  INTEGRATION_ERRORS: {
    [INTEGRATION_ERROR_CODES.API_ERROR]: 'External service error occurred.',
    [INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later.',
    [INTEGRATION_ERROR_CODES.SERVICE_UNAVAILABLE]: 'External service is currently unavailable.',
    [INTEGRATION_ERROR_CODES.INVALID_RESPONSE]: 'Invalid response from external service.',
    [INTEGRATION_ERROR_CODES.TIMEOUT]: 'Request timed out. Please try again.',
    [INTEGRATION_ERROR_CODES.WEBHOOK_FAILED]: 'Webhook delivery failed.',
    [INTEGRATION_ERROR_CODES.INVALID_PAYLOAD]: 'Invalid data format received.',
    [INTEGRATION_ERROR_CODES.SYNC_FAILED]: 'Synchronization failed.',
    [INTEGRATION_ERROR_CODES.INTEGRATION_DISABLED]: 'Integration is currently disabled.',
    [INTEGRATION_ERROR_CODES.AUTH_CONFIGURATION_ERROR]: 'Integration authentication configuration error.'
  }
} as const;