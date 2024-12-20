/**
 * @fileoverview Authentication and Authorization Service Interface
 * @version 1.0.0
 * 
 * Defines the contract for authentication and authorization operations with enhanced
 * security features including MFA support, token management, and RBAC implementation.
 * Follows enterprise security best practices and compliance requirements.
 */

import { IService } from '../core/interfaces/IService';
import { UserRole, LoginCredentials, RegisterData, AuthTokens, JwtCustomPayload, MfaVerificationData } from '../types/auth.types';
import { JwtPayload } from 'jsonwebtoken'; // ^9.0.0

/**
 * Enhanced authentication service interface extending base service functionality
 * with comprehensive security features and token management capabilities.
 * 
 * @extends {IService<User, RegisterData, never>}
 */
export interface IAuth extends IService<User, RegisterData, never> {
  /**
   * Authenticates user credentials with MFA support and enhanced security checks
   * 
   * @param {LoginCredentials} credentials - User login credentials with optional MFA token
   * @returns {Promise<AuthTokens>} Authentication tokens if login successful
   * @throws {AuthenticationError} If credentials are invalid
   * @throws {MfaRequiredError} If MFA is required but not provided
   * @throws {RateLimitError} If rate limit is exceeded
   */
  login(credentials: LoginCredentials): Promise<AuthTokens>;

  /**
   * Validates refresh token and issues new access token with security checks
   * 
   * @param {string} refreshToken - Valid refresh token
   * @returns {Promise<AuthTokens>} New authentication tokens
   * @throws {TokenValidationError} If refresh token is invalid or expired
   * @throws {SecurityError} If token reuse is detected
   */
  refreshToken(refreshToken: string): Promise<AuthTokens>;

  /**
   * Validates access token and extracts payload with enhanced security checks
   * 
   * @param {string} token - JWT access token
   * @returns {Promise<JwtCustomPayload>} Decoded token payload
   * @throws {TokenValidationError} If token is invalid or expired
   * @throws {SecurityError} If token has been revoked
   */
  validateToken(token: string): Promise<JwtCustomPayload>;

  /**
   * Validates multi-factor authentication token with brute force protection
   * 
   * @param {string} userId - User identifier
   * @param {string} mfaToken - MFA token to validate
   * @returns {Promise<boolean>} True if MFA token is valid
   * @throws {MfaValidationError} If token is invalid or expired
   * @throws {SecurityError} If max attempts exceeded
   */
  validateMfa(userId: string, mfaToken: string): Promise<boolean>;

  /**
   * Initiates MFA setup process with secure secret generation
   * 
   * @param {string} userId - User identifier
   * @returns {Promise<MfaVerificationData>} MFA setup data including QR code
   * @throws {MfaSetupError} If MFA setup fails
   */
  setupMfa(userId: string): Promise<MfaVerificationData>;

  /**
   * Revokes specific authentication token with security event logging
   * 
   * @param {string} token - Token to revoke
   * @param {string} userId - User identifier
   * @returns {Promise<void>}
   * @throws {TokenRevocationError} If token revocation fails
   */
  revokeToken(token: string, userId: string): Promise<void>;

  /**
   * Terminates all active sessions for a user with security notifications
   * 
   * @param {string} userId - User identifier
   * @param {string} currentToken - Current session token to preserve (optional)
   * @returns {Promise<void>}
   * @throws {LogoutError} If session termination fails
   */
  logout(userId: string, currentToken?: string): Promise<void>;

  /**
   * Validates user permissions against required access level
   * 
   * @param {string} userId - User identifier
   * @param {string[]} requiredPermissions - Required permissions
   * @param {UserRole} minimumRole - Minimum required role
   * @returns {Promise<boolean>} True if user has required permissions
   * @throws {AuthorizationError} If permission validation fails
   */
  validatePermissions(
    userId: string,
    requiredPermissions: string[],
    minimumRole: UserRole
  ): Promise<boolean>;

  /**
   * Generates secure password reset token with expiration
   * 
   * @param {string} email - User email address
   * @returns {Promise<string>} Password reset token
   * @throws {ResetTokenError} If token generation fails
   */
  generatePasswordResetToken(email: string): Promise<string>;

  /**
   * Validates and processes password reset with security checks
   * 
   * @param {string} token - Password reset token
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} True if password reset successful
   * @throws {ResetValidationError} If token is invalid or expired
   * @throws {PasswordPolicyError} If password doesn't meet requirements
   */
  resetPassword(token: string, newPassword: string): Promise<boolean>;
}

/**
 * Custom error types for authentication operations
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export class MfaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MfaValidationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}