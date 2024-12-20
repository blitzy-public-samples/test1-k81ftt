/**
 * @fileoverview API Constants for Task Management System
 * @version 1.0.0
 * 
 * This file defines comprehensive API-related constants including endpoints,
 * timeouts, status codes, and headers for frontend-backend communication
 * with TypeScript type safety.
 */

/**
 * API version prefix for all endpoints
 */
export const API_VERSION = 'v1';

/**
 * Type definitions for API endpoints
 */
type AuthEndpoints = {
    readonly LOGIN: string;
    readonly REGISTER: string;
    readonly LOGOUT: string;
    readonly REFRESH_TOKEN: string;
    readonly RESET_PASSWORD: string;
    readonly VERIFY_MFA: string;
    readonly CHANGE_PASSWORD: string;
    readonly VERIFY_EMAIL: string;
};

type TaskEndpoints = {
    readonly BASE: string;
    readonly BY_ID: string;
    readonly COMMENTS: string;
    readonly ATTACHMENTS: string;
    readonly HISTORY: string;
    readonly DEPENDENCIES: string;
    readonly ASSIGN: string;
    readonly BULK_UPDATE: string;
};

type ProjectEndpoints = {
    readonly BASE: string;
    readonly BY_ID: string;
    readonly MEMBERS: string;
    readonly TASKS: string;
    readonly ANALYTICS: string;
    readonly SETTINGS: string;
    readonly ROLES: string;
    readonly TIMELINE: string;
};

type AnalyticsEndpoints = {
    readonly DASHBOARD: string;
    readonly REPORTS: string;
    readonly PERFORMANCE: string;
    readonly EXPORT: string;
    readonly METRICS: string;
    readonly TRENDS: string;
    readonly CUSTOM: string;
};

type UserEndpoints = {
    readonly PROFILE: string;
    readonly PREFERENCES: string;
    readonly NOTIFICATIONS: string;
    readonly ACTIVITY: string;
};

/**
 * API endpoints for all features
 */
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        REFRESH_TOKEN: '/auth/refresh',
        RESET_PASSWORD: '/auth/reset-password',
        VERIFY_MFA: '/auth/verify-mfa',
        CHANGE_PASSWORD: '/auth/change-password',
        VERIFY_EMAIL: '/auth/verify-email'
    } as const satisfies AuthEndpoints,

    TASKS: {
        BASE: '/tasks',
        BY_ID: '/tasks/:id',
        COMMENTS: '/tasks/:id/comments',
        ATTACHMENTS: '/tasks/:id/attachments',
        HISTORY: '/tasks/:id/history',
        DEPENDENCIES: '/tasks/:id/dependencies',
        ASSIGN: '/tasks/:id/assign',
        BULK_UPDATE: '/tasks/bulk'
    } as const satisfies TaskEndpoints,

    PROJECTS: {
        BASE: '/projects',
        BY_ID: '/projects/:id',
        MEMBERS: '/projects/:id/members',
        TASKS: '/projects/:id/tasks',
        ANALYTICS: '/projects/:id/analytics',
        SETTINGS: '/projects/:id/settings',
        ROLES: '/projects/:id/roles',
        TIMELINE: '/projects/:id/timeline'
    } as const satisfies ProjectEndpoints,

    ANALYTICS: {
        DASHBOARD: '/analytics/dashboard',
        REPORTS: '/analytics/reports',
        PERFORMANCE: '/analytics/performance',
        EXPORT: '/analytics/export',
        METRICS: '/analytics/metrics',
        TRENDS: '/analytics/trends',
        CUSTOM: '/analytics/custom'
    } as const satisfies AnalyticsEndpoints,

    USERS: {
        PROFILE: '/users/profile',
        PREFERENCES: '/users/preferences',
        NOTIFICATIONS: '/users/notifications',
        ACTIVITY: '/users/activity'
    } as const satisfies UserEndpoints
} as const;

/**
 * API timeout constants in milliseconds
 * Ensures API response time < 500ms for standard operations
 * and handles long-running operations appropriately
 */
export const API_TIMEOUTS = {
    DEFAULT: 500,        // Standard API calls
    UPLOAD: 30000,       // File upload operations
    DOWNLOAD: 30000,     // File download operations
    ANALYTICS: 10000,    // Analytics processing
    REPORT_GENERATION: 20000,  // Report generation
    BULK_OPERATIONS: 15000     // Bulk data operations
} as const;

/**
 * Standard API headers including security headers
 */
export const API_HEADERS = {
    CONTENT_TYPE: 'application/json',
    ACCEPT: 'application/json',
    AUTHORIZATION: 'Authorization',
    REFRESH_TOKEN: 'X-Refresh-Token',
    CSRF_TOKEN: 'X-CSRF-Token',
    CORRELATION_ID: 'X-Correlation-ID',
    API_KEY: 'X-API-Key',
    TENANT_ID: 'X-Tenant-ID',
    CLIENT_VERSION: 'X-Client-Version'
} as const;

/**
 * HTTP status codes with detailed categorization
 * for proper error handling
 */
export const HTTP_STATUS = {
    SUCCESS: {
        OK: 200,
        CREATED: 201,
        ACCEPTED: 202,
        NO_CONTENT: 204
    },
    CLIENT_ERROR: {
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        VALIDATION_ERROR: 422,
        TOO_MANY_REQUESTS: 429,
        MFA_REQUIRED: 434,
        TOKEN_EXPIRED: 435
    },
    SERVER_ERROR: {
        INTERNAL_SERVER_ERROR: 500,
        BAD_GATEWAY: 502,
        SERVICE_UNAVAILABLE: 503,
        GATEWAY_TIMEOUT: 504,
        DATABASE_ERROR: 520,
        INTEGRATION_ERROR: 521
    }
} as const;

// Type exports for external usage
export type ApiEndpoints = typeof API_ENDPOINTS;
export type ApiTimeouts = typeof API_TIMEOUTS;
export type ApiHeaders = typeof API_HEADERS;
export type HttpStatus = typeof HTTP_STATUS;