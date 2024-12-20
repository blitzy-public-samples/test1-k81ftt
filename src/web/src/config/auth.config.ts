/**
 * Authentication Configuration
 * Version: 1.0.0
 * 
 * Comprehensive authentication configuration for the Task Management System frontend,
 * implementing OAuth 2.0/OIDC with Azure AD B2C, JWT token management, and MFA support.
 * 
 * @module auth.config
 */

import { Configuration } from '@azure/msal-browser'; // v3.0.0
import { AUTH_ENDPOINTS, TOKEN_STORAGE_KEYS } from '../constants/auth.constants';

// Base API URL from environment
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * Microsoft Authentication Library (MSAL) configuration for Azure AD B2C
 * Implements OAuth 2.0/OIDC authentication flow
 */
const msalConfig: Configuration = {
  auth: {
    clientId: process.env.VITE_AZURE_CLIENT_ID!,
    authority: process.env.VITE_AZURE_AUTHORITY!,
    redirectUri: process.env.VITE_AZURE_REDIRECT_URI!,
    postLogoutRedirectUri: process.env.VITE_AZURE_POST_LOGOUT_URI!,
    navigateToLoginRequestUrl: true,
    validateAuthority: true,
    knownAuthorities: [process.env.VITE_AZURE_KNOWN_AUTHORITIES!]
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true,
    secureCookies: true
  },
  system: {
    loggerOptions: {
      logLevel: 'Error',
      piiLoggingEnabled: false,
      correlationId: true
    },
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0
  }
};

/**
 * Token management configuration
 * Handles token lifecycle, refresh strategies, and secure storage
 */
const tokenConfig = {
  accessTokenExpiryBuffer: 300000, // 5 minutes buffer before expiry
  refreshTokenExpiryBuffer: 86400000, // 24 hours buffer
  tokenType: 'Bearer',
  secureStorage: true,
  refreshThreshold: 0.75, // Refresh at 75% of token lifetime
  maxRetryAttempts: 3,
  retryDelay: 1000 // 1 second between retries
};

/**
 * Authentication endpoints configuration
 * Maps all authentication-related API endpoints
 */
const authEndpoints = {
  login: `${API_BASE_URL}${AUTH_ENDPOINTS.LOGIN}`,
  register: `${API_BASE_URL}${AUTH_ENDPOINTS.REGISTER}`,
  logout: `${API_BASE_URL}${AUTH_ENDPOINTS.LOGOUT}`,
  refreshToken: `${API_BASE_URL}${AUTH_ENDPOINTS.REFRESH_TOKEN}`,
  verifyMfa: `${API_BASE_URL}${AUTH_ENDPOINTS.VERIFY_MFA}`,
  validateToken: `${API_BASE_URL}/auth/validate-token`,
  revokeToken: `${API_BASE_URL}/auth/revoke-token`
};

/**
 * Storage configuration for authentication tokens
 * Implements secure token storage strategy
 */
const storageConfig = {
  accessTokenKey: TOKEN_STORAGE_KEYS.ACCESS_TOKEN,
  refreshTokenKey: TOKEN_STORAGE_KEYS.REFRESH_TOKEN,
  idTokenKey: TOKEN_STORAGE_KEYS.ID_TOKEN,
  storage: typeof window !== 'undefined' ? window.localStorage : null,
  secure: true
};

/**
 * Exported authentication configuration object
 * Provides comprehensive authentication settings for the frontend application
 */
export const authConfig = {
  oauth: {
    ...msalConfig,
    scopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      `${process.env.VITE_AZURE_CLIENT_ID!}/tasks.read`,
      `${process.env.VITE_AZURE_CLIENT_ID!}/tasks.write`
    ]
  },
  endpoints: authEndpoints,
  token: {
    ...tokenConfig,
    storage: storageConfig
  },
  mfa: {
    enabled: true,
    gracePeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
    methods: ['totp', 'sms'],
    defaultMethod: 'totp'
  }
} as const;

export type AuthConfig = typeof authConfig;
export default authConfig;