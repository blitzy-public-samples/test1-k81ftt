/**
 * @fileoverview Authentication and Authorization Type Definitions
 * Provides comprehensive type safety for auth-related functionality
 * @version 1.0.0
 */

import { ApiResponse } from './common.types';

/**
 * Enumeration of user roles for Role-Based Access Control (RBAC)
 * Aligned with system authorization model
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST'
}

/**
 * Supported authentication providers
 * Extensible for additional OAuth providers
 */
export enum AuthProvider {
  LOCAL = 'LOCAL',
  AZURE_AD = 'AZURE_AD',
  OAUTH2 = 'OAUTH2'
}

/**
 * Comprehensive authentication states
 * Covers all possible auth flow scenarios including security states
 */
export enum AuthState {
  AUTHENTICATED = 'AUTHENTICATED',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  MFA_REQUIRED = 'MFA_REQUIRED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  TOKEN_REFRESH_REQUIRED = 'TOKEN_REFRESH_REQUIRED',
  PASSWORD_RESET_REQUIRED = 'PASSWORD_RESET_REQUIRED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED'
}

/**
 * Authentication tokens with comprehensive security metadata
 * Supports multiple token types and security features
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer' | 'JWT';
  scope: string[];
  issuer: string;
}

/**
 * Enhanced authenticated user data with security information
 * Includes comprehensive user profile and security status
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  provider: AuthProvider;
  lastLogin: Date;
  mfaEnabled: boolean;
  accountStatus: 'active' | 'suspended' | 'locked';
}

/**
 * Multi-Factor Authentication verification data
 * Supports multiple MFA methods with enhanced security tracking
 */
export interface MfaVerificationData {
  code: string;
  userId: string;
  method: 'totp' | 'sms' | 'email';
  timestamp: number;
}

/**
 * Login credentials for local authentication
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Password reset request data
 */
export interface PasswordResetRequest {
  email: string;
  token?: string;
  newPassword?: string;
}

/**
 * OAuth2 authentication response
 */
export interface OAuth2Response {
  code: string;
  state: string;
  provider: AuthProvider;
}

/**
 * Session security metadata
 */
export interface SessionMetadata {
  createdAt: number;
  lastActive: number;
  ipAddress: string;
  userAgent: string;
  deviceId: string;
}

/**
 * Type definitions for auth-related API responses
 */
export interface AuthApiResponses {
  login: ApiResponse<{ user: AuthUser; tokens: AuthTokens }>;
  refresh: ApiResponse<{ tokens: AuthTokens }>;
  mfaVerify: ApiResponse<{ verified: boolean }>;
  passwordReset: ApiResponse<{ success: boolean }>;
}

/**
 * Permission levels for different system resources
 */
export interface ResourcePermissions {
  read: boolean;
  write: boolean;
  delete: boolean;
  admin: boolean;
}

/**
 * Role-based permissions mapping
 */
export type RolePermissions = Record<UserRole, Record<string, ResourcePermissions>>;

/**
 * Security event types for audit logging
 */
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}

/**
 * Security event data for audit logging
 */
export interface SecurityEvent {
  type: SecurityEventType;
  userId: string;
  timestamp: number;
  metadata: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
}

/**
 * Type guard to check if a user has required permissions
 * @param user - The authenticated user
 * @param requiredRole - The minimum required role
 */
export function hasRequiredRole(user: AuthUser, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.ADMIN]: 4,
    [UserRole.MANAGER]: 3,
    [UserRole.MEMBER]: 2,
    [UserRole.GUEST]: 1
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}