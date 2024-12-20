/**
 * @fileoverview Authentication Saga Implementation
 * @version 1.0.0
 * 
 * Implements comprehensive authentication saga effects with enhanced security,
 * performance monitoring, and error handling for the Task Management System.
 */

import { 
  call, 
  put, 
  takeLatest, 
  delay, 
  all, 
  fork, 
  race, 
  cancel,
  select
} from 'redux-saga/effects';
import CircuitBreaker from 'opossum';
import { 
  loginRequest, 
  loginSuccess, 
  loginFailure,
  refreshTokenRequest,
  refreshTokenSuccess,
  refreshTokenFailure,
  verifyMfaRequest,
  verifyMfaSuccess,
  verifyMfaFailure,
  logout,
  sessionTimeout,
  rateLimitExceeded,
  securityEvent
} from '../actions/auth.actions';
import { authService } from '../../services/auth.service';
import { 
  LoginCredentials, 
  AuthTokens, 
  AuthUser, 
  MfaVerificationData,
  SecurityEventType
} from '../../types/auth.types';
import { handleApiError } from '../../utils/error.utils';

// Constants for authentication operations
const TOKEN_REFRESH_INTERVAL = 300000; // 5 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_TIMEOUT = 30000; // 30 seconds
const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

// Initialize circuit breaker for auth operations
const authCircuitBreaker = new CircuitBreaker(authService.login, CIRCUIT_BREAKER_OPTIONS);

/**
 * Handles user login with enhanced security and monitoring
 */
function* loginSaga(action: ReturnType<typeof loginRequest>) {
  try {
    // Start performance monitoring
    const startTime = performance.now();

    // Check rate limiting
    const attempts = yield select(state => state.auth.loginAttempts);
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      yield put(rateLimitExceeded({ retryAfter: 1800 })); // 30 minutes
      return;
    }

    // Attempt login with circuit breaker protection
    const { response, timeout } = yield race({
      response: call([authCircuitBreaker, 'fire'], action.payload),
      timeout: delay(LOGIN_TIMEOUT)
    });

    if (timeout) {
      throw new Error('Login request timed out');
    }

    const { user, tokens } = response;

    // Handle MFA if required
    if (user.mfaEnabled) {
      yield put(verifyMfaRequest({ userId: user.id }));
      return;
    }

    // Log successful login
    yield put(securityEvent({
      type: SecurityEventType.LOGIN_SUCCESS,
      metadata: {
        userId: user.id,
        timestamp: Date.now(),
        duration: performance.now() - startTime
      }
    }));

    yield put(loginSuccess({ user, tokens }));

    // Initialize token refresh cycle
    yield fork(refreshTokenCycle);

  } catch (error) {
    // Handle login failure with enhanced error context
    yield put(loginFailure({ 
      error: handleApiError(error).message,
      attempts: (attempts || 0) + 1
    }));

    // Log security event
    yield put(securityEvent({
      type: SecurityEventType.LOGIN_FAILURE,
      metadata: {
        error: error.message,
        timestamp: Date.now()
      }
    }));
  }
}

/**
 * Handles MFA verification with timeout and retry logic
 */
function* verifyMfaSaga(action: ReturnType<typeof verifyMfaRequest>) {
  try {
    const { response, timeout } = yield race({
      response: call(authService.verifyMfa, action.payload),
      timeout: delay(LOGIN_TIMEOUT)
    });

    if (timeout) {
      throw new Error('MFA verification timed out');
    }

    if (response.verified) {
      yield put(verifyMfaSuccess());
      
      // Log successful MFA verification
      yield put(securityEvent({
        type: SecurityEventType.MFA_ENABLED,
        metadata: {
          userId: action.payload.userId,
          timestamp: Date.now()
        }
      }));
    } else {
      throw new Error('Invalid MFA code');
    }
  } catch (error) {
    yield put(verifyMfaFailure({ error: handleApiError(error).message }));
  }
}

/**
 * Manages token refresh cycle with automatic retry and circuit breaker
 */
function* refreshTokenCycle() {
  while (true) {
    try {
      yield delay(TOKEN_REFRESH_INTERVAL);
      
      const { response, timeout } = yield race({
        response: call(authService.refreshTokens),
        timeout: delay(5000)
      });

      if (timeout) {
        throw new Error('Token refresh timed out');
      }

      yield put(refreshTokenSuccess(response));

    } catch (error) {
      yield put(refreshTokenFailure({ error: handleApiError(error).message }));
      
      // Check if error requires user re-authentication
      if (error.response?.status === 401) {
        yield put(sessionTimeout());
        break;
      }
    }
  }
}

/**
 * Handles user logout with cleanup
 */
function* logoutSaga() {
  try {
    yield call(authService.logout);
    
    // Log security event
    yield put(securityEvent({
      type: SecurityEventType.LOGOUT,
      metadata: {
        timestamp: Date.now()
      }
    }));

  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Ensure cleanup even if logout fails
    yield cancel();
  }
}

/**
 * Root saga combining all authentication sagas
 */
export function* authSaga() {
  yield all([
    takeLatest(loginRequest.type, loginSaga),
    takeLatest(verifyMfaRequest.type, verifyMfaSaga),
    takeLatest(refreshTokenRequest.type, refreshTokenCycle),
    takeLatest(logout.type, logoutSaga)
  ]);
}