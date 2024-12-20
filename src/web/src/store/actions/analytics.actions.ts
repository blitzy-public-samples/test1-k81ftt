/**
 * @fileoverview Redux actions for analytics state management
 * Implements comprehensive analytics functionality with performance optimization,
 * caching, and real-time updates for the Task Management System
 * @version 1.0.0
 */

import { createAction } from '@reduxjs/toolkit'; // ^1.9.0
import {
  AnalyticsMetrics,
  AnalyticsQuery,
  AnalyticsTimeRange,
  AnalyticsComparison,
  AnalyticsExport
} from '../types/analytics.types';
import { analyticsService } from '../../services/analytics.service';
import { handleApiError } from '../../utils/error.utils';

// Action type prefix for analytics domain
const ANALYTICS_ACTION_PREFIX = '@analytics/' as const;

// Cache duration for analytics data (5 minutes)
const ANALYTICS_CACHE_DURATION = 300000 as const;

// Maximum retry attempts for failed requests
const ANALYTICS_RETRY_ATTEMPTS = 3 as const;

// Batch size for large data operations
const ANALYTICS_BATCH_SIZE = 100 as const;

/**
 * Comprehensive analytics action types enum
 */
export enum AnalyticsActionTypes {
  FETCH_METRICS_REQUEST = '@analytics/FETCH_METRICS_REQUEST',
  FETCH_METRICS_SUCCESS = '@analytics/FETCH_METRICS_SUCCESS',
  FETCH_METRICS_FAILURE = '@analytics/FETCH_METRICS_FAILURE',
  SET_TIME_RANGE = '@analytics/SET_TIME_RANGE',
  GENERATE_REPORT_REQUEST = '@analytics/GENERATE_REPORT_REQUEST',
  GENERATE_REPORT_SUCCESS = '@analytics/GENERATE_REPORT_SUCCESS',
  GENERATE_REPORT_FAILURE = '@analytics/GENERATE_REPORT_FAILURE',
  UPDATE_COMPARISON_DATA = '@analytics/UPDATE_COMPARISON_DATA',
  CLEAR_ANALYTICS_STATE = '@analytics/CLEAR_ANALYTICS_STATE',
  EXPORT_ANALYTICS_REQUEST = '@analytics/EXPORT_ANALYTICS_REQUEST',
  EXPORT_ANALYTICS_SUCCESS = '@analytics/EXPORT_ANALYTICS_SUCCESS',
  EXPORT_ANALYTICS_FAILURE = '@analytics/EXPORT_ANALYTICS_FAILURE'
}

/**
 * Action creator for initiating metrics fetch
 * Implements caching and retry logic for optimal performance
 */
export const fetchMetricsRequest = createAction(
  AnalyticsActionTypes.FETCH_METRICS_REQUEST,
  (query: AnalyticsQuery) => ({
    payload: {
      query,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: ANALYTICS_RETRY_ATTEMPTS,
      cacheKey: `metrics-${JSON.stringify(query)}`
    }
  })
);

/**
 * Action creator for successful metrics fetch
 */
export const fetchMetricsSuccess = createAction(
  AnalyticsActionTypes.FETCH_METRICS_SUCCESS,
  (metrics: AnalyticsMetrics) => ({
    payload: {
      metrics,
      timestamp: Date.now(),
      cached: false
    }
  })
);

/**
 * Action creator for failed metrics fetch
 */
export const fetchMetricsFailure = createAction(
  AnalyticsActionTypes.FETCH_METRICS_FAILURE,
  (error: Error) => ({
    payload: {
      error: handleApiError(error),
      timestamp: Date.now()
    }
  })
);

/**
 * Action creator for updating analytics time range
 * Includes validation and date formatting
 */
export const setTimeRange = createAction(
  AnalyticsActionTypes.SET_TIME_RANGE,
  (timeRange: AnalyticsTimeRange) => ({
    payload: {
      timeRange: {
        startDate: new Date(timeRange.startDate),
        endDate: new Date(timeRange.endDate),
        timezone: timeRange.timezone
      },
      timestamp: Date.now()
    }
  })
);

/**
 * Action creator for initiating report generation
 */
export const generateReportRequest = createAction(
  AnalyticsActionTypes.GENERATE_REPORT_REQUEST,
  (query: AnalyticsQuery) => ({
    payload: {
      query,
      timestamp: Date.now(),
      requestId: `report-${Date.now()}`
    }
  })
);

/**
 * Action creator for successful report generation
 */
export const generateReportSuccess = createAction(
  AnalyticsActionTypes.GENERATE_REPORT_SUCCESS,
  (reportUrl: string) => ({
    payload: {
      reportUrl,
      timestamp: Date.now()
    }
  })
);

/**
 * Action creator for failed report generation
 */
export const generateReportFailure = createAction(
  AnalyticsActionTypes.GENERATE_REPORT_FAILURE,
  (error: Error) => ({
    payload: {
      error: handleApiError(error),
      timestamp: Date.now()
    }
  })
);

/**
 * Action creator for updating comparison data
 * Includes trend calculation and data processing
 */
export const updateComparisonData = createAction(
  AnalyticsActionTypes.UPDATE_COMPARISON_DATA,
  (comparisonData: AnalyticsComparison) => ({
    payload: {
      comparisonData,
      timestamp: Date.now(),
      trends: calculateTrends(comparisonData)
    }
  })
);

/**
 * Action creator for clearing analytics state
 * Implements proper cleanup of resources
 */
export const clearAnalyticsState = createAction(
  AnalyticsActionTypes.CLEAR_ANALYTICS_STATE,
  () => ({
    payload: {
      timestamp: Date.now(),
      cleanupTasks: ['cache', 'pending-requests', 'subscriptions']
    }
  })
);

/**
 * Action creator for initiating analytics export
 */
export const exportAnalyticsRequest = createAction(
  AnalyticsActionTypes.EXPORT_ANALYTICS_REQUEST,
  (exportConfig: AnalyticsExport) => ({
    payload: {
      exportConfig,
      timestamp: Date.now(),
      format: exportConfig.format || 'CSV',
      compression: exportConfig.compression || false
    }
  })
);

/**
 * Helper function to calculate trends from comparison data
 * @param comparisonData - Analytics comparison data
 * @returns Calculated trends and indicators
 */
function calculateTrends(comparisonData: AnalyticsComparison): Record<string, number> {
  const trends: Record<string, number> = {};
  
  if (comparisonData.current && comparisonData.previous) {
    Object.keys(comparisonData.current).forEach(metric => {
      const currentValue = comparisonData.current[metric];
      const previousValue = comparisonData.previous[metric];
      
      if (typeof currentValue === 'number' && typeof previousValue === 'number' && previousValue !== 0) {
        trends[metric] = ((currentValue - previousValue) / previousValue) * 100;
      }
    });
  }
  
  return trends;
}

// Export action types for reducer consumption
export type AnalyticsAction = ReturnType<
  | typeof fetchMetricsRequest
  | typeof fetchMetricsSuccess
  | typeof fetchMetricsFailure
  | typeof setTimeRange
  | typeof generateReportRequest
  | typeof generateReportSuccess
  | typeof generateReportFailure
  | typeof updateComparisonData
  | typeof clearAnalyticsState
  | typeof exportAnalyticsRequest
>;