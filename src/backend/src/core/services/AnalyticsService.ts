import { injectable, inject } from 'inversify'; // v6.0.1
import PDFDocument from 'pdfkit'; // v3.0.0
import ExcelJS from 'exceljs'; // v4.3.0
import { 
  IAnalyticsService, 
  IAnalyticsQuery, 
  IProjectAnalytics,
  IUserAnalytics, 
  ISystemAnalytics,
  ReportFormat,
  IAnalyticsMetrics
} from '../../interfaces/IAnalytics';
import { UUID, DeepReadonly } from '../../types/common.types';

@injectable()
export class AnalyticsService implements IAnalyticsService {
  private readonly CACHE_TTL = 300; // 5 minutes cache TTL
  private readonly REAL_TIME_UPDATE_INTERVAL = 5000; // 5 seconds

  constructor(
    @inject('TaskRepository') private readonly taskRepository: any,
    @inject('ProjectRepository') private readonly projectRepository: any,
    @inject('UserRepository') private readonly userRepository: any,
    @inject('CacheService') private readonly cacheService: any,
    @inject('EventEmitter') private readonly eventEmitter: any
  ) {}

  async getProjectAnalytics(projectId: string, query: IAnalyticsQuery): Promise<IProjectAnalytics> {
    const cacheKey = `project_analytics:${projectId}:${JSON.stringify(query)}`;
    
    // Try to get from cache first
    const cachedData = await this.cacheService.get<IProjectAnalytics>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Fetch and calculate metrics
    const projectTasks = await this.taskRepository.findByProjectId(projectId, query.timeRange);
    const teamMembers = await this.projectRepository.getTeamMembers(projectId);

    const metrics = await this.calculateProjectMetrics(projectTasks);
    const teamPerformance = await this.calculateTeamPerformance(projectTasks, teamMembers);
    const timeline = await this.generateTimeline(projectTasks, query.groupBy);

    const analytics: IProjectAnalytics = {
      projectId,
      metrics,
      progressPercentage: this.calculateProgressPercentage(projectTasks),
      teamPerformance,
      timeline,
      id: projectId as UUID,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    // Cache the results
    await this.cacheService.set(cacheKey, analytics, this.CACHE_TTL);

    // Set up real-time updates
    this.setupRealTimeUpdates(projectId, 'project');

    return analytics;
  }

  async getUserAnalytics(userId: string, query: IAnalyticsQuery): Promise<IUserAnalytics> {
    const cacheKey = `user_analytics:${userId}:${JSON.stringify(query)}`;
    
    const cachedData = await this.cacheService.get<IUserAnalytics>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const userTasks = await this.taskRepository.findByAssigneeId(userId, query.timeRange);
    const userProjects = await this.projectRepository.findByUserId(userId);

    const metrics = await this.calculateUserMetrics(userTasks);
    const projectContributions = await this.calculateProjectContributions(userTasks, userProjects);
    const timeline = await this.generateTimeline(userTasks, query.groupBy);

    const analytics: IUserAnalytics = {
      userId,
      metrics,
      projectContributions,
      timeline,
      id: userId as UUID,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    await this.cacheService.set(cacheKey, analytics, this.CACHE_TTL);
    return analytics;
  }

  async getSystemMetrics(query: IAnalyticsQuery): Promise<ISystemAnalytics> {
    const cacheKey = `system_metrics:${JSON.stringify(query)}`;
    
    const cachedData = await this.cacheService.get<ISystemAnalytics>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const allTasks = await this.taskRepository.findAll(query.timeRange);
    const departments = await this.userRepository.getDepartments();

    const metrics = await this.calculateSystemMetrics(allTasks);
    const departmentMetrics = await this.calculateDepartmentMetrics(allTasks, departments);
    const utilization = await this.calculateSystemUtilization();

    const analytics: ISystemAnalytics = {
      metrics,
      departmentMetrics,
      utilization,
      id: 'system' as UUID,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    await this.cacheService.set(cacheKey, analytics, this.CACHE_TTL);
    return analytics;
  }

  async generateReport(query: IAnalyticsQuery, format: ReportFormat): Promise<Buffer> {
    const data = await this.getSystemMetrics(query);
    
    switch (format) {
      case 'pdf':
        return this.generatePDFReport(data);
      case 'excel':
        return this.generateExcelReport(data);
      case 'csv':
        return this.generateCSVReport(data);
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }

  async getRealTimeMetrics(metricType: string, entityId: string): Promise<WebSocket> {
    const ws = await this.setupWebSocketConnection(entityId);
    
    const updateInterval = setInterval(async () => {
      const metrics = await this.calculateRealTimeMetrics(metricType, entityId);
      ws.send(JSON.stringify(metrics));
    }, this.REAL_TIME_UPDATE_INTERVAL);

    ws.on('close', () => {
      clearInterval(updateInterval);
    });

    return ws;
  }

  private async calculateProjectMetrics(tasks: any[]): Promise<IAnalyticsMetrics> {
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const overdueTasks = tasks.filter(task => task.dueDate < new Date() && task.status !== 'completed');

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      averageCompletionTime: this.calculateAverageCompletionTime(completedTasks),
      productivityScore: this.calculateProductivityScore(tasks),
      delayReduction: this.calculateDelayReduction(tasks)
    };
  }

  private async generatePDFReport(data: ISystemAnalytics): Promise<Buffer> {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Generate PDF content
      doc.fontSize(16).text('Analytics Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`);
      
      // Add metrics
      this.addMetricsToPDF(doc, data.metrics);
      
      // Add charts and visualizations
      this.addChartsToPDF(doc, data);
      
      doc.end();
    });
  }

  private async generateExcelReport(data: ISystemAnalytics): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Analytics');

    // Add headers
    worksheet.addRow(['Metric', 'Value']);
    
    // Add metrics
    Object.entries(data.metrics).forEach(([key, value]) => {
      worksheet.addRow([key, value]);
    });

    // Add formatting
    worksheet.getColumn(1).width = 30;
    worksheet.getColumn(2).width = 15;

    return workbook.xlsx.writeBuffer();
  }

  private calculateProductivityScore(tasks: any[]): number {
    const completedOnTime = tasks.filter(task => 
      task.status === 'completed' && task.completedAt <= task.dueDate
    ).length;

    return (completedOnTime / tasks.length) * 100;
  }

  private calculateDelayReduction(tasks: any[]): number {
    const baselineDelayRate = 0.4; // 40% historical delay rate
    const currentDelayRate = tasks.filter(task => 
      task.status === 'completed' && task.completedAt > task.dueDate
    ).length / tasks.length;

    return ((baselineDelayRate - currentDelayRate) / baselineDelayRate) * 100;
  }

  private setupWebSocketConnection(entityId: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(process.env.WS_URL!);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'subscribe', entityId }));
        resolve(ws);
      });

      ws.on('error', reject);
    });
  }
}