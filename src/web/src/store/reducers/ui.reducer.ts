/**
 * @fileoverview Redux reducer for managing global UI state including theme mode,
 * sidebar visibility, notifications, and theme preferences
 * @version 1.0.0
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit'; // v2.0.0
import { Theme } from '@mui/material'; // v5.0.0
import { UIState } from '../../types/store.types';
import { ThemeMode } from '../../constants/theme.constants';

/**
 * Interface for Material UI notification with enhanced features
 */
interface MaterialNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  timestamp: Date;
  actionLabel?: string;
  actionCallback?: () => void;
}

/**
 * Initial state for UI reducer with theme preferences
 */
const initialState: UIState = {
  theme: ThemeMode.LIGHT,
  sidebarOpen: true,
  notifications: [],
  useSystemTheme: true,
  highContrastMode: false,
  themeTransition: true
};

/**
 * Redux reducer for UI state management with comprehensive theme support
 */
const uiReducer = createReducer(initialState, (builder) => {
  builder
    // Theme mode management
    .addCase('ui/setTheme', (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
      // Persist theme preference
      localStorage.setItem('themeMode', action.payload);
    })

    // System theme preference toggle
    .addCase('ui/toggleSystemTheme', (state, action: PayloadAction<boolean>) => {
      state.useSystemTheme = action.payload;
      // Update theme based on system preference if enabled
      if (action.payload) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        state.theme = prefersDark ? ThemeMode.DARK : ThemeMode.LIGHT;
      }
      localStorage.setItem('useSystemTheme', String(action.payload));
    })

    // High contrast mode toggle for accessibility
    .addCase('ui/toggleHighContrast', (state, action: PayloadAction<boolean>) => {
      state.highContrastMode = action.payload;
      if (action.payload) {
        state.theme = ThemeMode.HIGH_CONTRAST;
      } else {
        // Revert to previous theme or system preference
        state.theme = state.useSystemTheme
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches
            ? ThemeMode.DARK
            : ThemeMode.LIGHT)
          : ThemeMode.LIGHT;
      }
      localStorage.setItem('highContrastMode', String(action.payload));
    })

    // Sidebar visibility toggle
    .addCase('ui/toggleSidebar', (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
      localStorage.setItem('sidebarOpen', String(action.payload));
    })

    // Add notification with Material Design toast
    .addCase('ui/addNotification', (state, action: PayloadAction<MaterialNotification>) => {
      state.notifications = [
        ...state.notifications,
        {
          ...action.payload,
          timestamp: new Date(),
          id: `notification-${Date.now()}`
        }
      ];
    })

    // Remove notification with animation support
    .addCase('ui/removeNotification', (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    })

    // Theme transition toggle for animations
    .addCase('ui/setThemeTransition', (state, action: PayloadAction<boolean>) => {
      state.themeTransition = action.payload;
      localStorage.setItem('themeTransition', String(action.payload));
    })

    // Initialize UI state from localStorage
    .addCase('ui/initializeState', (state) => {
      // Restore theme preferences
      const savedTheme = localStorage.getItem('themeMode');
      const savedSystemTheme = localStorage.getItem('useSystemTheme');
      const savedHighContrast = localStorage.getItem('highContrastMode');
      const savedSidebarOpen = localStorage.getItem('sidebarOpen');
      const savedThemeTransition = localStorage.getItem('themeTransition');

      if (savedTheme) {
        state.theme = savedTheme as ThemeMode;
      }
      if (savedSystemTheme) {
        state.useSystemTheme = savedSystemTheme === 'true';
      }
      if (savedHighContrast) {
        state.highContrastMode = savedHighContrast === 'true';
      }
      if (savedSidebarOpen) {
        state.sidebarOpen = savedSidebarOpen === 'true';
      }
      if (savedThemeTransition) {
        state.themeTransition = savedThemeTransition === 'true';
      }
    });
});

export default uiReducer;