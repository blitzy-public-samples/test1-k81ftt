/**
 * @fileoverview Redux selectors for authentication state management
 * Provides memoized, type-safe selectors for accessing auth-related state
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // v2.0.0
import type { RootState } from '../../types/store.types';
import type { 
  AuthState, 
  AuthUser, 
  AuthTokens, 
  UserRole, 
  SecurityEvent 
} from '../../types/auth.types';

/**
 * Base selector to access the auth slice of the Redux store
 * Provides type-safe access to auth state
 */
export const selectAuthState = (state: RootState) => state.auth;

/**
 * Memoized selector for current authenticated user
 * Returns null if no user is authenticated
 */
export const selectCurrentUser = createSelector(
  [selectAuthState],
  (authState): AuthUser | null => authState.user
);

/**
 * Memoized selector for authentication tokens
 * Returns null if no tokens are present
 */
export const selectAuthTokens = createSelector(
  [selectAuthState],
  (authState): AuthTokens | null => authState.tokens
);

/**
 * Memoized selector for authentication status
 * Returns true if user is fully authenticated
 */
export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (authState): boolean => authState.status === AuthState.AUTHENTICATED
);

/**
 * Memoized selector for authentication loading state
 * Used for UI loading indicators
 */
export const selectAuthLoading = createSelector(
  [selectAuthState],
  (authState): boolean => authState.loading === 'loading'
);

/**
 * Memoized selector for authentication errors
 * Returns null if no error present
 */
export const selectAuthError = createSelector(
  [selectAuthState],
  (authState) => authState.error
);

/**
 * Memoized selector for user role
 * Returns null if no user is authenticated
 */
export const selectUserRole = createSelector(
  [selectCurrentUser],
  (user): UserRole | null => user?.role ?? null
);

/**
 * Memoized selector for MFA requirement status
 * Returns true if MFA verification is required
 */
export const selectMfaRequired = createSelector(
  [selectAuthState],
  (authState): boolean => authState.status === AuthState.MFA_REQUIRED
);

/**
 * Memoized selector for session expiration status
 * Returns true if the session has expired
 */
export const selectSessionExpired = createSelector(
  [selectAuthState],
  (authState): boolean => authState.status === AuthState.SESSION_EXPIRED
);

/**
 * Memoized selector for token refresh requirement
 * Returns true if token refresh is needed
 */
export const selectTokenRefreshRequired = createSelector(
  [selectAuthState],
  (authState): boolean => authState.status === AuthState.TOKEN_REFRESH_REQUIRED
);

/**
 * Memoized selector for account lock status
 * Returns true if account is locked
 */
export const selectAccountLocked = createSelector(
  [selectAuthState],
  (authState): boolean => authState.status === AuthState.ACCOUNT_LOCKED
);

/**
 * Memoized selector for last activity timestamp
 * Used for session management
 */
export const selectLastActivity = createSelector(
  [selectAuthState],
  (authState): Date | null => authState.lastActivity
);

/**
 * Memoized selector for session expiry timestamp
 * Used for proactive session management
 */
export const selectSessionExpiry = createSelector(
  [selectAuthState],
  (authState): Date | null => authState.sessionExpiry
);

/**
 * Type guard selector to check if user has specific role
 * @param requiredRole - The role to check against
 */
export const createRoleCheckSelector = (requiredRole: UserRole) =>
  createSelector(
    [selectUserRole],
    (userRole): boolean => {
      if (!userRole) return false;
      const roleHierarchy = {
        [UserRole.ADMIN]: 4,
        [UserRole.MANAGER]: 3,
        [UserRole.MEMBER]: 2,
        [UserRole.GUEST]: 1
      };
      return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    }
  );