import { BaseEntity } from '../types/common.types';

/**
 * Interface defining core analytics metrics for measuring system performance and business impact
 */
export interface IAnalyticsMetrics {
  /** Total number of tasks in the system or filtered scope */
  totalTasks: number;
  
  /** Number of completed tasks */
  completedTasks: number;
  
  /** Number of overdue tasks */
  overdueTasks: number;
  
  /** Average time to complete tasks in hours */
  averageCompletionTime: number;
  
  /** Productivity score (0-100) based on task completion rates and timing */
  productivityScore: number;
  
  /** Percentage reduction in project delays */
  delayReduction: number;
}

/**
 * Interface for specifying analytics time range parameters
 */
export interface IAnalyticsTimeRange {
  /** Start date for analytics period */
  startDate: Date;
  
  /** End date for analytics period */
  endDate: Date;
  
  /** IANA timezone identifier */
  timeZone: string;
}

/**
 * Interface for analytics query parameters with filtering and grouping options
 */
export interface IAnalyticsQuery {
  /** Time range for the analytics query */
  timeRange: IAnalyticsTimeRange;
  
  /** Optional project ID filter */
  projectId?: string;
  
  /** Optional user ID filter */
  userId?: string;
  
  /** Time grouping granularity */
  groupBy: 'day' | 'week' | 'month' | 'quarter';
  
  /** Include metrics from sub-projects */
  includeSubProjects: boolean;
}

/**
 * Interface for project-specific analytics data including team performance
 */
export interface IProjectAnalytics extends BaseEntity {
  /** Project identifier */
  projectId: string;
  
  /** Aggregated metrics for the project */
  metrics: IAnalyticsMetrics;
  
  /** Overall project completion percentage */
  progressPercentage: number;
  
  /** Individual team member performance metrics */
  teamPerformance: Record<string, IAnalyticsMetrics>;
  
  /** Timeline of metrics over the specified period */
  timeline: Record<string, IAnalyticsMetrics>;
}

/**
 * Interface for user-specific analytics data
 */
export interface IUserAnalytics extends BaseEntity {
  /** User identifier */
  userId: string;
  
  /** Aggregated metrics for the user */
  metrics: IAnalyticsMetrics;
  
  /** User's contribution to different projects */
  projectContributions: Record<string, IAnalyticsMetrics>;
  
  /** Timeline of user's performance metrics */
  timeline: Record<string, IAnalyticsMetrics>;
}

/**
 * Interface for system-wide analytics data
 */
export interface ISystemAnalytics extends BaseEntity {
  /** System-wide metrics */
  metrics: IAnalyticsMetrics;
  
  /** Performance metrics by department/team */
  departmentMetrics: Record<string, IAnalyticsMetrics>;
  
  /** System utilization metrics */
  utilization: {
    activeUsers: number;
    taskThroughput: number;
    responseTime: number;
  };
}

/**
 * Supported formats for analytics reports and exports
 */
export type ReportFormat = 'pdf' | 'csv' | 'excel';
export type ExportFormat = 'json' | 'csv' | 'excel';

/**
 * Interface defining the analytics service contract
 */
export interface IAnalyticsService {
  /**
   * Retrieves analytics data for a specific project
   * @param projectId - Project identifier
   * @param query - Analytics query parameters
   */
  getProjectAnalytics(projectId: string, query: IAnalyticsQuery): Promise<IProjectAnalytics>;
  
  /**
   * Retrieves analytics data for a specific user
   * @param userId - User identifier
   * @param query - Analytics query parameters
   */
  getUserAnalytics(userId: string, query: IAnalyticsQuery): Promise<IUserAnalytics>;
  
  /**
   * Retrieves system-wide analytics metrics
   * @param query - Analytics query parameters
   */
  getSystemMetrics(query: IAnalyticsQuery): Promise<ISystemAnalytics>;
  
  /**
   * Generates a formatted report of analytics data
   * @param query - Analytics query parameters
   * @param format - Desired report format
   */
  generateReport(query: IAnalyticsQuery, format: ReportFormat): Promise<Buffer>;
  
  /**
   * Exports analytics data in various formats
   * @param query - Analytics query parameters
   * @param format - Desired export format
   */
  exportAnalytics(query: IAnalyticsQuery, format: ExportFormat): Promise<Buffer>;
}