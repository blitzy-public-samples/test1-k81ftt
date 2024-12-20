/**
 * @fileoverview Root Redux Reducer
 * Combines all feature reducers with type safety and runtime validation
 * for the Task Management System
 * @version 1.0.0
 */

import { combineReducers } from '@reduxjs/toolkit'; // ^2.0.0
import uiReducer from './ui.reducer';
import authReducer from './auth.reducer';
import taskReducer from './task.reducer';
import projectReducer from './project.reducer';
import analyticsReducer from './analytics.reducer';
import { RootState } from '../../types/store.types';

/**
 * Root reducer combining all feature reducers
 * Implements strict type checking and proper state isolation
 */
const rootReducer = combineReducers<RootState>({
  // UI state management for theme, notifications, and layout
  ui: uiReducer,

  // Authentication state for user sessions and permissions
  auth: authReducer,

  // Task management state for CRUD operations
  tasks: taskReducer,

  // Project management state for hierarchy and organization
  projects: projectReducer,

  // Analytics state for metrics and reporting
  analytics: analyticsReducer
});

/**
 * Type-safe selector for accessing root state
 * Ensures proper typing when accessing state in components
 */
export type RootReducerType = ReturnType<typeof rootReducer>;

/**
 * Validate reducer map structure at runtime
 * Ensures all required reducers are properly initialized
 */
const validateReducerMap = (reducer: typeof rootReducer): boolean => {
  const requiredReducers = ['ui', 'auth', 'tasks', 'projects', 'analytics'];
  const actualReducers = Object.keys(reducer);

  return requiredReducers.every(key => actualReducers.includes(key));
};

// Validate reducer structure
if (!validateReducerMap(rootReducer)) {
  throw new Error('Invalid reducer map structure. Missing required reducers.');
}

export default rootReducer;