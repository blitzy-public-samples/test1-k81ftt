import { gql } from 'graphql-tag'; // v2.12.6
import { IAnalyticsMetrics } from '../../../interfaces/IAnalytics';
import { TaskStatus } from '../../../types/common.types';

/**
 * GraphQL schema definitions for analytics functionality including:
 * - Performance metrics
 * - Business impact tracking
 * - Project, user, and team analytics
 * - Custom reporting and exports
 */
export const analyticsSchema = gql`
  """
  Core metrics type containing performance and business impact measurements
  """
  type AnalyticsMetrics {
    totalTasks: Int!
    completedTasks: Int!
    overdueTasks: Int!
    averageCompletionTime: Float!
    tasksByStatus: JSON!
    productivityScore: Float!
    delayReductionRate: Float!
    taskVisibilityScore: Float!
    trendAnalysis: JSON!
    velocityMetrics: JSON!
    qualityMetrics: JSON!
  }

  """
  Time range specification for analytics queries
  """
  type AnalyticsTimeRange {
    startDate: DateTime!
    endDate: DateTime!
    timeZone: String!
    granularity: TimeGranularity!
  }

  """
  Project-specific analytics including team performance and progress tracking
  """
  type ProjectAnalytics {
    projectId: ID!
    metrics: AnalyticsMetrics!
    progressPercentage: Float!
    teamPerformance: JSON!
    milestoneProgress: JSON!
    riskMetrics: JSON!
    resourceUtilization: JSON!
    budgetMetrics: JSON!
    timelineVariance: Float!
    blockersAnalysis: JSON!
  }

  """
  User-specific analytics for tracking individual performance
  """
  type UserAnalytics {
    userId: ID!
    metrics: AnalyticsMetrics!
    projectContributions: JSON!
    productivityTrend: JSON!
    taskCompletionRate: Float!
    skillMatrix: JSON!
    collaborationScore: Float!
    impactScore: Float!
    workloadBalance: JSON!
  }

  """
  Team-level analytics for measuring group performance
  """
  type TeamAnalytics {
    teamId: ID!
    metrics: AnalyticsMetrics!
    memberPerformance: JSON!
    collaborationScore: Float!
    capacityUtilization: Float!
    crossTeamCollaboration: JSON!
    skillCoverage: JSON!
    teamVelocity: Float!
    deliveryPredictability: Float!
  }

  """
  Time granularity options for analytics grouping
  """
  enum TimeGranularity {
    HOURLY
    DAILY
    WEEKLY
    MONTHLY
    QUARTERLY
    YEARLY
  }

  """
  Input type for configuring analytics queries
  """
  input AnalyticsQueryInput {
    startDate: DateTime!
    endDate: DateTime!
    timeZone: String = "UTC"
    projectId: ID
    userId: ID
    teamId: ID
    groupBy: TimeGranularity!
    includeSubProjects: Boolean = false
    metrics: [String!]
    filters: JSON
  }

  """
  Configuration options for analytics exports
  """
  input ExportConfig {
    format: ExportFormat!
    metrics: [String!]!
    includeCharts: Boolean!
    deliveryMethod: DeliveryMethod!
    compression: Boolean = false
    password: String
    recipients: [String!]
  }

  """
  Supported export format options
  """
  enum ExportFormat {
    PDF
    CSV
    EXCEL
    JSON
  }

  """
  Delivery method options for exports
  """
  enum DeliveryMethod {
    DOWNLOAD
    EMAIL
    S3
    SFTP
  }

  """
  Analytics-related queries
  """
  type Query {
    """
    Retrieve project-specific analytics data
    """
    projectAnalytics(projectId: ID!, query: AnalyticsQueryInput!): ProjectAnalytics!

    """
    Retrieve user-specific analytics data
    """
    userAnalytics(userId: ID!, query: AnalyticsQueryInput!): UserAnalytics!

    """
    Retrieve team-specific analytics data
    """
    teamAnalytics(teamId: ID!, query: AnalyticsQueryInput!): TeamAnalytics!

    """
    Retrieve system-wide metrics
    """
    systemMetrics(query: AnalyticsQueryInput!): AnalyticsMetrics!

    """
    Generate and retrieve analytics export
    """
    analyticsExport(query: AnalyticsQueryInput!, config: ExportConfig!): String!

    """
    Retrieve performance trends
    """
    performanceTrends(query: AnalyticsQueryInput!): JSON!

    """
    Get business impact metrics
    """
    businessImpactMetrics(query: AnalyticsQueryInput!): JSON!
  }

  """
  Analytics-related mutations
  """
  type Mutation {
    """
    Generate a comprehensive analytics report
    """
    generateAnalyticsReport(
      query: AnalyticsQueryInput!
      format: ExportFormat!
    ): String!

    """
    Schedule periodic analytics report generation
    """
    scheduleReport(
      query: AnalyticsQueryInput!
      schedule: String!
      config: ExportConfig!
    ): Boolean!

    """
    Export analytics data in various formats
    """
    exportAnalytics(
      query: AnalyticsQueryInput!
      config: ExportConfig!
    ): String!

    """
    Save custom analytics dashboard configuration
    """
    saveCustomDashboard(
      name: String!
      config: JSON!
    ): Boolean!
  }
`;

export default analyticsSchema;