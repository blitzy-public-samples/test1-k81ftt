// External imports - versions specified as per requirements
import { injectable } from 'inversify'; // v6.0.1
import { controller, httpGet, queryParam, requestParam } from 'inversify-express-utils'; // v6.4.3
import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { rateLimit } from 'express-rate-limit'; // v6.7.0
import { cache } from 'express-cache-middleware'; // v1.0.0

// Internal imports
import { AnalyticsService } from '../../core/services/AnalyticsService';
import { AnalyticsQueryDto, TimeGranularity, AnalyticsResponseDto } from '../../dto/analytics.dto';
import { ErrorResponse } from '../../types/common.types';

/**
 * Controller handling analytics-related HTTP requests with performance optimization
 * Implements caching, rate limiting, and streaming responses for large datasets
 */
@injectable()
@controller('/api/v1/analytics')
export class AnalyticsController {
  // Cache configuration
  private static readonly CACHE_DURATION = 300; // 5 minutes
  private static readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private static readonly RATE_LIMIT_MAX = 100;

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Retrieves analytics data for a specific project
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  @httpGet('/projects/:projectId')
  @cache('5 minutes')
  @rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 50,
    message: 'Too many requests for project analytics'
  })
  async getProjectAnalytics(
    @requestParam('projectId') projectId: string,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = this.buildAnalyticsQuery(req);
      
      if (!query.isValidDateRange()) {
        res.status(400).json({
          code: 'INVALID_DATE_RANGE',
          message: 'Invalid date range specified'
        } as ErrorResponse);
        return;
      }

      const analytics = await this.analyticsService.getProjectAnalytics(projectId, query);
      const response = new AnalyticsResponseDto(analytics.metrics, {
        startDate: query.startDate,
        endDate: query.endDate,
        timeZone: req.headers['x-timezone'] as string || 'UTC'
      });

      res.setHeader('Cache-Control', `public, max-age=${AnalyticsController.CACHE_DURATION}`);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves analytics data for a specific user
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  @httpGet('/users/:userId')
  @cache('5 minutes')
  @rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 50,
    message: 'Too many requests for user analytics'
  })
  async getUserAnalytics(
    @requestParam('userId') userId: string,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = this.buildAnalyticsQuery(req);
      const analytics = await this.analyticsService.getUserAnalytics(userId, query);
      
      res.setHeader('Cache-Control', `public, max-age=${AnalyticsController.CACHE_DURATION}`);
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves system-wide metrics and analytics
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  @httpGet('/system')
  @cache('5 minutes')
  @rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many requests for system metrics'
  })
  async getSystemMetrics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = this.buildAnalyticsQuery(req);
      const metrics = await this.analyticsService.getSystemMetrics(query);
      
      res.setHeader('Cache-Control', `public, max-age=${AnalyticsController.CACHE_DURATION}`);
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generates and streams analytics report in specified format
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  @httpGet('/reports')
  @rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 10,
    message: 'Too many report generation requests'
  })
  async generateReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = this.buildAnalyticsQuery(req);
      const format = req.query.format as 'pdf' | 'excel' | 'csv' || 'pdf';

      const report = await this.analyticsService.generateReport(query, format);
      
      const contentTypes = {
        pdf: 'application/pdf',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv'
      };

      res.setHeader('Content-Type', contentTypes[format]);
      res.setHeader('Content-Disposition', `attachment; filename=analytics-report.${format}`);
      res.send(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Builds analytics query DTO from request parameters
   * @param req Express request object
   * @returns AnalyticsQueryDto
   */
  private buildAnalyticsQuery(req: Request): AnalyticsQueryDto {
    const query = new AnalyticsQueryDto();
    query.startDate = new Date(req.query.startDate as string);
    query.endDate = new Date(req.query.endDate as string);
    query.projectId = req.query.projectId as string;
    query.userId = req.query.userId as string;
    query.groupBy = (req.query.groupBy as TimeGranularity) || TimeGranularity.DAY;
    query.includeSubProjects = req.query.includeSubProjects === 'true';
    
    return query;
  }
}