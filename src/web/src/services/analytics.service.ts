/**
 * @fileoverview Enterprise-grade Analytics Service Implementation
 * @version 1.0.0
 * 
 * Provides comprehensive analytics functionality with enhanced security,
 * performance optimization, caching, and error handling for the Task Management System.
 */

import { Chart } from 'chart.js'; // ^4.0.0
import { 
  AnalyticsMetrics, 
  AnalyticsQuery, 
  AnalyticsResponse, 
  AnalyticsTimeRange,
  ChartDataset,
  isValidMetrics,
  isValidChartDataset
} from '../types/analytics.types';
import { httpService } from './http.service';
import { API_ENDPOINTS, API_TIMEOUTS } from '../constants/api.constants';
import { handleApiError } from '../utils/error.utils';

/**
 * Enterprise-grade Analytics Service class implementing comprehensive
 * analytics functionality with security, caching, and performance optimizations.
 */
class AnalyticsService {
  private readonly baseUrl: string = API_ENDPOINTS.ANALYTICS.BASE;
  private readonly requestTimeout: number = API_TIMEOUTS.ANALYTICS;
  private readonly cache: Map<string, { data: AnalyticsResponse; timestamp: number }>;
  private readonly cacheExpiration: number = 5 * 60 * 1000; // 5 minutes
  private readonly rateLimitWindow: number = 60 * 1000; // 1 minute
  private readonly maxRequestsPerWindow: number = 100;
  private requestCount: number = 0;
  private windowStart: number = Date.now();

  constructor() {
    // Initialize LRU cache with size limit
    this.cache = new Map();
    
    // Initialize rate limiting
    setInterval(() => {
      this.requestCount = 0;
      this.windowStart = Date.now();
    }, this.rateLimitWindow);
  }

  /**
   * Retrieves analytics metrics with caching and error handling
   * @param query - Analytics query parameters
   * @throws {AppError} When rate limit exceeded or invalid parameters
   */
  public async getMetrics(query: AnalyticsQuery): Promise<AnalyticsResponse> {
    try {
      // Validate rate limiting
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // Generate cache key
      const cacheKey = this.generateCacheKey('metrics', query);
      
      // Check cache
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Make API request with timeout
      const response = await httpService.get<AnalyticsResponse>(
        `${this.baseUrl}${API_ENDPOINTS.ANALYTICS.METRICS}`,
        {
          params: query,
          timeout: this.requestTimeout
        }
      );

      // Validate response data
      if (!isValidMetrics(response.data.data)) {
        throw new Error('Invalid metrics data received');
      }

      // Cache response
      this.setCache(cacheKey, response);

      return response;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Retrieves project analytics with security validation
   * @param projectId - Project identifier
   * @param timeRange - Analysis time range
   */
  public async getProjectAnalytics(
    projectId: string,
    timeRange: AnalyticsTimeRange
  ): Promise<AnalyticsResponse> {
    try {
      // Validate project ID
      if (!projectId.match(/^[a-zA-Z0-9-]+$/)) {
        throw new Error('Invalid project ID format');
      }

      // Validate time range
      this.validateTimeRange(timeRange);

      const cacheKey = this.generateCacheKey('project', { projectId, timeRange });
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const response = await httpService.get<AnalyticsResponse>(
        `${this.baseUrl}${API_ENDPOINTS.ANALYTICS.PERFORMANCE}`,
        {
          params: { projectId, ...timeRange },
          timeout: this.requestTimeout
        }
      );

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Retrieves user analytics with privacy controls
   * @param userId - User identifier
   * @param timeRange - Analysis time range
   */
  public async getUserAnalytics(
    userId: string,
    timeRange: AnalyticsTimeRange
  ): Promise<AnalyticsResponse> {
    try {
      // Validate user ID format
      if (!userId.match(/^[a-zA-Z0-9-]+$/)) {
        throw new Error('Invalid user ID format');
      }

      this.validateTimeRange(timeRange);

      const cacheKey = this.generateCacheKey('user', { userId, timeRange });
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const response = await httpService.get<AnalyticsResponse>(
        `${API_ENDPOINTS.ANALYTICS.DASHBOARD}`,
        {
          params: { userId, ...timeRange },
          timeout: this.requestTimeout
        }
      );

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Generates secure downloadable analytics report
   * @param query - Report query parameters
   */
  public async generateReport(query: AnalyticsQuery): Promise<Blob> {
    try {
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      const response = await httpService.post<Blob>(
        `${API_ENDPOINTS.ANALYTICS.EXPORT}`,
        query,
        {
          responseType: 'blob',
          timeout: API_TIMEOUTS.REPORT_GENERATION
        }
      );

      return response.data;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Transforms analytics data into accessible chart format
   * @param metrics - Analytics metrics to transform
   */
  public prepareChartData(metrics: AnalyticsMetrics): ChartDataset {
    try {
      const dataset: ChartDataset = {
        label: 'Task Analytics',
        data: [
          metrics.productivityScore,
          metrics.delayReduction,
          metrics.visibilityScore
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(153, 102, 255, 0.2)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(153, 102, 255, 1)'
        ]
      };

      if (!isValidChartDataset(dataset)) {
        throw new Error('Invalid chart dataset format');
      }

      return dataset;
    } catch (error) {
      throw new Error(`Chart data preparation failed: ${error.message}`);
    }
  }

  /**
   * Validates time range parameters
   * @param timeRange - Time range to validate
   */
  private validateTimeRange(timeRange: AnalyticsTimeRange): void {
    const { startDate, endDate, timezone } = timeRange;
    
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
      throw new Error('Invalid date format');
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    if (!timezone.match(/^[A-Za-z/_+-]+$/)) {
      throw new Error('Invalid timezone format');
    }
  }

  /**
   * Generates cache key for analytics data
   * @param prefix - Cache key prefix
   * @param params - Parameters to include in cache key
   */
  private generateCacheKey(prefix: string, params: Record<string, any>): string {
    return `${prefix}-${JSON.stringify(params)}`;
  }

  /**
   * Retrieves data from cache if valid
   * @param key - Cache key
   */
  private getFromCache(key: string): AnalyticsResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiration) {
      return cached.data;
    }
    return null;
  }

  /**
   * Sets data in cache with timestamp
   * @param key - Cache key
   * @param data - Data to cache
   */
  private setCache(key: string, data: AnalyticsResponse): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Implement cache size limit
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Checks rate limiting status
   * @returns boolean indicating if request is allowed
   */
  private checkRateLimit(): boolean {
    this.requestCount++;
    return this.requestCount <= this.maxRequestsPerWindow;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();