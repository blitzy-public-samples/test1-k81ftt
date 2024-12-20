/**
 * @fileoverview Comprehensive test suite for AuthService
 * Tests authentication flows, token management, and security features
 * @version 1.0.0
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { MockInstance } from 'jest-mock';
import { authService } from '../../src/services/auth.service';
import { httpService } from '../../src/services/http.service';
import { StorageService } from '../../src/services/storage.service';
import {
  AuthState,
  AuthProvider,
  SecurityEventType,
  UserRole,
  AuthUser,
  AuthTokens
} from '../../src/types/auth.types';
import authConfig from '../../src/config/auth.config';

// Mock external services
jest.mock('../../src/services/http.service');
jest.mock('../../src/services/storage.service');

describe('AuthService', () => {
  // Test data
  const mockUser: AuthUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.MEMBER,
    provider: AuthProvider.LOCAL,
    lastLogin: new Date(),
    mfaEnabled: true,
    accountStatus: 'active'
  };

  const mockTokens: AuthTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
    scope: ['read', 'write'],
    issuer: 'test-issuer'
  };

  // Mock storage service instance
  let mockStorageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup storage service mock
    mockStorageService = {
      setSecureItem: jest.fn(),
      getSecureItem: jest.fn(),
      removeItem: jest.fn(),
      clearAll: jest.fn()
    } as unknown as jest.Mocked<StorageService>;

    // Setup HTTP service mock
    (httpService.post as jest.Mock).mockReset();
    (httpService.get as jest.Mock).mockReset();
  });

  describe('Local Authentication', () => {
    it('should successfully authenticate with valid credentials', async () => {
      // Setup
      const credentials = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        rememberMe: true
      };

      (httpService.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { user: mockUser, tokens: mockTokens }
        }
      });

      // Execute
      const result = await authService.login(credentials);

      // Verify
      expect(result).toEqual({ user: mockUser, tokens: mockTokens });
      expect(httpService.post).toHaveBeenCalledWith(
        authConfig.endpoints.login,
        credentials
      );
      expect(mockStorageService.setSecureItem).toHaveBeenCalledWith(
        authConfig.token.storage.accessTokenKey,
        mockTokens.accessToken,
        { encrypt: true }
      );
    });

    it('should handle invalid credentials correctly', async () => {
      // Setup
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPass123!'
      };

      (httpService.post as jest.Mock).mockRejectedValueOnce(new Error('Invalid credentials'));

      // Execute & Verify
      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should enforce rate limiting on multiple failed attempts', async () => {
      // Setup
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPass123!'
      };

      // Simulate multiple failed attempts
      for (let i = 0; i < 3; i++) {
        (httpService.post as jest.Mock).mockRejectedValueOnce(new Error('Invalid credentials'));
        await expect(authService.login(credentials)).rejects.toThrow();
      }

      // Verify rate limiting
      await expect(authService.login(credentials)).rejects.toThrow('Too many login attempts');
    });
  });

  describe('OAuth Authentication', () => {
    it('should handle successful Azure AD authentication', async () => {
      // Setup
      const mockAuthResult = {
        idToken: 'mock-id-token',
        accessToken: 'mock-access-token'
      };

      (httpService.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { user: mockUser, tokens: mockTokens }
        }
      });

      // Execute
      await authService.loginWithAzureAD();

      // Verify
      expect(httpService.post).toHaveBeenCalledWith(
        authConfig.endpoints.oauth_callback,
        expect.any(Object)
      );
    });

    it('should handle OAuth errors appropriately', async () => {
      // Setup
      (httpService.post as jest.Mock).mockRejectedValueOnce(
        new Error('OAuth authentication failed')
      );

      // Execute & Verify
      await expect(authService.loginWithAzureAD()).rejects.toThrow(
        'OAuth authentication failed'
      );
    });
  });

  describe('MFA Verification', () => {
    it('should verify valid MFA code', async () => {
      // Setup
      const mfaData = {
        code: '123456',
        userId: mockUser.id,
        method: 'totp',
        timestamp: Date.now()
      };

      (httpService.post as jest.Mock).mockResolvedValueOnce({
        data: { verified: true }
      });

      // Execute
      const result = await authService.verifyMfa(mfaData);

      // Verify
      expect(result).toBe(true);
      expect(httpService.post).toHaveBeenCalledWith(
        authConfig.endpoints.verifyMfa,
        mfaData
      );
    });

    it('should handle invalid MFA codes', async () => {
      // Setup
      const mfaData = {
        code: '000000',
        userId: mockUser.id,
        method: 'totp',
        timestamp: Date.now()
      };

      (httpService.post as jest.Mock).mockResolvedValueOnce({
        data: { verified: false }
      });

      // Execute
      const result = await authService.verifyMfa(mfaData);

      // Verify
      expect(result).toBe(false);
    });
  });

  describe('Token Management', () => {
    it('should refresh tokens successfully', async () => {
      // Setup
      const newTokens = { ...mockTokens, accessToken: 'new-access-token' };
      
      mockStorageService.getSecureItem.mockResolvedValueOnce(mockTokens.refreshToken);
      (httpService.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { tokens: newTokens } }
      });

      // Execute
      const result = await authService.refreshTokens();

      // Verify
      expect(result).toEqual(newTokens);
      expect(mockStorageService.setSecureItem).toHaveBeenCalledWith(
        authConfig.token.storage.accessTokenKey,
        newTokens.accessToken,
        { encrypt: true }
      );
    });

    it('should handle token refresh failures', async () => {
      // Setup
      mockStorageService.getSecureItem.mockResolvedValueOnce(null);

      // Execute & Verify
      await expect(authService.refreshTokens()).rejects.toThrow(
        'No refresh token available'
      );
    });
  });

  describe('Session Management', () => {
    it('should handle logout correctly', async () => {
      // Setup
      (httpService.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

      // Execute
      await authService.logout();

      // Verify
      expect(httpService.post).toHaveBeenCalledWith(authConfig.endpoints.logout);
      expect(mockStorageService.removeItem).toHaveBeenCalledWith(
        authConfig.token.storage.accessTokenKey
      );
      expect(mockStorageService.removeItem).toHaveBeenCalledWith(
        authConfig.token.storage.refreshTokenKey
      );
    });

    it('should validate active sessions', () => {
      // Setup
      authService['currentUser'] = mockUser;

      // Execute & Verify
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe('Security Events', () => {
    it('should emit security events correctly', () => {
      // Setup
      const eventSpy = jest.spyOn(authService['eventEmitter'], 'emit');

      // Execute
      authService['emitSecurityEvent'](SecurityEventType.LOGIN_SUCCESS, mockUser.id);

      // Verify
      expect(eventSpy).toHaveBeenCalledWith('securityEvent', expect.objectContaining({
        type: SecurityEventType.LOGIN_SUCCESS,
        userId: mockUser.id
      }));
    });
  });
});