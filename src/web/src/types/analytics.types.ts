/**
 * @fileoverview Analytics type definitions for the Task Management System
 * Provides comprehensive type safety for analytics features including metrics,
 * charts, and dashboard data structures
 * @version 1.0.0
 */

import { Status, DateRange, ApiResponse, PaginatedResponse } from './common.types';
// chart.js v4.0.0
import type { ChartData } from 'chart.js';

/**
 * Core analytics metrics interface including all tracked KPIs and business impact metrics
 */
export interface AnalyticsMetrics {
  /** Total number of tasks in the system */
  totalTasks: number;
  /** Number of completed tasks */
  completedTasks: number;
  /** Number of overdue tasks */
  overdueTasks: number;
  /** Average time to complete tasks (in hours) */
  averageCompletionTime: number;
  /** Distribution of tasks by their current status */
  tasksByStatus: Record<Status, number>;
  /** Productivity score (0-100) measuring team efficiency */
  productivityScore: number;
  /** Percentage reduction in project delays */
  delayReduction: number;
  /** Task visibility score (0-100) measuring transparency */
  visibilityScore: number;
}

/**
 * Time range type for analytics queries
 * Extends the base DateRange with analytics-specific properties
 */
export type AnalyticsTimeRange = DateRange;

/**
 * Enhanced analytics query parameters interface with flexible filtering
 * Supports comprehensive data analysis and comparison
 */
export interface AnalyticsQuery {
  /** Time range for the analytics query */
  timeRange: AnalyticsTimeRange;
  /** Optional project ID filter */
  projectId?: string;
  /** Optional user ID filter */
  userId?: string;
  /** Time grouping granularity */
  groupBy: 'day' | 'week' | 'month';
  /** Specific metrics to retrieve */
  metrics: Array<keyof AnalyticsMetrics>;
  /** Flag to include comparison with previous period */
  compareWithPrevious: boolean;
}

/**
 * Extended analytics Redux state interface with comparison and update tracking
 */
export interface AnalyticsState {
  /** Current analytics metrics */
  metrics: AnalyticsMetrics | null;
  /** Loading state indicator */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current time range selection */
  timeRange: AnalyticsTimeRange;
  /** Comparison period data when applicable */
  comparisonData: AnalyticsMetrics | null;
  /** Timestamp of last data update */
  lastUpdated: Date;
}

/**
 * Chart dataset structure for analytics visualizations
 * Compatible with Chart.js library
 */
export interface ChartDataset {
  /** Dataset label */
  label: string;
  /** Array of numeric data points */
  data: number[];
  /** Background color(s) for chart elements */
  backgroundColor: string | string[];
  /** Border color(s) for chart elements */
  borderColor: string | string[];
}

/**
 * API response type for analytics data
 * Wraps analytics metrics in standard API response structure
 */
export type AnalyticsResponse = ApiResponse<AnalyticsMetrics>;

/**
 * Paginated API response type for analytics data
 * Used for paginated analytics results
 */
export type PaginatedAnalyticsResponse = PaginatedResponse<AnalyticsMetrics>;

/**
 * Type guard to check if metrics meet minimum threshold
 * @param metrics - Analytics metrics to validate
 * @returns boolean indicating if metrics meet minimum requirements
 */
export function isValidMetrics(metrics: Partial<AnalyticsMetrics>): metrics is AnalyticsMetrics {
  return (
    typeof metrics.totalTasks === 'number' &&
    typeof metrics.completedTasks === 'number' &&
    typeof metrics.productivityScore === 'number' &&
    typeof metrics.delayReduction === 'number' &&
    typeof metrics.visibilityScore === 'number'
  );
}

/**
 * Type guard for chart dataset validation
 * @param dataset - Dataset to validate
 * @returns boolean indicating if dataset is valid
 */
export function isValidChartDataset(dataset: unknown): dataset is ChartDataset {
  return (
    typeof dataset === 'object' &&
    dataset !== null &&
    'label' in dataset &&
    'data' in dataset &&
    Array.isArray((dataset as ChartDataset).data) &&
    (dataset as ChartDataset).data.every(item => typeof item === 'number')
  );
}