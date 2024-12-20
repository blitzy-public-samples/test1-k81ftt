import { IsDate, IsOptional, IsUUID, IsEnum, Transform } from 'class-validator';
import { Type } from 'class-transformer';
import { IAnalyticsMetrics, IAnalyticsTimeRange } from '../interfaces/IAnalytics';

/**
 * Enumeration for analytics time grouping granularity
 */
export enum TimeGranularity {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter'
}

/**
 * Data transfer object for analytics query parameters
 * Implements comprehensive validation for analytics requests
 */
export class AnalyticsQueryDto implements Partial<IAnalyticsTimeRange> {
  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => new Date(value))
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => new Date(value))
  endDate: Date;

  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @IsOptional()
  @IsEnum(TimeGranularity)
  groupBy?: TimeGranularity = TimeGranularity.DAY;

  @IsOptional()
  @Transform(({ value }) => Boolean(value))
  includeSubProjects?: boolean = false;

  /**
   * Custom validation method to ensure date range is valid
   * @returns boolean indicating if the date range is valid
   */
  public isValidDateRange(): boolean {
    if (!this.startDate || !this.endDate) {
      return false;
    }

    // Ensure startDate is before endDate
    if (this.startDate >= this.endDate) {
      return false;
    }

    // Maximum allowed date range is 1 year
    const maxRangeMs = 365 * 24 * 60 * 60 * 1000;
    const rangeMs = this.endDate.getTime() - this.startDate.getTime();
    
    return rangeMs <= maxRangeMs;
  }
}

/**
 * Data transfer object for analytics response
 * Includes comprehensive business metrics and performance indicators
 */
export class AnalyticsResponseDto {
  /**
   * Core analytics metrics including business impact measurements
   */
  metrics: IAnalyticsMetrics;

  /**
   * Time range parameters for the analytics data
   */
  timeRange: IAnalyticsTimeRange;

  /**
   * Calculated productivity improvement percentage
   * Based on task completion rates and timing
   */
  productivityImprovement: number;

  /**
   * Project delay reduction rate
   * Measures improvement in meeting deadlines
   */
  delayReductionRate: number;

  /**
   * Task visibility score
   * Indicates improvement in task tracking and monitoring
   */
  taskVisibilityScore: number;

  constructor(metrics: IAnalyticsMetrics, timeRange: IAnalyticsTimeRange) {
    this.metrics = metrics;
    this.timeRange = timeRange;
    this.productivityImprovement = this.calculateProductivityImprovement();
    this.delayReductionRate = this.calculateDelayReduction();
    this.taskVisibilityScore = this.calculateTaskVisibility();
  }

  /**
   * Calculates productivity improvement percentage
   * Target: 30% increase in team productivity
   */
  private calculateProductivityImprovement(): number {
    const completionRate = this.metrics.completedTasks / this.metrics.totalTasks;
    const efficiency = 1 - (this.metrics.overdueTasks / this.metrics.totalTasks);
    return (completionRate * efficiency * 100);
  }

  /**
   * Calculates project delay reduction rate
   * Target: 40% reduction in project delays
   */
  private calculateDelayReduction(): number {
    const onTimeCompletion = 1 - (this.metrics.overdueTasks / this.metrics.completedTasks);
    return (onTimeCompletion * 100);
  }

  /**
   * Calculates task visibility score
   * Target: 50% improvement in task visibility
   */
  private calculateTaskVisibility(): number {
    // Complex calculation based on task tracking metrics
    const trackingScore = this.metrics.productivityScore / 100;
    const visibilityMetric = (this.metrics.completedTasks + this.metrics.overdueTasks) / this.metrics.totalTasks;
    return (trackingScore * visibilityMetric * 100);
  }
}

/**
 * Data transfer object for analytics export request
 */
export class AnalyticsExportDto extends AnalyticsQueryDto {
  @IsEnum(['pdf', 'csv', 'excel'])
  format: 'pdf' | 'csv' | 'excel';

  @IsOptional()
  @Transform(({ value }) => Boolean(value))
  includeCharts?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => Boolean(value))
  includeRawData?: boolean = false;
}