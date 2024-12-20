/**
 * User Interface Definitions
 * Version: 1.0.0
 * 
 * Comprehensive interface definitions for user entities in the enterprise task management system.
 * Implements security best practices, RBAC, and compliance requirements.
 * 
 * @package TaskManagement
 * @subpackage Interfaces
 */

import { BaseEntity } from '../types/common.types';
import { UserRole } from '../types/auth.types';

/**
 * Interface defining user preferences with accessibility and internationalization support.
 * Implements WCAG 2.1 Level AA compliance requirements.
 */
export interface IUserPreferences {
    /** User interface theme preference */
    theme: 'light' | 'dark' | 'system' | 'high-contrast';
    
    /** User's preferred language (ISO 639-1 code) */
    language: string;
    
    /** Notification preferences across multiple channels */
    notifications: {
        email: boolean;    // Email notifications
        push: boolean;     // Push notifications
        inApp: boolean;    // In-application notifications
        digest: boolean;   // Daily/weekly digest emails
    };
    
    /** User's timezone (IANA timezone identifier) */
    timezone: string;
    
    /** Preferred date format (ISO format) */
    dateFormat: string;
    
    /** Accessibility preferences for compliance with WCAG guidelines */
    accessibility: {
        screenReader: boolean;    // Screen reader optimization
        reduceMotion: boolean;    // Reduced motion preferences
        highContrast: boolean;    // High contrast mode
    };
}

/**
 * Core user interface implementing enterprise security features and RBAC.
 * Extends BaseEntity for standardized entity management.
 * 
 * @implements {BaseEntity}
 */
export interface IUser extends BaseEntity {
    /** User's email address (unique identifier) */
    email: string;
    
    /** User's first name */
    firstName: string;
    
    /** User's last name */
    lastName: string;
    
    /** User's role for RBAC implementation */
    role: UserRole;
    
    /** Account status flag */
    isActive: boolean;
    
    /** Hashed password (null for SSO users) */
    passwordHash: string | null;
    
    /** Multi-factor authentication status */
    mfaEnabled: boolean;
    
    /** Encrypted MFA secret (null if MFA disabled) */
    mfaSecret: string | null;
    
    /** Timestamp of last successful login */
    lastLoginAt: Date;
    
    /** Timestamp of last password change */
    lastPasswordChangeAt: Date | null;
    
    /** Counter for failed login attempts (security monitoring) */
    failedLoginAttempts: number;
    
    /** Account lockout timestamp */
    lockoutUntil: Date | null;
    
    /** User preferences including accessibility settings */
    preferences: IUserPreferences;
    
    /** Organization identifier for multi-tenant support */
    organizationId: string;
    
    /** Array of team identifiers the user belongs to */
    teams: string[];
}