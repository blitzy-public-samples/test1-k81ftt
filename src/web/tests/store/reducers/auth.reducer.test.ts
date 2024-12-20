/**
 * @fileoverview Authentication Reducer Tests
 * @version 1.0.0
 * 
 * Comprehensive test suite for authentication reducer ensuring secure state
 * management for all authentication flows including login, registration,
 * MFA verification, token refresh, and logout operations with RBAC support.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import deepFreeze from 'deep-freeze';
import authReducer from '../../../../src/store/reducers/auth.reducer';
import { AuthState, AuthUser, AuthTokens, AuthProvider, UserRole } from '../../../../src/types/auth.types';
import * as authActions from '../../../../src/store/actions/auth.actions';

// Initial state with security defaults
const initialState = deepFreeze({
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
});

// Mock user data for testing
const mockUser: AuthUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.MEMBER,
  provider: AuthProvider.LOCAL,
  lastLogin: new Date(),
  mfaEnabled: false,
  accountStatus: 'active'
};

// Mock tokens for testing
const mockTokens: AuthTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
  tokenType: 'Bearer',
  scope: ['read', 'write'],
  issuer: 'test-issuer'
};

describe('Auth Reducer', () => {
  describe('Initial State', () => {
    it('should return the initial state', () => {
      const state = authReducer(undefined, { type: '@@INIT' });
      expect(state).toEqual(initialState);
    });

    it('should have secure defaults', () => {
      const state = authReducer(undefined, { type: '@@INIT' });
      expect(state.authState).toBe(AuthState.UNAUTHENTICATED);
      expect(state.tokens).toBeNull();
      expect(state.securityContext.loginAttempts).toBe(0);
    });
  });

  describe('Login Flow', () => {
    it('should handle login request', () => {
      const action = authActions.loginRequest({ 
        email: 'test@example.com', 
        password: 'password',
        provider: AuthProvider.LOCAL 
      });
      
      const state = authReducer(initialState, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
      expect(state.securityContext.loginAttempts).toBe(1);
      expect(state.securityContext.provider).toBe(AuthProvider.LOCAL);
    });

    it('should handle login success', () => {
      const action = authActions.loginSuccess({
        user: mockUser,
        tokens: mockTokens,
        sessionTimeout: 3600000
      });

      const state = authReducer(initialState, action);
      expect(state.authState).toBe(AuthState.AUTHENTICATED);
      expect(state.user).toEqual(mockUser);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.loading).toBe(false);
      expect(state.securityContext.loginAttempts).toBe(0);
    });

    it('should handle login failure', () => {
      const action = authActions.loginFailure({
        error: 'Invalid credentials',
        attempts: 1
      });

      const state = authReducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
      expect(state.securityContext.securityEvents).toHaveLength(1);
      expect(state.securityContext.securityEvents[0].type).toBe('LOGIN_FAILURE');
    });

    it('should enforce login attempt limits', () => {
      let state = initialState;
      
      // Simulate multiple failed login attempts
      for (let i = 0; i < 3; i++) {
        state = authReducer(state, authActions.loginRequest({
          email: 'test@example.com',
          password: 'wrong-password',
          provider: AuthProvider.LOCAL
        }));
      }

      // Next attempt should be blocked
      const finalState = authReducer(state, authActions.loginRequest({
        email: 'test@example.com',
        password: 'password',
        provider: AuthProvider.LOCAL
      }));

      expect(finalState.error).toContain('Account temporarily locked');
      expect(finalState.securityContext.securityEvents).toContainEqual(
        expect.objectContaining({ type: 'ACCOUNT_LOCKED' })
      );
    });
  });

  describe('MFA Flow', () => {
    const mfaEnabledUser = { ...mockUser, mfaEnabled: true };
    
    it('should handle MFA required state after login', () => {
      const action = authActions.loginSuccess({
        user: mfaEnabledUser,
        tokens: mockTokens,
        sessionTimeout: 3600000
      });

      const state = authReducer(initialState, action);
      expect(state.authState).toBe(AuthState.MFA_REQUIRED);
      expect(state.mfaRequired).toBe(true);
      expect(state.user).toEqual(mfaEnabledUser);
    });

    it('should handle MFA verification request', () => {
      const action = authActions.mfaVerificationRequest({
        code: '123456',
        userId: 'test-user-id',
        method: 'totp',
        timestamp: Date.now()
      });

      const state = authReducer(initialState, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
      expect(state.securityContext.mfaAttempts).toBe(1);
    });

    it('should handle MFA verification success', () => {
      const initialMfaState = {
        ...initialState,
        authState: AuthState.MFA_REQUIRED,
        mfaRequired: true,
        user: mfaEnabledUser
      };

      const state = authReducer(initialMfaState, authActions.mfaVerificationSuccess());
      expect(state.authState).toBe(AuthState.AUTHENTICATED);
      expect(state.mfaRequired).toBe(false);
      expect(state.mfaVerified).toBe(true);
    });

    it('should enforce MFA attempt limits', () => {
      let state = initialState;
      
      // Simulate multiple failed MFA attempts
      for (let i = 0; i < 3; i++) {
        state = authReducer(state, authActions.mfaVerificationRequest({
          code: 'wrong-code',
          userId: 'test-user-id',
          method: 'totp',
          timestamp: Date.now()
        }));
      }

      // Next attempt should be blocked
      const finalState = authReducer(state, authActions.mfaVerificationRequest({
        code: '123456',
        userId: 'test-user-id',
        method: 'totp',
        timestamp: Date.now()
      }));

      expect(finalState.error).toContain('Too many MFA attempts');
      expect(finalState.securityContext.securityEvents).toContainEqual(
        expect.objectContaining({ type: 'MFA_BLOCKED' })
      );
    });
  });

  describe('Token Management', () => {
    it('should handle token refresh request', () => {
      const state = authReducer(initialState, authActions.refreshTokenRequest());
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle token refresh success', () => {
      const newTokens: AuthTokens = {
        ...mockTokens,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      const state = authReducer(initialState, authActions.refreshTokenSuccess(newTokens));
      expect(state.tokens).toEqual(newTokens);
      expect(state.loading).toBe(false);
      expect(state.lastActivity).toBeTruthy();
      expect(state.securityContext.securityEvents).toContainEqual(
        expect.objectContaining({ type: 'TOKEN_REFRESH' })
      );
    });

    it('should handle session timeout', () => {
      const authenticatedState = {
        ...initialState,
        authState: AuthState.AUTHENTICATED,
        user: mockUser,
        tokens: mockTokens
      };

      const state = authReducer(authenticatedState, authActions.sessionTimeout());
      expect(state.authState).toBe(AuthState.UNAUTHENTICATED);
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.securityContext.securityEvents).toContainEqual(
        expect.objectContaining({ type: 'SESSION_TIMEOUT' })
      );
    });
  });

  describe('Logout Flow', () => {
    const authenticatedState = {
      ...initialState,
      authState: AuthState.AUTHENTICATED,
      user: mockUser,
      tokens: mockTokens
    };

    it('should handle logout success', () => {
      const state = authReducer(authenticatedState, authActions.logoutSuccess());
      expect(state.authState).toBe(AuthState.UNAUTHENTICATED);
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.securityContext.securityEvents).toContainEqual(
        expect.objectContaining({ type: 'LOGOUT' })
      );
    });
  });

  describe('Security Events', () => {
    it('should log security events', () => {
      const securityEvent = {
        type: 'SUSPICIOUS_ACTIVITY',
        metadata: { reason: 'Multiple failed attempts from different IPs' }
      };

      const state = authReducer(initialState, authActions.securityEvent(securityEvent));
      expect(state.securityContext.securityEvents).toContainEqual(
        expect.objectContaining({
          type: securityEvent.type,
          metadata: securityEvent.metadata
        })
      );
    });
  });
});