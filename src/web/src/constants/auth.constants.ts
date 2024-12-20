/**
 * Authentication Constants
 * Version: 1.0.0
 * 
 * Contains all authentication-related constants including API endpoints,
 * storage keys, error messages, and configuration values for the frontend application.
 * Supports OAuth 2.0/OIDC, JWT, MFA, and password-based authentication methods.
 */

/**
 * API endpoint paths for all authentication operations
 * @constant
 */
export const AUTH_ENDPOINTS = {
  LOGIN: '/api/v1/auth/login',
  REGISTER: '/api/v1/auth/register',
  LOGOUT: '/api/v1/auth/logout',
  REFRESH_TOKEN: '/api/v1/auth/refresh',
  VERIFY_MFA: '/api/v1/auth/mfa/verify',
  OAUTH_CALLBACK: '/api/v1/auth/oauth/callback',
  PASSWORD_RESET: '/api/v1/auth/password/reset'
} as const;

/**
 * Local storage keys for authentication tokens and state
 * @constant
 */
export const TOKEN_STORAGE_KEYS = {
  ACCESS_TOKEN: 'taskmaster.auth.accessToken',
  REFRESH_TOKEN: 'taskmaster.auth.refreshToken',
  ID_TOKEN: 'taskmaster.auth.idToken',
  TOKEN_EXPIRY: 'taskmaster.auth.tokenExpiry',
  AUTH_STATE: 'taskmaster.auth.state'
} as const;

/**
 * Localized error messages for authentication failures
 * @constant
 */
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid username or password. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  MFA_REQUIRED: 'Multi-factor authentication is required to continue.',
  INVALID_MFA_CODE: 'Invalid verification code. Please try again.',
  ACCOUNT_LOCKED: 'Account temporarily locked due to multiple failed attempts.',
  PASSWORD_REQUIREMENTS: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long and include uppercase, lowercase, number, and special character.`
} as const;

/**
 * Authentication event identifiers for state management
 * @constant
 */
export const AUTH_EVENTS = {
  LOGIN_SUCCESS: 'auth:login:success',
  LOGIN_FAILURE: 'auth:login:failure',
  LOGOUT: 'auth:logout',
  TOKEN_REFRESH: 'auth:token:refresh',
  MFA_REQUIRED: 'auth:mfa:required',
  SESSION_TIMEOUT: 'auth:session:timeout'
} as const;

/**
 * Authentication configuration values and security limits
 * @constant
 */
export const AUTH_CONFIG = {
  /** Buffer time in ms before token expiry to trigger refresh (5 minutes) */
  TOKEN_EXPIRY_BUFFER: 300000,
  
  /** Maximum allowed login attempts before temporary lockout */
  MAX_LOGIN_ATTEMPTS: 3,
  
  /** Required length for MFA verification codes */
  MFA_CODE_LENGTH: 6,
  
  /** Token refresh interval in ms (14 minutes) */
  TOKEN_REFRESH_INTERVAL: 840000,
  
  /** Minimum required password length */
  PASSWORD_MIN_LENGTH: 12
} as const;

/**
 * Time constants for authentication operations (in milliseconds)
 * @constant
 * @private
 */
const TOKEN_EXPIRY_BUFFER = 300000; // 5 minutes
const MAX_LOGIN_ATTEMPTS = 3;
const MFA_CODE_LENGTH = 6;
const TOKEN_REFRESH_INTERVAL = 840000; // 14 minutes
const PASSWORD_MIN_LENGTH = 12;
const ACCOUNT_LOCKOUT_DURATION = 900000; // 15 minutes

/**
 * Type definitions for authentication constants
 * Ensures type safety when using these constants throughout the application
 */
export type AuthEndpoint = keyof typeof AUTH_ENDPOINTS;
export type TokenStorageKey = keyof typeof TOKEN_STORAGE_KEYS;
export type AuthEvent = keyof typeof AUTH_EVENTS;
export type AuthErrorMessage = keyof typeof AUTH_ERROR_MESSAGES;
export type AuthConfigKey = keyof typeof AUTH_CONFIG;