/**
 * @fileoverview Enterprise-grade Authentication Service
 * @version 1.0.0
 * 
 * Provides comprehensive authentication functionality with enhanced security features,
 * including OAuth 2.0/OIDC integration, MFA support, token management, and audit logging.
 */

import { PublicClientApplication, AuthenticationResult } from '@azure/msal-browser'; // ^3.0.0
import { jwtDecode } from 'jwt-decode'; // ^4.0.0
import { EventEmitter } from 'events'; // ^3.3.0
import { httpService } from './http.service';
import { StorageService } from './storage.service';
import authConfig from '../config/auth.config';
import {
  LoginCredentials,
  AuthTokens,
  AuthUser,
  MfaVerificationData,
  AuthProvider,
  AuthState,
  SecurityEventType,
  SecurityEvent,
  UserRole
} from '../types/auth.types';

// Constants for authentication operations
const TOKEN_REFRESH_INTERVAL = 300000; // 5 minutes
const MAX_LOGIN_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW = 3600000; // 1 hour
const SESSION_TIMEOUT = 1800000; // 30 minutes
const TOKEN_ROTATION_INTERVAL = 900000; // 15 minutes

/**
 * Rate limiter for security operations
 */
interface RateLimiter {
  attempts: number;
  windowStart: number;
}

/**
 * Enterprise-grade Authentication Service
 * Implements comprehensive security features and token management
 */
class AuthService {
  private static instance: AuthService;
  private readonly msalInstance: PublicClientApplication;
  private readonly storageService: StorageService;
  private currentUser: AuthUser | null = null;
  private readonly eventEmitter: EventEmitter;
  private rateLimiter: RateLimiter;
  private readonly maxRetries: number = 3;
  private readonly sessionTimeout: number = SESSION_TIMEOUT;
  private refreshTokenTimeout?: NodeJS.Timeout;
  private sessionCheckInterval?: NodeJS.Timeout;

  private constructor() {
    // Initialize MSAL instance with enhanced security configuration
    this.msalInstance = new PublicClientApplication(authConfig.oauth);
    this.storageService = StorageService.getInstance();
    this.eventEmitter = new EventEmitter();
    this.rateLimiter = { attempts: 0, windowStart: Date.now() };

    // Initialize security features
    this.initializeSecurityFeatures();
    this.initializeTokenRefresh();
    this.initializeSessionMonitoring();
  }

  /**
   * Returns singleton instance of AuthService
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Authenticates user with enhanced security measures
   */
  public async login(credentials: LoginCredentials): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      // Check rate limiting
      if (this.isRateLimited()) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Validate credentials
      this.validateCredentials(credentials);

      // Attempt authentication
      const response = await this.attemptLogin(credentials);

      if (response.data.success) {
        const { user, tokens } = response.data.data;
        
        // Store tokens securely
        await this.securelyStoreTokens(tokens);
        
        // Set current user and initialize session
        this.currentUser = user;
        this.initializeUserSession(user);

        // Emit authentication event
        this.emitSecurityEvent(SecurityEventType.LOGIN_SUCCESS, user.id);

        return { user, tokens };
      }

