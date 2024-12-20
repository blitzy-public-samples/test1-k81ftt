/**
 * @fileoverview Analytics Redux Reducer
 * Manages analytics state with comprehensive metrics tracking, historical data comparison,
 * and performance monitoring for the Task Management System
 * @version 1.0.0
 */

import { createReducer } from '@reduxjs/toolkit'; // ^1.9.0
import {
  AnalyticsState,
  AnalyticsMetrics,
  AnalyticsTimeRange,
  HistoricalData,
  CustomDashboard,
} from '../../types/analytics.types';
import { AnalyticsActionTypes } from '../actions/analytics.actions';

/**
 * Initial state for analytics with comprehensive tracking
 */
const initialState: AnalyticsState = {
  metrics: null,
  historicalData: null,
  customDashboards: [],
  loading: {
    metrics: false,
    historical: false,
    export: false
  },
  error: {
    metrics: null,
    historical: null,
    export: null,
    details: null
  },
  timeRange: {
    startDate: new Date(),
    endDate: new Date(),
    comparison: null
  },
  lastRefresh: new Date(),
  exportStatus: null
};

/**
 * Enhanced analytics reducer with comprehensive state management
 * Handles metrics tracking, historical comparison, and error handling
 */
export const analyticsReducer = createReducer(initialState, (builder) => {
  builder
    // Handle metrics fetch request
    .addCase(AnalyticsActionTypes.FETCH_METRICS_REQUEST, (state) => {
      state.loading.metrics = true;
      state.error.metrics = null;
    })

    // Handle successful metrics fetch
    .addCase(AnalyticsActionTypes.FETCH_METRICS_SUCCESS, (state, action) => {
      const { metrics, timestamp } = action.payload;
      state.metrics = metrics;
      state.loading.metrics = false;
      state.lastRefresh = new Date(timestamp);
      state.error.metrics = null;

      // Calculate performance indicators
      if (metrics) {
        const completionRate = (metrics.completedTasks / metrics.totalTasks) * 100;
        const productivityIncrease = metrics.productivityScore - (state.historicalData?.previousScore || 0);
        
        // Update historical tracking
        state.historicalData = {
          ...state.historicalData,
          previousScore: state.metrics?.productivityScore || 0,
          completionTrend: [...(state.historicalData?.completionTrend || []), completionRate],
          productivityTrend: [...(state.historicalData?.productivityTrend || []), productivityIncrease]
        };
      }
    })

    // Handle metrics fetch failure
    .addCase(AnalyticsActionTypes.FETCH_METRICS_FAILURE, (state, action) => {
      const { error, timestamp } = action.payload;
      state.loading.metrics = false;
      state.error.metrics = error;
      state.error.details = {
        timestamp,
        code: error.code,
        message: error.message
      };
    })

    // Handle time range updates
    .addCase(AnalyticsActionTypes.SET_TIME_RANGE, (state, action) => {
      const { timeRange } = action.payload;
      state.timeRange = {
        ...timeRange,
        comparison: calculateComparisonRange(timeRange)
      };
    })

    // Handle historical data fetch
    .addCase(AnalyticsActionTypes.FETCH_HISTORICAL_DATA, (state, action) => {
      const { historicalData } = action.payload;
      state.historicalData = {
        ...state.historicalData,
        ...historicalData,
        lastUpdated: new Date()
      };
    })

    // Handle dashboard updates
    .addCase(AnalyticsActionTypes.UPDATE_DASHBOARD, (state, action) => {
      const { dashboard } = action.payload;
      const existingIndex = state.customDashboards.findIndex(d => d.id === dashboard.id);
      
      if (existingIndex >= 0) {
        state.customDashboards[existingIndex] = {
          ...state.customDashboards[existingIndex],
          ...dashboard,
          lastModified: new Date()
        };
      } else {
        state.customDashboards.push({
          ...dashboard,
          created: new Date(),
          lastModified: new Date()
        });
      }
    })

    // Handle metrics export
    .addCase(AnalyticsActionTypes.EXPORT_METRICS, (state, action) => {
      const { status, error } = action.payload;
      state.loading.export = false;
      state.exportStatus = status;
      state.error.export = error || null;
    });
});

/**
 * Helper function to calculate comparison date range
 * @param timeRange - Current time range
 * @returns Comparison time range for historical analysis
 */
function calculateComparisonRange(timeRange: AnalyticsTimeRange): AnalyticsTimeRange {
  const { startDate, endDate } = timeRange;
  const duration = endDate.getTime() - startDate.getTime();
  
  return {
    startDate: new Date(startDate.getTime() - duration),
    endDate: new Date(endDate.getTime() - duration),
    timezone: timeRange.timezone
  };
}

export default analyticsReducer;