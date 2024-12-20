import { injectable } from 'inversify'; // v6.0.1
import { Resolver, Query, Mutation, Arg, Subscription } from 'type-graphql'; // v2.0.0
import { IAnalyticsService } from '../../../interfaces/IAnalytics';
import { AnalyticsService } from '../../../core/services/AnalyticsService';
import { AnalyticsQueryDto } from '../../../dto/analytics.dto';
import { PubSub } from 'graphql-subscriptions'; // v0.10.0
import { ResolverError } from '../../errors/resolver.error';

/**
 * GraphQL resolver for analytics-related operations with enhanced caching and real-time capabilities
 */
@injectable()
@Resolver()
export class AnalyticsResolver {
  private pubSub: PubSub;
  private readonly METRICS_TOPIC = 'METRICS_UPDATE';
  private readonly CACHE_TTL = 300; // 5 minutes cache duration

  constructor(
    private readonly analyticsService: IAnalyticsService,
    private readonly cacheManager: any
  ) {
    this.pubSub = new PubSub();
  }

  /**
   * Query resolver for project analytics with caching support
   */
  @Query(returns => ProjectAnalytics)
  async projectAnalytics(
    @Arg('projectId') projectId: string,
    @Arg('query') query: AnalyticsQueryDto
  ): Promise<IProjectAnalytics> {
    try {
      // Validate query parameters
      if (!query.isValidDateRange()) {
        throw new ResolverError('Invalid date range specified');
      }

      // Generate cache key
      const cacheKey = `project_analytics:${projectId}:${JSON.stringify(query)}`;

      // Check cache first
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Fetch fresh data
      const analytics = await this.analyticsService.getProjectAnalytics(projectId, query);

      // Cache the results
      await this.cacheManager.set(cacheKey, analytics, this.CACHE_TTL);

      return analytics;
    } catch (error) {
      throw new ResolverError(`Failed to fetch project analytics: ${error.message}`);
    }
  }

  /**
   * Query resolver for user analytics with performance optimization
   */
  @Query(returns => UserAnalytics)
  async userAnalytics(
    @Arg('userId') userId: string,
    @Arg('query') query: AnalyticsQueryDto
  ): Promise<IUserAnalytics> {
    try {
      const cacheKey = `user_analytics:${userId}:${JSON.stringify(query)}`;
      const cachedData = await this.cacheManager.get(cacheKey);

      if (cachedData) {
        return cachedData;
      }

      const analytics = await this.analyticsService.getUserAnalytics(userId, query);
      await this.cacheManager.set(cacheKey, analytics, this.CACHE_TTL);

      return analytics;
    } catch (error) {
      throw new ResolverError(`Failed to fetch user analytics: ${error.message}`);
    }
  }

  /**
   * Query resolver for system-wide metrics with real-time updates
   */
  @Query(returns => SystemAnalytics)
  async systemMetrics(
    @Arg('query') query: AnalyticsQueryDto
  ): Promise<ISystemAnalytics> {
    try {
      const cacheKey = `system_metrics:${JSON.stringify(query)}`;
      const cachedData = await this.cacheManager.get(cacheKey);

      if (cachedData) {
        return cachedData;
      }

      const analytics = await this.analyticsService.getSystemMetrics(query);
      await this.cacheManager.set(cacheKey, analytics, this.CACHE_TTL);

      return analytics;
    } catch (error) {
      throw new ResolverError(`Failed to fetch system metrics: ${error.message}`);
    }
  }

  /**
   * Mutation resolver for generating analytics reports
   */
  @Mutation(returns => AnalyticsReport)
  async generateAnalyticsReport(
    @Arg('query') query: AnalyticsQueryDto,
    @Arg('format') format: ReportFormat
  ): Promise<Buffer> {
    try {
      return await this.analyticsService.generateReport(query, format);
    } catch (error) {
      throw new ResolverError(`Failed to generate analytics report: ${error.message}`);
    }
  }

  /**
   * Subscription resolver for real-time metrics updates
   */
  @Subscription(returns => MetricUpdate, {
    topics: ({ args }) => `${args.metricType}_${args.entityId}`
  })
  async subscribeToMetrics(
    @Arg('metricType') metricType: string,
    @Arg('entityId') entityId: string
  ): Promise<AsyncIterator<any>> {
    try {
      // Initialize WebSocket connection for real-time updates
      const ws = await this.analyticsService.getRealTimeMetrics(metricType, entityId);

      // Handle incoming metric updates
      ws.on('message', (data: any) => {
        const metrics = JSON.parse(data);
        this.pubSub.publish(`${metricType}_${entityId}`, {
          metricUpdate: {
            entityId,
            metricType,
            timestamp: new Date(),
            data: metrics
          }
        });
      });

      return this.pubSub.asyncIterator(`${metricType}_${entityId}`);
    } catch (error) {
      throw new ResolverError(`Failed to subscribe to metrics: ${error.message}`);
    }
  }
}