      throw new Error('Authentication failed');
    } catch (error) {
      this.handleLoginFailure(error);
      throw error;
    }
  }

  /**
   * Handles OAuth2/OIDC authentication with Azure AD
   */
  public async loginWithAzureAD(): Promise<void> {
    try {
      const result = await this.msalInstance.loginPopup({
        scopes: authConfig.oauth.scopes,
        prompt: 'select_account'
      });

      if (result) {
        await this.handleAzureADCallback(result);
      }
    } catch (error) {
      this.handleLoginFailure(error);
      throw error;
    }
  }

  /**
   * Verifies MFA code with enhanced security
   */
  public async verifyMfa(data: MfaVerificationData): Promise<boolean> {
    try {
      const response = await httpService.post(
        authConfig.endpoints.verifyMfa,
        data
      );

      if (response.data.verified) {
        this.updateUserMfaStatus(true);
        return true;
      }

      return false;
    } catch (error) {
      this.emitSecurityEvent(SecurityEventType.MFA_DISABLED, this.currentUser?.id || '');
      throw error;
    }
  }

  /**
   * Logs out user and cleans up session
   */
  public async logout(): Promise<void> {
    try {
      if (this.currentUser) {
        await httpService.post(authConfig.endpoints.logout);
        this.emitSecurityEvent(SecurityEventType.LOGOUT, this.currentUser.id);
      }

      // Clean up session and tokens
      this.cleanupUserSession();
    } catch (error) {
      console.error('Logout error:', error);
      // Proceed with local cleanup even if server logout fails
      this.cleanupUserSession();
    }
  }

  /**
   * Refreshes authentication tokens
   */
  public async refreshTokens(): Promise<AuthTokens> {
    try {
      const refreshToken = await this.storageService.getSecureItem<string>(
        authConfig.token.storage.refreshTokenKey
      );

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await httpService.post(
        authConfig.endpoints.refreshToken,
        { refreshToken }
      );

      const newTokens = response.data.data.tokens;
      await this.securelyStoreTokens(newTokens);

      return newTokens;
    } catch (error) {
      this.handleTokenRefreshFailure();
      throw error;
    }
  }

  /**
   * Returns current authenticated user
   */
  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Checks if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.currentUser && this.isSessionValid();
  }

  /**
   * Subscribes to authentication state changes
   */
  public onAuthStateChange(callback: (state: AuthState, user: AuthUser | null) => void): void {
    this.eventEmitter.on('authStateChange', callback);
  }

  // Private helper methods

  private async initializeSecurityFeatures(): Promise<void> {
    // Restore user session if valid
    const tokens = await this.getStoredTokens();
    if (tokens && this.validateTokens(tokens)) {
      const user = await this.getUserFromToken(tokens.accessToken);
      if (user) {
        this.currentUser = user;
        this.initializeUserSession(user);
      }
    }
  }

  private async securelyStoreTokens(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      this.storageService.setSecureItem(
        authConfig.token.storage.accessTokenKey,
        tokens.accessToken,
        { encrypt: true }
      ),
      this.storageService.setSecureItem(
        authConfig.token.storage.refreshTokenKey,
        tokens.refreshToken,
        { encrypt: true }
      )
    ]);
  }

  private initializeTokenRefresh(): void {
    if (this.refreshTokenTimeout) {
      clearInterval(this.refreshTokenTimeout);
    }

    this.refreshTokenTimeout = setInterval(
      () => this.refreshTokens().catch(console.error),
      TOKEN_REFRESH_INTERVAL
    );
  }

  private initializeSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    this.sessionCheckInterval = setInterval(
      () => this.checkSessionValidity(),
      60000 // Check every minute
    );
  }

  private async handleAzureADCallback(result: AuthenticationResult): Promise<void> {
    const response = await httpService.post(
      authConfig.endpoints.oauth_callback,
      {
        idToken: result.idToken,
        provider: AuthProvider.AZURE_AD
      }
    );

    if (response.data.success) {
      const { user, tokens } = response.data.data;
      await this.securelyStoreTokens(tokens);
      this.currentUser = user;
      this.initializeUserSession(user);
    }
  }

  private emitSecurityEvent(type: SecurityEventType, userId: string): void {
    const event: SecurityEvent = {
      type,
      userId,
      timestamp: Date.now(),
      metadata: {
        userAgent: navigator.userAgent,
        platform: navigator.platform
      },
      ipAddress: '', // Filled by backend
      userAgent: navigator.userAgent
    };

    this.eventEmitter.emit('securityEvent', event);
  }

  private cleanupUserSession(): void {
    this.currentUser = null;
    this.storageService.removeItem(authConfig.token.storage.accessTokenKey);
    this.storageService.removeItem(authConfig.token.storage.refreshTokenKey);
    
    if (this.refreshTokenTimeout) {
      clearInterval(this.refreshTokenTimeout);
    }
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    this.eventEmitter.emit('authStateChange', AuthState.UNAUTHENTICATED, null);
  }

  // Additional private helper methods would be implemented here...
}

// Export singleton instance
export const authService = AuthService.getInstance();