/**
 * @fileoverview Application route constants for consistent routing across the application
 * @version 1.0.0
 * 
 * This file defines all application routes as TypeScript constants to ensure
 * consistent and type-safe routing throughout the application. Routes are organized
 * by feature domain (auth, dashboard, projects, tasks) and include support for
 * dynamic parameters and error handling.
 */

/**
 * Authentication related route paths
 * Includes comprehensive security flow support including MFA and password reset
 */
export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  RESET_PASSWORD: '/auth/reset-password',
  MFA_VERIFICATION: '/auth/mfa',
  LOGOUT: '/auth/logout'
} as const;

/**
 * Dashboard and analytics route paths
 * Provides access to main dashboard features and real-time activity monitoring
 */
export const DASHBOARD_ROUTES = {
  HOME: '/dashboard',
  ANALYTICS: '/dashboard/analytics',
  REPORTS: '/dashboard/reports',
  TEAM_ACTIVITY: '/dashboard/activity',
  NOTIFICATIONS: '/dashboard/notifications'
} as const;

/**
 * Project management route paths
 * Supports project lifecycle management with team and timeline views
 * Dynamic route parameters are denoted with :id pattern
 */
export const PROJECT_ROUTES = {
  LIST: '/projects',
  CREATE: '/projects/create',
  DETAIL: '/projects/:id',
  SETTINGS: '/projects/:id/settings',
  TEAM: '/projects/:id/team',
  TIMELINE: '/projects/:id/timeline'
} as const;

/**
 * Task management route paths
 * Enables comprehensive task management with support for comments and attachments
 * Dynamic route parameters are denoted with :id pattern
 */
export const TASK_ROUTES = {
  LIST: '/tasks',
  CREATE: '/tasks/create',
  DETAIL: '/tasks/:id',
  COMMENTS: '/tasks/:id/comments',
  ATTACHMENTS: '/tasks/:id/attachments'
} as const;

/**
 * Error handling route paths
 * Provides routes for various error scenarios and unauthorized access
 */
export const ERROR_ROUTES = {
  NOT_FOUND: '/404',
  SERVER_ERROR: '/500',
  FORBIDDEN: '/403',
  UNAUTHORIZED: '/401'
} as const;

/**
 * Application root route
 * Represents the entry point of the application
 */
export const ROOT_ROUTE = '/' as const;

/**
 * Default redirect route after successful authentication
 * Users are redirected to the dashboard by default
 */
export const DEFAULT_REDIRECT = '/dashboard' as const;

/**
 * Type definitions for route parameters to ensure type safety when using dynamic routes
 */
export type RouteParams = {
  id: string;
};

/**
 * Helper type to extract all possible route values
 * Useful for route validation and type checking
 */
export type AppRoutes = 
  | typeof AUTH_ROUTES[keyof typeof AUTH_ROUTES]
  | typeof DASHBOARD_ROUTES[keyof typeof DASHBOARD_ROUTES]
  | typeof PROJECT_ROUTES[keyof typeof PROJECT_ROUTES]
  | typeof TASK_ROUTES[keyof typeof TASK_ROUTES]
  | typeof ERROR_ROUTES[keyof typeof ERROR_ROUTES]
  | typeof ROOT_ROUTE
  | typeof DEFAULT_REDIRECT;

/**
 * Helper function to replace route parameters with actual values
 * @param route The route pattern containing parameters
 * @param params The parameters to replace in the route
 * @returns The route with replaced parameters
 */
export const replaceRouteParams = (route: string, params: Partial<RouteParams>): string => {
  let result = route;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`:${key}`, value);
  });
  return result;
};