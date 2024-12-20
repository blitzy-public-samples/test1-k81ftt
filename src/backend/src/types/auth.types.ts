// @ts-nocheck
/**
 * Authentication and Authorization Type Definitions
 * Version: 1.0.0
 * 
 * This module provides comprehensive type definitions for the authentication and
 * authorization system, supporting multiple auth methods and RBAC implementation.
 */

// External imports
import { JwtPayload } from 'jsonwebtoken'; // ^9.0.0

/**
 * Enumeration of user roles for RBAC implementation.
 * Follows strict role hierarchy for granular access control.
 */
export enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    MEMBER = 'MEMBER',
    GUEST = 'GUEST'
}

/**
 * Supported authentication provider types.
 * Enables multiple authentication methods as per security requirements.
 */
export enum AuthProvider {
    LOCAL = 'LOCAL',
    AZURE_AD = 'AZURE_AD',
    OAUTH2 = 'OAUTH2'
}

/**
 * Enhanced login credentials interface with MFA support.
 * Implements secure authentication with optional multi-factor verification.
 */
export interface LoginCredentials {
    email: string;
    password: string;
    provider: AuthProvider;
    mfaToken?: string;
}

/**
 * User registration data interface with mandatory terms acceptance.
 * Ensures complete user profile creation with legal compliance.
 */
export interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    acceptedTerms: boolean;
}

/**
 * Authentication tokens interface with enhanced metadata.
 * Provides comprehensive token management for secure sessions.
 */
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
}

/**
 * Extended JWT payload interface with enhanced security features.
 * Includes role-based access control and MFA status tracking.
 */
export interface JwtCustomPayload extends JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    permissions: string[];
    mfaEnabled: boolean;
}

/**
 * MFA verification interface with security enhancements.
 * Implements attempt tracking for brute force prevention.
 */
export interface MfaVerificationData {
    code: string;
    userId: string;
    timestamp: number;
    attempt: number;
}