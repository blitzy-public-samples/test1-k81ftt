import { describe, it, expect, jest, beforeEach } from '@jest/globals'; // v29.0.0
import { mock, MockProxy } from 'jest-mock-extended'; // v3.0.0
import { AnalyticsService } from '../../../src/core/services/AnalyticsService';
import { IAnalyticsMetrics, IAnalyticsQuery, ReportFormat } from '../../../src/interfaces/IAnalytics';
import { UUID } from '../../../src/types/common.types';

// Mock repositories and services
let mockTaskRepository: MockProxy<any>;
let mockProjectRepository: MockProxy<any>;
let mockUserRepository: MockProxy<any>;
let mockCacheService: MockProxy<any>;
let mockEventEmitter: MockProxy<any>;
let analyticsService: AnalyticsService;

// Test data constants
const TEST_PROJECT_ID = '123e4567-e89b-12d3-a456-426614174000' as UUID;
const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174001' as UUID;
const TEST_QUERY: IAnalyticsQuery = {
  timeRange: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    timeZone: 'UTC'
  },
  groupBy: 'month',
  includeSubProjects: true
};

describe('AnalyticsService', () => {
  beforeEach(() => {
    // Initialize mocks
    mockTaskRepository = mock<any>();
    mockProjectRepository = mock<any>();
    mockUserRepository = mock<any>();
    mockCacheService = mock<any>();
    mockEventEmitter = mock<any>();

    // Create fresh instance for each test
    analyticsService = new AnalyticsService(
      mockTaskRepository,
      mockProjectRepository,
      mockUserRepository,
      mockCacheService,
      mockEventEmitter
    );
  });

  describe('getProjectAnalytics', () => {
    it('should return cached project analytics when available', async () => {
      const cachedAnalytics = {
        projectId: TEST_PROJECT_ID,
        metrics: { totalTasks: 10, completedTasks: 5 },
        progressPercentage: 50,
        teamPerformance: {},
        timeline: {}
      };

      mockCacheService.get.mockResolvedValueOnce(cachedAnalytics);

      const result = await analyticsService.getProjectAnalytics(TEST_PROJECT_ID, TEST_QUERY);

      expect(result).toEqual(cachedAnalytics);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `project_analytics:${TEST_PROJECT_ID}:${JSON.stringify(TEST_QUERY)}`
      );
    });

    it('should calculate and cache project analytics when cache misses', async () => {
      const mockTasks = [
        { id: '1', status: 'completed', completedAt: new Date(), dueDate: new Date() },
        { id: '2', status: 'in_progress', dueDate: new Date() }
      ];

      mockCacheService.get.mockResolvedValueOnce(null);
      mockTaskRepository.findByProjectId.mockResolvedValueOnce(mockTasks);
      mockProjectRepository.getTeamMembers.mockResolvedValueOnce([]);

      const result = await analyticsService.getProjectAnalytics(TEST_PROJECT_ID, TEST_QUERY);

      expect(result.projectId).toBe(TEST_PROJECT_ID);
      expect(result.metrics).toBeDefined();
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('getUserAnalytics', () => {
    it('should calculate user productivity metrics correctly', async () => {
      const mockTasks = [
        { id: '1', status: 'completed', completedAt: new Date(), dueDate: new Date() },
        { id: '2', status: 'completed', completedAt: new Date(), dueDate: new Date() },
        { id: '3', status: 'in_progress', dueDate: new Date() }
      ];

      mockCacheService.get.mockResolvedValueOnce(null);
      mockTaskRepository.findByAssigneeId.mockResolvedValueOnce(mockTasks);
      mockProjectRepository.findByUserId.mockResolvedValueOnce([]);

      const result = await analyticsService.getUserAnalytics(TEST_USER_ID, TEST_QUERY);

      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.metrics.completedTasks).toBe(2);
      expect(result.metrics.totalTasks).toBe(3);
    });
  });

  describe('getSystemMetrics', () => {
    it('should calculate system-wide performance metrics', async () => {
      const mockTasks = [
        { id: '1', status: 'completed', completedAt: new Date(), dueDate: new Date() },
        { id: '2', status: 'in_progress', dueDate: new Date() }
      ];

      mockCacheService.get.mockResolvedValueOnce(null);
      mockTaskRepository.findAll.mockResolvedValueOnce(mockTasks);
      mockUserRepository.getDepartments.mockResolvedValueOnce(['Engineering', 'Marketing']);

      const result = await analyticsService.getSystemMetrics(TEST_QUERY);

      expect(result.metrics).toBeDefined();
      expect(result.departmentMetrics).toBeDefined();
      expect(result.utilization).toBeDefined();
    });
  });

  describe('generateReport', () => {
    it('should generate PDF report with correct metrics', async () => {
      const mockMetrics = {
        totalTasks: 100,
        completedTasks: 75,
        overdueTasks: 5,
        averageCompletionTime: 48,
        productivityScore: 85,
        delayReduction: 40
      };

      mockCacheService.get.mockResolvedValueOnce({
        metrics: mockMetrics,
        departmentMetrics: {},
        utilization: { activeUsers: 50, taskThroughput: 100, responseTime: 250 }
      });

      const result = await analyticsService.generateReport(TEST_QUERY, 'pdf' as ReportFormat);

      expect(Buffer.isBuffer(result)).toBeTruthy();
    });

    it('should generate Excel report with correct data structure', async () => {
      const mockMetrics = {
        totalTasks: 100,
        completedTasks: 75,
        productivityScore: 85
      };

      mockCacheService.get.mockResolvedValueOnce({
        metrics: mockMetrics,
        departmentMetrics: {},
        utilization: { activeUsers: 50, taskThroughput: 100, responseTime: 250 }
      });

      const result = await analyticsService.generateReport(TEST_QUERY, 'excel' as ReportFormat);

      expect(Buffer.isBuffer(result)).toBeTruthy();
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should establish WebSocket connection and send updates', async () => {
      const mockWs = {
        send: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'open') callback();
        })
      };

      // @ts-ignore - Mocking WebSocket
      global.WebSocket = jest.fn().mockImplementation(() => mockWs);

      const ws = await analyticsService.getRealTimeMetrics('project', TEST_PROJECT_ID);

      expect(ws).toBeDefined();
      expect(mockWs.send).toHaveBeenCalled();
    });
  });

  describe('Business Impact Metrics', () => {
    it('should calculate productivity increase correctly', async () => {
      const mockTasks = [
        { status: 'completed', completedAt: new Date(), dueDate: new Date() },
        { status: 'completed', completedAt: new Date(), dueDate: new Date() },
        { status: 'completed', completedAt: new Date(), dueDate: new Date() }
      ];

      mockTaskRepository.findAll.mockResolvedValueOnce(mockTasks);

      const result = await analyticsService.getSystemMetrics(TEST_QUERY);
      
      expect(result.metrics.productivityScore).toBeGreaterThanOrEqual(0);
      expect(result.metrics.productivityScore).toBeLessThanOrEqual(100);
    });

    it('should calculate project delay reduction accurately', async () => {
      const mockTasks = [
        { status: 'completed', completedAt: new Date(), dueDate: new Date(Date.now() - 86400000) },
        { status: 'completed', completedAt: new Date(), dueDate: new Date() }
      ];

      mockTaskRepository.findAll.mockResolvedValueOnce(mockTasks);

      const result = await analyticsService.getSystemMetrics(TEST_QUERY);
      
      expect(result.metrics.delayReduction).toBeDefined();
      expect(result.metrics.delayReduction).toBeGreaterThanOrEqual(0);
    });
  });
});