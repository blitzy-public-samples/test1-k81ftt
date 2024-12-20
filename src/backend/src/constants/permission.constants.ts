/**
 * Permission Constants
 * Version: 1.0.0
 * 
 * Defines comprehensive permission constants for role-based access control (RBAC)
 * implementing a hierarchical permission system with granular access control.
 */

import { UserRole } from '../types/auth.types';

/**
 * Base action permissions that apply across all resources.
 * These represent the fundamental CRUD operations available.
 */
export const ACTION_PERMISSIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    ALL: '*'
} as const;

/**
 * Detailed resource-specific permissions including both CRUD and specialized actions.
 * Each resource type has its own set of granular permissions for fine-tuned access control.
 */
export const RESOURCE_PERMISSIONS = {
    TASKS: {
        CREATE: ACTION_PERMISSIONS.CREATE,
        READ: ACTION_PERMISSIONS.READ,
        UPDATE: ACTION_PERMISSIONS.UPDATE,
        DELETE: ACTION_PERMISSIONS.DELETE,
        ASSIGN: 'assign',
        COMMENT: 'comment',
        ATTACH_FILES: 'attach_files',
        SET_PRIORITY: 'set_priority',
        SET_DUE_DATE: 'set_due_date'
    },

    PROJECTS: {
        CREATE: ACTION_PERMISSIONS.CREATE,
        READ: ACTION_PERMISSIONS.READ,
        UPDATE: ACTION_PERMISSIONS.UPDATE,
        DELETE: ACTION_PERMISSIONS.DELETE,
        MANAGE_MEMBERS: 'manage_members',
        MANAGE_SETTINGS: 'manage_settings',
        VIEW_TIMELINE: 'view_timeline',
        MANAGE_DEPENDENCIES: 'manage_dependencies'
    },

    USERS: {
        CREATE: ACTION_PERMISSIONS.CREATE,
        READ: ACTION_PERMISSIONS.READ,
        UPDATE: ACTION_PERMISSIONS.UPDATE,
        DELETE: ACTION_PERMISSIONS.DELETE,
        MANAGE_ROLES: 'manage_roles',
        VIEW_ACTIVITY: 'view_activity',
        MANAGE_PREFERENCES: 'manage_preferences'
    },

    REPORTS: {
        CREATE: ACTION_PERMISSIONS.CREATE,
        READ: ACTION_PERMISSIONS.READ,
        EXPORT: 'export',
        SCHEDULE: 'schedule',
        SHARE: 'share',
        CUSTOMIZE: 'customize'
    },

    SETTINGS: {
        READ: ACTION_PERMISSIONS.READ,
        UPDATE: ACTION_PERMISSIONS.UPDATE,
        MANAGE_INTEGRATIONS: 'manage_integrations',
        CONFIGURE_NOTIFICATIONS: 'configure_notifications',
        MANAGE_SECURITY: 'manage_security'
    }
} as const;

/**
 * Role-based permission mappings defining allowed actions per role.
 * Implements a hierarchical permission structure where higher roles
 * inherit permissions from lower roles and gain additional privileges.
 */
export const ROLE_PERMISSIONS = {
    [UserRole.ADMIN]: {
        TASKS: [ACTION_PERMISSIONS.ALL],
        PROJECTS: [ACTION_PERMISSIONS.ALL],
        USERS: [ACTION_PERMISSIONS.ALL],
        REPORTS: [ACTION_PERMISSIONS.ALL],
        SETTINGS: [ACTION_PERMISSIONS.ALL]
    },

    [UserRole.MANAGER]: {
        TASKS: [
            RESOURCE_PERMISSIONS.TASKS.CREATE,
            RESOURCE_PERMISSIONS.TASKS.READ,
            RESOURCE_PERMISSIONS.TASKS.UPDATE,
            RESOURCE_PERMISSIONS.TASKS.DELETE,
            RESOURCE_PERMISSIONS.TASKS.ASSIGN,
            RESOURCE_PERMISSIONS.TASKS.COMMENT,
            RESOURCE_PERMISSIONS.TASKS.SET_PRIORITY,
            RESOURCE_PERMISSIONS.TASKS.SET_DUE_DATE
        ],
        PROJECTS: [
            RESOURCE_PERMISSIONS.PROJECTS.READ,
            RESOURCE_PERMISSIONS.PROJECTS.UPDATE,
            RESOURCE_PERMISSIONS.PROJECTS.MANAGE_MEMBERS,
            RESOURCE_PERMISSIONS.PROJECTS.MANAGE_SETTINGS,
            RESOURCE_PERMISSIONS.PROJECTS.VIEW_TIMELINE
        ],
        USERS: [
            RESOURCE_PERMISSIONS.USERS.READ,
            RESOURCE_PERMISSIONS.USERS.VIEW_ACTIVITY
        ],
        REPORTS: [
            RESOURCE_PERMISSIONS.REPORTS.CREATE,
            RESOURCE_PERMISSIONS.REPORTS.READ,
            RESOURCE_PERMISSIONS.REPORTS.EXPORT,
            RESOURCE_PERMISSIONS.REPORTS.SCHEDULE,
            RESOURCE_PERMISSIONS.REPORTS.SHARE
        ],
        SETTINGS: [
            RESOURCE_PERMISSIONS.SETTINGS.READ,
            RESOURCE_PERMISSIONS.SETTINGS.CONFIGURE_NOTIFICATIONS
        ]
    },

    [UserRole.MEMBER]: {
        TASKS: [
            RESOURCE_PERMISSIONS.TASKS.CREATE,
            RESOURCE_PERMISSIONS.TASKS.READ,
            RESOURCE_PERMISSIONS.TASKS.UPDATE,
            RESOURCE_PERMISSIONS.TASKS.COMMENT,
            RESOURCE_PERMISSIONS.TASKS.ATTACH_FILES
        ],
        PROJECTS: [
            RESOURCE_PERMISSIONS.PROJECTS.READ,
            RESOURCE_PERMISSIONS.PROJECTS.VIEW_TIMELINE
        ],
        USERS: [
            RESOURCE_PERMISSIONS.USERS.READ
        ],
        REPORTS: [
            RESOURCE_PERMISSIONS.REPORTS.READ
        ],
        SETTINGS: [
            RESOURCE_PERMISSIONS.SETTINGS.READ
        ]
    },

    [UserRole.GUEST]: {
        TASKS: [
            RESOURCE_PERMISSIONS.TASKS.READ
        ],
        PROJECTS: [
            RESOURCE_PERMISSIONS.PROJECTS.READ
        ],
        USERS: [],
        REPORTS: [],
        SETTINGS: []
    }
} as const;