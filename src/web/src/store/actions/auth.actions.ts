/**
 * @fileoverview Redux Authentication Action Creators
 * @version 1.0.0
 * 
 * Implements comprehensive authentication action creators with enhanced security features
 * including OAuth 2.0/OIDC, JWT management, MFA verification, and secure session handling.
 */

import { createAction } from '@reduxjs/toolkit';
import { 
  LoginCredentials, 
  RegisterData, 
  AuthTokens, 
  AuthUser, 
  MfaVerificationData, 
  AuthResponse, 
  AuthProvider, 
  AuthState, 
  TokenValidationResponse, 
  SecurityConfig 
} from '../../types/auth.types';
import { authService } from '../../services/auth.service';

// Action type prefix for authentication actions
const AUTH_ACTION_PREFIX = 'auth/' as const;

// Session management constants
const DEFAULT_SESSION_TIMEOUT = 3600000; // 1 hour
const MAX_LOGIN_ATTEMPTS = 3;
const TOKEN_REFRESH_INTERVAL = 300000; // 5 minutes

/**
 * Helper function to create type-safe authentication actions with security validations
 */
const createAuthAction = <T>(type: string) => 
  createAction<T>(`${AUTH_ACTION_PREFIX}${type}`);

/**
 * Login request action with provider selection and security validation
 */
export const loginRequest = createAuthAction<LoginCredentials & { provider: AuthProvider }>(
  'LOGIN_REQUEST'
);

/**
 * Login success action with enhanced session management
 */
export const loginSuccess = createAuthAction<AuthResponse & { sessionTimeout: number }>(
  'LOGIN_SUCCESS'
);

/**
 * Login failure action with typed error handling
 */
export const loginFailure = createAuthAction<{ error: string; attempts: number }>(
  'LOGIN_FAILURE'
);

/**
 * MFA verification request action
 */
export const mfaVerificationRequest = createAuthAction<MfaVerificationData>(
  'MFA_VERIFICATION_REQUEST'
);

/**
 * MFA verification success action
 */
export const mfaVerificationSuccess = createAuthAction<void>(
  'MFA_VERIFICATION_SUCCESS'
);

/**
 * MFA verification failure action
 */
export const mfaVerificationFailure = createAuthAction<{ error: string }>(
  'MFA_VERIFICATION_FAILURE'
);

/**
 * Token refresh request action for session maintenance
 */
export const refreshTokenRequest = createAuthAction<void>(
  'REFRESH_TOKEN_REQUEST'
);

/**
 * Token refresh success action
 */
export const refreshTokenSuccess = createAuthAction<AuthTokens>(
  'REFRESH_TOKEN_SUCCESS'
);

/**
 * Token refresh failure action
 */
export const refreshTokenFailure = createAuthAction<{ error: string }>(
  'REFRESH_TOKEN_FAILURE'
);

/**
 * Logout request action with session cleanup
 */
export const logoutRequest = createAuthAction<void>(
  'LOGOUT_REQUEST'
);

/**
 * Logout success action
 */
export const logoutSuccess = createAuthAction<void>(
  'LOGOUT_SUCCESS'
);

/**
 * Logout failure action
 */
export const logoutFailure = createAuthAction<{ error: string }>(
  'LOGOUT_FAILURE'
);

/**
 * Session timeout action for security enforcement
 */
export const sessionTimeout = createAuthAction<void>(
  'SESSION_TIMEOUT'
);

/**
 * Token validation request action
 */
export const validateTokenRequest = createAuthAction<void>(
  'VALIDATE_TOKEN_REQUEST'
);

/**
 * Token validation success action
 */
export const validateTokenSuccess = createAuthAction<TokenValidationResponse>(
  'VALIDATE_TOKEN_SUCCESS'
);

/**
 * Token validation failure action
 */
export const validateTokenFailure = createAuthAction<{ error: string }>(
  'VALIDATE_TOKEN_FAILURE'
);

/**
 * Update auth state action for state management
 */
export const updateAuthState = createAuthAction<{ 
  state: AuthState; 
  user: AuthUser | null;
}>('UPDATE_AUTH_STATE');

/**
 * Rate limit exceeded action for security enforcement
 */
export const rateLimitExceeded = createAuthAction<{ 
  retryAfter: number;
}>('RATE_LIMIT_EXCEEDED');

/**
 * Security event action for audit logging
 */
export const securityEvent = createAuthAction<{
  type: string;
  metadata: Record<string, unknown>;
}>('SECURITY_EVENT');

/**
 * OAuth callback action for third-party authentication
 */
export const oauthCallback = createAuthAction<{
  provider: AuthProvider;
  code: string;
  state: string;
}>('OAUTH_CALLBACK');

/**
 * Password reset request action
 */
export const passwordResetRequest = createAuthAction<{
  email: string;
}>('PASSWORD_RESET_REQUEST');

/**
 * Password reset success action
 */
export const passwordResetSuccess = createAuthAction<void>(
  'PASSWORD_RESET_SUCCESS'
);

/**
 * Password reset failure action
 */
export const passwordResetFailure = createAuthAction<{ error: string }>(
  'PASSWORD_RESET_FAILURE'
);