/**
 * @fileoverview Authentication Reducer
 * @version 1.0.0
 * 
 * Implements secure state management for authentication with support for
 * multiple auth methods, MFA verification, token refresh, and RBAC.
 */

import { createReducer } from '@reduxjs/toolkit';
import {
  AuthState,
  AuthUser,
  AuthTokens,
  AuthProvider,
  SecurityEvent,
  UserRole,
  MfaVerificationData
} from '../../types/auth.types';
import * as authActions from '../actions/auth.actions';

/**
 * Interface for authentication state
 */
interface AuthenticationState {
  authState: AuthState;
  user: AuthUser | null;
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
  mfaRequired: boolean;
  mfaVerified: boolean;
  sessionTimeout: number | null;
  lastActivity: number | null;
  securityContext: {
    provider: AuthProvider | null;
    loginAttempts: number;
    lastLoginAttempt: number | null;
    mfaAttempts: number;
    lastMfaAttempt: number | null;
    securityEvents: SecurityEvent[];
  };
}

/**
 * Initial authentication state with security defaults
 */
const initialState: AuthenticationState = {
  authState: AuthState.UNAUTHENTICATED,
  user: null,
  tokens: null,
  loading: false,
  error: null,
  mfaRequired: false,
  mfaVerified: false,
  sessionTimeout: null,
  lastActivity: null,
  securityContext: {
    provider: null,
    loginAttempts: 0,
    lastLoginAttempt: null,
    mfaAttempts: 0,
    lastMfaAttempt: null,
    securityEvents: []
  }
};

/**
 * Authentication reducer with comprehensive security handling
 */
export const authReducer = createReducer(initialState, (builder) => {
  builder
    // Login request handling
    .addCase(authActions.loginRequest, (state, action) => {
      // Validate login attempt frequency
      const now = Date.now();
      if (
        state.securityContext.loginAttempts >= 3 &&
        state.securityContext.lastLoginAttempt &&
        now - state.securityContext.lastLoginAttempt < 900000 // 15 minutes
      ) {
        return {
          ...state,
          error: 'Account temporarily locked. Please try again later.',
          securityContext: {
            ...state.securityContext,
            securityEvents: [
              ...state.securityContext.securityEvents,
              {
                type: 'ACCOUNT_LOCKED',
                timestamp: now,
                metadata: { reason: 'Too many login attempts' }
              }
            ]
          }
        };
      }

      return {
        ...state,
        loading: true,
        error: null,
        securityContext: {
          ...state.securityContext,
          provider: action.payload.provider,
          lastLoginAttempt: now,
          loginAttempts: state.securityContext.loginAttempts + 1
        }
      };
    })

    // Login success handling
    .addCase(authActions.loginSuccess, (state, action) => {
      const { user, tokens, sessionTimeout } = action.payload;
      
      return {
        ...state,
        authState: user.mfaEnabled ? AuthState.MFA_REQUIRED : AuthState.AUTHENTICATED,
        user,
        tokens,
        loading: false,
        error: null,
        mfaRequired: user.mfaEnabled,
        sessionTimeout,
        lastActivity: Date.now(),
        securityContext: {
          ...state.securityContext,
          loginAttempts: 0,
          securityEvents: [
            ...state.securityContext.securityEvents,
            {
              type: 'LOGIN_SUCCESS',
              timestamp: Date.now(),
              metadata: { provider: state.securityContext.provider }
            }
          ]
        }
      };
    })

    // Login failure handling
    .addCase(authActions.loginFailure, (state, action) => {
      return {
        ...state,
        loading: false,
        error: action.payload.error,
        securityContext: {
          ...state.securityContext,
          securityEvents: [
            ...state.securityContext.securityEvents,
            {
              type: 'LOGIN_FAILURE',
              timestamp: Date.now(),
              metadata: { 
                reason: action.payload.error,
                attempts: action.payload.attempts
              }
            }
          ]
        }
      };
    })

    // MFA verification request handling
    .addCase(authActions.mfaVerificationRequest, (state, action) => {
      const now = Date.now();
      if (
        state.securityContext.mfaAttempts >= 3 &&
        state.securityContext.lastMfaAttempt &&
        now - state.securityContext.lastMfaAttempt < 300000 // 5 minutes
      ) {
        return {
          ...state,
          error: 'Too many MFA attempts. Please try again later.',
          securityContext: {
            ...state.securityContext,
            securityEvents: [
              ...state.securityContext.securityEvents,
              {
                type: 'MFA_BLOCKED',
                timestamp: now,
                metadata: { reason: 'Too many attempts' }
              }
            ]
          }
        };
      }

      return {
        ...state,
        loading: true,
        error: null,
        securityContext: {
          ...state.securityContext,
          lastMfaAttempt: now,
          mfaAttempts: state.securityContext.mfaAttempts + 1
        }
      };
    })

    // MFA verification success handling
    .addCase(authActions.mfaVerificationSuccess, (state) => {
      return {
        ...state,
        authState: AuthState.AUTHENTICATED,
        loading: false,
        error: null,
        mfaRequired: false,
        mfaVerified: true,
        securityContext: {
          ...state.securityContext,
          mfaAttempts: 0,
          securityEvents: [
            ...state.securityContext.securityEvents,
            {
              type: 'MFA_SUCCESS',
              timestamp: Date.now(),
              metadata: {}
            }
          ]
        }
      };
    })

    // Token refresh handling
    .addCase(authActions.refreshTokenRequest, (state) => {
      return {
        ...state,
        loading: true,
        error: null
      };
    })

    .addCase(authActions.refreshTokenSuccess, (state, action) => {
      return {
        ...state,
        tokens: action.payload,
        loading: false,
        error: null,
        lastActivity: Date.now(),
        securityContext: {
          ...state.securityContext,
          securityEvents: [
            ...state.securityContext.securityEvents,
            {
              type: 'TOKEN_REFRESH',
              timestamp: Date.now(),
              metadata: {}
            }
          ]
        }
      };
    })

    // Session timeout handling
    .addCase(authActions.sessionTimeout, (state) => {
      return {
        ...initialState,
        securityContext: {
          ...initialState.securityContext,
          securityEvents: [
            ...state.securityContext.securityEvents,
            {
              type: 'SESSION_TIMEOUT',
              timestamp: Date.now(),
              metadata: {}
            }
          ]
        }
      };
    })

    // Logout handling
    .addCase(authActions.logoutSuccess, (state) => {
      return {
        ...initialState,
        securityContext: {
          ...initialState.securityContext,
          securityEvents: [
            ...state.securityContext.securityEvents,
            {
              type: 'LOGOUT',
              timestamp: Date.now(),
              metadata: {}
            }
          ]
        }
      };
    })

    // Security event logging
    .addCase(authActions.securityEvent, (state, action) => {
      return {
        ...state,
        securityContext: {
          ...state.securityContext,
          securityEvents: [
            ...state.securityContext.securityEvents,
            {
              ...action.payload,
              timestamp: Date.now()
            }
          ]
        }
      };
    });
});

export default authReducer;