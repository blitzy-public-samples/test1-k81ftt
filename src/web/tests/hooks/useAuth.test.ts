/**
 * @fileoverview Comprehensive test suite for useAuth hook
 * Tests authentication flows, security mechanisms, and state management
 * @version 1.0.0
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { jest } from '@jest/globals';
import MockWebSocket from 'jest-websocket-mock';
import useAuth from '../../src/hooks/useAuth';
import { AuthState, AuthUser, AuthProvider, UserRole } from '../../src/types/auth.types';
import authReducer from '../../src/store/reducers/auth.reducer';

// Test constants
const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'Test123!@#',
  rememberMe: true
};

const TEST_USER: AuthUser = {
  id: '123',
  email: TEST_CREDENTIALS.email,
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.MEMBER,
  provider: AuthProvider.LOCAL,
  lastLogin: new Date(),
  mfaEnabled: false,
  accountStatus: 'active'
};

const TEST_MFA_DATA = {
  code: '123456',
  userId: TEST_USER.id,
  method: 'totp' as const,
  timestamp: Date.now()
};

/**
 * Sets up test environment with mock store and providers
 */
const setupTestEnvironment = () => {
  // Create mock store
  const store = configureStore({
    reducer: {
      auth: authReducer
    }
  });

  // Mock WebSocket server
  const wsServer = new MockWebSocket('ws://localhost:1234');

  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  // Create wrapper component
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return { store, wsServer, wrapper };
};

/**
 * Creates mock implementations for auth service calls
 */
const mockAuthService = (mockResponses = {}) => {
  jest.mock('../../src/services/auth.service', () => ({
    login: jest.fn().mockResolvedValue(mockResponses.login),
    loginWithOAuth: jest.fn().mockResolvedValue(mockResponses.oauth),
    verifyMfa: jest.fn().mockResolvedValue(mockResponses.mfa),
    refreshToken: jest.fn().mockResolvedValue(mockResponses.refresh),
    logout: jest.fn().mockResolvedValue(mockResponses.logout)
  }));
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Authentication Flows', () => {
    it('should handle successful local login', async () => {
      const { wrapper } = setupTestEnvironment();
      mockAuthService({
        login: { user: TEST_USER, tokens: { accessToken: 'token123' } }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login(TEST_CREDENTIALS);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(TEST_USER);
      expect(result.current.error).toBeNull();
    });

    it('should handle OAuth 2.0 login flow', async () => {
      const { wrapper } = setupTestEnvironment();
      mockAuthService({
        oauth: { user: { ...TEST_USER, provider: AuthProvider.AZURE_AD } }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithOAuth();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.provider).toBe(AuthProvider.AZURE_AD);
    });

    it('should handle MFA verification', async () => {
      const { wrapper } = setupTestEnvironment();
      mockAuthService({
        login: { user: { ...TEST_USER, mfaEnabled: true } },
        mfa: { verified: true }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login(TEST_CREDENTIALS);
        await result.current.verifyMfa(TEST_MFA_DATA);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.mfaEnabled).toBe(true);
    });

    it('should handle session persistence', async () => {
      const { wrapper } = setupTestEnvironment();
      const storedUser = JSON.stringify(TEST_USER);
      localStorage.getItem.mockReturnValue(storedUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(TEST_USER);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid credentials', async () => {
      const { wrapper } = setupTestEnvironment();
      mockAuthService({
        login: Promise.reject(new Error('Invalid credentials'))
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login(TEST_CREDENTIALS);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it('should handle network failures', async () => {
      const { wrapper } = setupTestEnvironment();
      mockAuthService({
        login: Promise.reject(new Error('Network Error'))
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login(TEST_CREDENTIALS);
      });

      expect(result.current.error?.message).toContain('Network Error');
    });

    it('should handle MFA verification failures', async () => {
      const { wrapper } = setupTestEnvironment();
      mockAuthService({
        mfa: Promise.reject(new Error('Invalid MFA code'))
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.verifyMfa(TEST_MFA_DATA);
      });

      expect(result.current.error?.message).toContain('Invalid MFA code');
    });
  });

  describe('Session Management', () => {
    it('should handle token refresh', async () => {
      const { wrapper } = setupTestEnvironment();
      mockAuthService({
        refresh: { accessToken: 'newToken123' }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle session timeout', async () => {
      const { wrapper } = setupTestEnvironment();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        // Simulate session timeout
        await new Promise(resolve => setTimeout(resolve, 1000));
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle logout', async () => {
      const { wrapper } = setupTestEnvironment();
      mockAuthService({
        logout: Promise.resolve()
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorage.clear).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    it('should handle WebSocket auth state updates', async () => {
      const { wrapper, wsServer } = setupTestEnvironment();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        wsServer.send(JSON.stringify({
          type: 'AUTH_STATE_CHANGE',
          data: { state: AuthState.SESSION_EXPIRED }
        }));
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});