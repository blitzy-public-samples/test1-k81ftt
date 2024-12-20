/**
 * @fileoverview Redux actions for managing global UI state
 * Includes theme management, sidebar visibility, and enhanced notification system
 * @version 1.0.0
 */

import { createAction } from '@reduxjs/toolkit'; // v2.0.0
import { UIState } from '../../types/store.types';
import { ThemeMode } from '../../constants/theme.constants';

/**
 * Action type constants for UI actions
 * Follows Redux best practices for action naming
 */
export const UI_ACTION_TYPES = {
  SET_THEME: 'ui/setTheme',
  TOGGLE_SIDEBAR: 'ui/toggleSidebar',
  ADD_NOTIFICATION: 'ui/addNotification',
  REMOVE_NOTIFICATION: 'ui/removeNotification',
  SET_USER_PREFERENCES: 'ui/setUserPreferences',
  SET_BREAKPOINT: 'ui/setBreakpoint',
  SET_LOADING: 'ui/setLoading'
} as const;

/**
 * Interface for enhanced notifications with priority and grouping
 */
export interface EnhancedNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  duration?: number;
  groupId?: string;
  actionLabel?: string;
  actionUrl?: string;
  isPersistent?: boolean;
  timestamp: Date;
}

/**
 * Interface for user accessibility and motion preferences
 */
export interface UserPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  colorBlindMode: boolean;
  useSystemTheme: boolean;
}

/**
 * Action creator for updating application theme
 * Supports light, dark, and high-contrast modes
 */
export const setTheme = createAction<ThemeMode>(
  UI_ACTION_TYPES.SET_THEME,
  (theme: ThemeMode) => {
    // Cache theme preference in localStorage
    localStorage.setItem('theme', theme);
    return { payload: theme };
  }
);

/**
 * Action creator for toggling sidebar visibility
 * Maintains state between user sessions
 */
export const toggleSidebar = createAction(
  UI_ACTION_TYPES.TOGGLE_SIDEBAR,
  () => {
    const currentState = localStorage.getItem('sidebarExpanded') === 'true';
    localStorage.setItem('sidebarExpanded', (!currentState).toString());
    return { payload: undefined };
  }
);

/**
 * Action creator for adding notifications with priority and grouping
 * Supports enhanced notification features including persistence and actions
 */
export const addNotification = createAction<EnhancedNotification>(
  UI_ACTION_TYPES.ADD_NOTIFICATION,
  (notification: EnhancedNotification) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      payload: {
        ...notification,
        id,
        timestamp: new Date(),
        duration: notification.duration ?? 5000,
        isPersistent: notification.isPersistent ?? false
      }
    };
  }
);

/**
 * Action creator for removing notifications
 * Supports removal by ID with cleanup of related notifications
 */
export const removeNotification = createAction<string>(
  UI_ACTION_TYPES.REMOVE_NOTIFICATION
);

/**
 * Action creator for updating user accessibility preferences
 * Supports comprehensive accessibility settings
 */
export const setUserPreferences = createAction<UserPreferences>(
  UI_ACTION_TYPES.SET_USER_PREFERENCES,
  (preferences: UserPreferences) => {
    // Cache preferences in localStorage
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    return { payload: preferences };
  }
);

/**
 * Action creator for updating current breakpoint
 * Tracks responsive layout breakpoints
 */
export const setBreakpoint = createAction<UIState['currentBreakpoint']>(
  UI_ACTION_TYPES.SET_BREAKPOINT
);

/**
 * Action creator for managing loading states
 * Supports global and operation-specific loading states
 */
export const setLoading = createAction<{
  global?: boolean;
  operation?: string;
  isLoading: boolean;
}>(UI_ACTION_TYPES.SET_LOADING);

/**
 * Type guard to check if a notification is an EnhancedNotification
 */
export function isEnhancedNotification(
  notification: unknown
): notification is EnhancedNotification {
  return (
    typeof notification === 'object' &&
    notification !== null &&
    'message' in notification &&
    'type' in notification &&
    'priority' in notification
  );
}