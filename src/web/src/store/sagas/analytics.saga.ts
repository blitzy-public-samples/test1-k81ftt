/**
 * @fileoverview Redux saga for handling analytics-related side effects
 * Implements comprehensive analytics functionality with performance monitoring,
 * error handling, and retry logic for the Task Management System
 * @version 1.0.0
 */

import { call, put, takeLatest, all, race, delay } from 'redux-saga/effects'; // ^1.2.0
import {
  AnalyticsActionTypes,
  fetchMetricsSuccess,
  fetchMetricsFailure,
  generateReportSuccess,
  generateReportFailure
} from '../actions/analytics.actions';
import { analyticsService } from '../../services/analytics.service';
import { handleApiError } from '../../utils/error.utils';
import type { 
  AnalyticsQuery, 
  AnalyticsMetrics, 
  AnalyticsResponse 
} from '../../types/analytics.types';
import type { Action } from '@reduxjs/toolkit';

// Constants for saga configuration
const API_TIMEOUT = 500; // 500ms per requirements
const MAX_RETRY_ATTEMPTS = 3;
const CHUNK_SIZE = 1000;

/**
 * Saga for handling analytics metrics fetch requests with timeout and retry logic
 * @param action - Redux action containing analytics query parameters
 */
function* fetchMetricsSaga(action: Action<{ payload: AnalyticsQuery }>) {
  const startTime = performance.now();
  let retryCount = 0;

  try {
    while (retryCount <= MAX_RETRY_ATTEMPTS) {
      // Race between API call and timeout
      const { response, timeout } = yield race({
        response: call(analyticsService.getMetrics, action.payload),
        timeout: delay(API_TIMEOUT)
      });

      // Handle timeout
      if (timeout) {
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          retryCount++;
          // Exponential backoff
          yield delay(Math.pow(2, retryCount) * 100);
          continue;
        }
        throw new Error('Analytics request timed out');
      }

      // Validate response
      if (response && response.data) {
        // Track performance metrics
        const duration = performance.now() - startTime;
        
        yield put(fetchMetricsSuccess({
          ...response.data,
          _meta: {
            duration,
            timestamp: Date.now(),
            retryCount
          }
        }));
        return;
      }
    }

    throw new Error('Invalid metrics response');

  } catch (error) {
    const apiError = handleApiError(error as Error);
    yield put(fetchMetricsFailure(apiError));
  } finally {
    // Log performance metrics
    const totalDuration = performance.now() - startTime;
    console.debug(`Analytics fetch completed in ${totalDuration}ms with ${retryCount} retries`);
  }
}

/**
 * Saga for handling analytics report generation with progress tracking
 * @param action - Redux action containing report generation parameters
 */
function* generateReportSaga(action: Action<{ payload: AnalyticsQuery }>) {
  const startTime = performance.now();
  let progress = 0;

  try {
    // Initialize report generation
    const reportData: AnalyticsMetrics[] = [];
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const query = {
        ...action.payload,
        offset,
        limit: CHUNK_SIZE
      };

      // Race between chunk processing and timeout
      const { response, timeout } = yield race({
        response: call(analyticsService.getMetrics, query),
        timeout: delay(API_TIMEOUT)
      });

      if (timeout) {
        throw new Error('Report generation timed out');
      }

      if (response && response.data) {
        reportData.push(...response.data);
        offset += CHUNK_SIZE;
        progress = Math.min((offset / response.total) * 100, 100);

        // Update progress
        yield put({
          type: 'REPORT_PROGRESS_UPDATE',
          payload: { progress }
        });

        hasMore = offset < response.total;
      } else {
        hasMore = false;
      }
    }

    // Generate final report
    const report = yield call(analyticsService.generateReport, reportData);
    yield put(generateReportSuccess(report));

  } catch (error) {
    const apiError = handleApiError(error as Error);
    yield put(generateReportFailure(apiError));
  } finally {
    const totalDuration = performance.now() - startTime;
    console.debug(`Report generation completed in ${totalDuration}ms`);
  }
}

/**
 * Root saga that combines all analytics-related sagas
 * Implements error boundary and performance monitoring
 */
export function* watchAnalyticsSagas() {
  try {
    yield all([
      takeLatest(AnalyticsActionTypes.FETCH_METRICS_REQUEST, fetchMetricsSaga),
      takeLatest(AnalyticsActionTypes.GENERATE_REPORT_REQUEST, generateReportSaga)
    ]);
  } catch (error) {
    // Global error boundary for analytics sagas
    console.error('Analytics saga error:', error);
    yield put({
      type: 'ANALYTICS_SAGA_ERROR',
      payload: handleApiError(error as Error)
    });
  }
}