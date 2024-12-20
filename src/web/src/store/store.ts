/**
 * @fileoverview Redux Store Configuration
 * Implements comprehensive store setup with middleware, enhancers, and development tools
 * for the Task Management System with real-time updates and performance optimization.
 * @version 1.0.0
 */

import { configureStore, Middleware, EnhancedStore } from '@reduxjs/toolkit'; // ^2.0.0
import createSagaMiddleware from 'redux-saga'; // ^1.2.0
import logger from 'redux-logger'; // ^3.0.6
import rootReducer from './reducers/root.reducer';
import rootSaga from './sagas/root.saga';
import { RootState } from '../types/store.types';

// Constants for store configuration
const REDUX_LOGGER_COLLAPSED = true;
const REDUX_LOGGER_DURATION = true;
const REDUX_LOGGER_TIMESTAMP = true;

/**
 * Configure Redux store with middleware and development tools
 * @returns Configured Redux store instance
 */
const configureAppStore = (): EnhancedStore<RootState> => {
  // Create saga middleware
  const sagaMiddleware = createSagaMiddleware();

  // Configure middleware array based on environment
  const middleware: Middleware[] = [sagaMiddleware];

  // Add logger middleware in development
  if (process.env.NODE_ENV === 'development') {
    middleware.push(
      logger({
        collapsed: REDUX_LOGGER_COLLAPSED,
        duration: REDUX_LOGGER_DURATION,
        timestamp: REDUX_LOGGER_TIMESTAMP,
        // Filter out certain actions from logging
        predicate: (_, action) => !action.type.includes('@@redux-form')
      })
    );
  }

  // Configure store with middleware and enhancers
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: false, // Disable thunk as we're using sagas
        serializableCheck: {
          // Ignore certain paths for serialization check
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
          ignoredPaths: ['router', 'form']
        }
      }).concat(middleware),
    devTools: process.env.NODE_ENV !== 'production',
    enhancers: []
  });

  // Run root saga
  sagaMiddleware.run(rootSaga);

  // Set up store monitoring
  setupStoreMonitoring(store);

  return store;
};

/**
 * Configure store monitoring and performance tracking
 * @param store - Redux store instance
 */
const setupStoreMonitoring = (store: EnhancedStore<RootState>): void => {
  // Monitor state changes
  store.subscribe(() => {
    const state = store.getState();
    
    // Track performance metrics
    const stateSize = new Blob([JSON.stringify(state)]).size;
    if (stateSize > 1024 * 1024) { // 1MB
      console.warn('Redux state size exceeds 1MB:', stateSize);
    }

    // Monitor memory usage
    if (performance?.memory) {
      const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
      const memoryUsage = (usedJSHeapSize / jsHeapSizeLimit) * 100;
      if (memoryUsage > 80) {
        console.warn('High memory usage:', memoryUsage.toFixed(2) + '%');
      }
    }
  });

  // Track action timing
  if (process.env.NODE_ENV === 'development') {
    const startTime = Date.now();
    store.subscribe(() => {
      const duration = Date.now() - startTime;
      if (duration > 500) { // 500ms threshold
        console.warn('Slow state update detected:', duration + 'ms');
      }
    });
  }
};

// Create store instance
export const store = configureAppStore();

// Export store's dispatch and state types
export type AppDispatch = typeof store.dispatch;
export type AppState = ReturnType<typeof store.getState>;

// Type-safe hooks for components
export const useAppDispatch = () => store.dispatch as AppDispatch;
export const useAppSelector = <T>(selector: (state: RootState) => T): T => {
  const state = store.getState();
  return selector(state);
};

export default store;