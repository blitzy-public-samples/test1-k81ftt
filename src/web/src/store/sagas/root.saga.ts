/**
 * @fileoverview Root Saga Implementation for Task Management System
 * Coordinates all feature-specific sagas with comprehensive error handling,
 * performance monitoring, and graceful cancellation.
 * @version 1.0.0
 */

import { all, fork, spawn, call, delay } from 'redux-saga/effects'; // ^1.2.0
import { watchAnalyticsSagas } from './analytics.saga';
import { watchAuthSagas } from './auth.saga';
import { watchProjectSagas } from './project.saga';
import { watchTaskSagas } from './task.saga';

// Constants for saga error handling
const SAGA_RETRY_ATTEMPTS = 3;
const SAGA_RETRY_DELAY = 1000; // 1 second
const SAGA_ERROR_THRESHOLD = 5;

/**
 * Higher-order function that wraps feature sagas with error handling and retry logic
 * @param saga - Feature saga to wrap with error boundary
 * @param sagaName - Name of the saga for logging
 */
function createSagaErrorBoundary(saga: () => Generator, sagaName: string) {
  return function* () {
    let errorCount = 0;
    
    while (true) {
      try {
        yield call(saga);
        break; // Exit loop if saga completes successfully
      } catch (error) {
        errorCount++;
        console.error(`Error in ${sagaName} saga:`, error);

        // Track saga performance and errors
        const errorEvent = {
          sagaName,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          errorCount
        };

        // Log error event for monitoring
        console.error('Saga Error Event:', errorEvent);

        // Check if error threshold is exceeded
        if (errorCount >= SAGA_ERROR_THRESHOLD) {
          console.error(`${sagaName} saga exceeded error threshold. Stopping saga.`);
          break;
        }

        // Implement exponential backoff for retries
        const retryDelay = SAGA_RETRY_DELAY * Math.pow(2, errorCount - 1);
        yield delay(retryDelay);

        // Continue with next retry attempt
        if (errorCount < SAGA_RETRY_ATTEMPTS) {
          console.log(`Retrying ${sagaName} saga. Attempt ${errorCount + 1}`);
          continue;
        }

        // Max retries exceeded
        console.error(`${sagaName} saga max retries exceeded`);
        break;
      }
    }
  };
}

/**
 * Root saga that combines and manages all feature sagas
 * Implements comprehensive error handling and monitoring
 */
export function* rootSaga(): Generator {
  try {
    // Initialize performance monitoring
    const startTime = performance.now();

    // Create error boundaries for each feature saga
    const wrappedSagas = [
      {
        name: 'Analytics',
        saga: createSagaErrorBoundary(watchAnalyticsSagas, 'Analytics')
      },
      {
        name: 'Auth',
        saga: createSagaErrorBoundary(watchAuthSagas, 'Auth')
      },
      {
        name: 'Project',
        saga: createSagaErrorBoundary(watchProjectSagas, 'Project')
      },
      {
        name: 'Task',
        saga: createSagaErrorBoundary(watchTaskSagas, 'Task')
      }
    ];

    // Fork all feature sagas with error isolation
    const sagaTasks = yield all(
      wrappedSagas.map(({ saga }) => 
        spawn(function* () {
          while (true) {
            try {
              yield call(saga);
              break;
            } catch (error) {
              console.error('Saga spawn error:', error);
              // Implement cooldown before respawning
              yield delay(SAGA_RETRY_DELAY);
            }
          }
        })
      )
    );

    // Monitor saga execution performance
    const duration = performance.now() - startTime;
    console.debug(`Root saga initialization completed in ${duration}ms`);

    // Return all saga tasks
    return sagaTasks;
  } catch (error) {
    // Handle critical errors in root saga
    console.error('Critical error in root saga:', error);
    throw error;
  }
}

export default rootSaga;