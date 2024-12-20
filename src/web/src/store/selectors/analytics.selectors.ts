/**
 * @fileoverview Redux selectors for analytics state management
 * Provides memoized selectors for accessing analytics metrics and derived statistics
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // v2.0.0
import type { RootState } from '../../types/store.types';
import type { 
  AnalyticsState, 
  AnalyticsMetrics, 
  AnalyticsTimeRange 
} from '../../types/analytics.types';

/**
 * Base selector to access the analytics state slice
 * @param state - Root Redux state
 * @returns The analytics state slice
 */
export const selectAnalyticsState = (state: RootState): AnalyticsState => state.analytics;

/**
 * Memoized selector for analytics metrics data
 * @param state - Root Redux state
 * @returns Current analytics metrics or null if not loaded
 */
export const selectAnalyticsMetrics = createSelector(
  [selectAnalyticsState],
  (analyticsState): AnalyticsMetrics | null => analyticsState.metrics
);

/**
 * Memoized selector for analytics loading state
 * @param state - Root Redux state
 * @returns Boolean indicating if analytics are loading
 */
export const selectAnalyticsLoading = createSelector(
  [selectAnalyticsState],
  (analyticsState): boolean => analyticsState.loading
);

/**
 * Memoized selector for analytics error state
 * @param state - Root Redux state
 * @returns Error message or null if no error
 */
export const selectAnalyticsError = createSelector(
  [selectAnalyticsState],
  (analyticsState): string | null => analyticsState.error
);

/**
 * Memoized selector for analytics time range
 * @param state - Root Redux state
 * @returns Current analytics time range
 */
export const selectAnalyticsTimeRange = createSelector(
  [selectAnalyticsState],
  (analyticsState): AnalyticsTimeRange => analyticsState.timeRange
);

/**
 * Memoized selector for comparison metrics data
 * @param state - Root Redux state
 * @returns Comparison period metrics or null if not available
 */
export const selectComparisonMetrics = createSelector(
  [selectAnalyticsState],
  (analyticsState): AnalyticsMetrics | null => analyticsState.comparisonData
);

/**
 * Memoized selector for task completion rate
 * @param state - Root Redux state
 * @returns Task completion rate as a percentage
 */
export const selectTaskCompletionRate = createSelector(
  [selectAnalyticsMetrics],
  (metrics): number => {
    if (!metrics) return 0;
    const { totalTasks, completedTasks } = metrics;
    if (totalTasks === 0) return 0;
    return Number(((completedTasks / totalTasks) * 100).toFixed(2));
  }
);

/**
 * Memoized selector for productivity improvement
 * Calculates improvement based on productivity score
 * @param state - Root Redux state
 * @returns Productivity improvement percentage
 */
export const selectProductivityImprovement = createSelector(
  [selectAnalyticsMetrics, selectComparisonMetrics],
  (currentMetrics, previousMetrics): number => {
    if (!currentMetrics || !previousMetrics) return 0;
    const current = currentMetrics.productivityScore;
    const previous = previousMetrics.productivityScore;
    if (previous === 0) return 0;
    return Number(((current - previous) / previous * 100).toFixed(2));
  }
);

/**
 * Memoized selector for project delay reduction
 * @param state - Root Redux state
 * @returns Delay reduction percentage
 */
export const selectProjectDelayReduction = createSelector(
  [selectAnalyticsMetrics],
  (metrics): number => {
    if (!metrics) return 0;
    return Number(metrics.delayReduction.toFixed(2));
  }
);

/**
 * Memoized selector for task visibility improvement
 * @param state - Root Redux state
 * @returns Visibility improvement percentage
 */
export const selectTaskVisibilityImprovement = createSelector(
  [selectAnalyticsMetrics],
  (metrics): number => {
    if (!metrics) return 0;
    return Number(metrics.visibilityScore.toFixed(2));
  }
);

/**
 * Memoized selector for overdue tasks percentage
 * @param state - Root Redux state
 * @returns Percentage of overdue tasks
 */
export const selectOverdueTasksPercentage = createSelector(
  [selectAnalyticsMetrics],
  (metrics): number => {
    if (!metrics) return 0;
    const { totalTasks, overdueTasks } = metrics;
    if (totalTasks === 0) return 0;
    return Number(((overdueTasks / totalTasks) * 100).toFixed(2));
  }
);