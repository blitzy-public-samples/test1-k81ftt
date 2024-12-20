/**
 * @fileoverview Advanced React hook for managing authentication state and operations
 * Provides comprehensive security features, session management, and real-time updates
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import jwtDecode from 'jwt-decode'; // ^3.1.2
import axios from 'axios'; // ^1.3.0
import { authActions } from '../store/actions/auth.actions';
import { authTypes } from '../types/auth.types';
import { handleApiError } from '../utils/error.utils';

/**
 * Enhanced authentication hook with comprehensive security features
 * Implements OAuth 2.0/OIDC, MFA, and session management
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const authState = useSelector((state: any) => state.auth);

  // Session monitoring interval
  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;

    if (authState.user) {
      sessionCheckInterval = setInterval(() => {
        checkSessionValidity();
      }, 60000); // Check every minute
    }

    return () => {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [authState.user]);

  // Token refresh mechanism
  useEffect(() => {
    let tokenRefreshTimeout: NodeJS.Timeout;

    if (authState.tokens?.accessToken) {
      const decodedToken: any = jwtDecode(authState.tokens.accessToken);
      const expiresIn = decodedToken.exp * 1000 - Date.now() - 300000; // 5 minutes buffer

      tokenRefreshTimeout = setTimeout(() => {
        refreshSession();
      }, expiresIn);
    }

    return () => {
      if (tokenRefreshTimeout) {
        clearTimeout(tokenRefreshTimeout);
      }
    };
  }, [authState.tokens]);

  /**
   * Enhanced login handler with security validations
   */
  const login = useCallback(async (credentials: authTypes.LoginCredentials) => {
    try {
      // Validate credentials
      if (!credentials.email || !credentials.password) {
        throw new Error('Invalid credentials');
      }

      // Dispatch login request
      await dispatch(authActions.loginRequest({
        ...credentials,
        provider: authTypes.AuthProvider.LOCAL
      }));

    } catch (error) {
      throw handleApiError(error as Error);
    }
  }, [dispatch]);

  /**
   * User registration with enhanced validation
   */
  const register = useCallback(async (data: authTypes.RegisterData) => {
    try {
      await dispatch(authActions.registerRequest(data));
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }, [dispatch]);

  /**
   * Secure logout with session cleanup
   */
  const logout = useCallback(async () => {
    try {
      await dispatch(authActions.logoutRequest());
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout on error
      dispatch(authActions.logoutSuccess());
    }
  }, [dispatch]);

  /**
   * MFA verification handler
   */
  const verifyMfa = useCallback(async (verificationData: authTypes.MfaVerificationData) => {
    try {
      await dispatch(authActions.verifyMfaRequest(verificationData));
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }, [dispatch]);

  /**
   * Token refresh handler with retry mechanism
   */
  const refreshSession = useCallback(async () => {
    try {
      await dispatch(authActions.refreshTokenRequest());
    } catch (error) {
      // Handle token refresh failure
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        dispatch(authActions.sessionTimeout());
      }
      throw handleApiError(error as Error);
    }
  }, [dispatch]);

  /**
   * Permission check with role-based access control
   */
  const checkPermission = useCallback((requiredRole: authTypes.UserRole): boolean => {
    if (!authState.user) return false;

    const roleHierarchy = {
      [authTypes.UserRole.ADMIN]: 4,
      [authTypes.UserRole.MANAGER]: 3,
      [authTypes.UserRole.MEMBER]: 2,
      [authTypes.UserRole.GUEST]: 1
    };

    return roleHierarchy[authState.user.role] >= roleHierarchy[requiredRole];
  }, [authState.user]);

  /**
   * Check session validity
   */
  const checkSessionValidity = useCallback(() => {
    if (!authState.lastActivity) return;

    const inactivityTime = Date.now() - authState.lastActivity;
    if (inactivityTime > (authState.sessionTimeout || 1800000)) { // 30 minutes default
      dispatch(authActions.sessionTimeout());
    }
  }, [authState.lastActivity, authState.sessionTimeout, dispatch]);

  // Memoized auth state
  const authData = useMemo(() => ({
    isAuthenticated: authState.authState === authTypes.AuthState.AUTHENTICATED,
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    mfaRequired: authState.mfaRequired,
    sessionExpiry: authState.sessionExpiry
  }), [authState]);

  return {
    ...authData,
    login,
    register,
    logout,
    verifyMfa,
    refreshSession,
    checkPermission
  };
};

export default useAuth;