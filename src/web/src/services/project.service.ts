/**
 * @fileoverview Project Service for Task Management System
 * @version 1.0.0
 * 
 * Provides comprehensive project management functionality with enhanced error handling,
 * performance monitoring, and security features. Implements circuit breaker pattern
 * for fault tolerance and request cancellation for performance optimization.
 */

import { httpService } from './http.service';
import { API_CONFIG } from '../config/api.config';
import { CircuitBreaker } from 'circuit-breaker-ts'; // ^2.0.0
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectFilters,
  ProjectResponse,
  ProjectListResponse,
  ProjectHierarchyNode,
  ProjectTimelineEvent,
  ProjectStatus
} from '../types/project.types';

// Constants for service configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
};

const REQUEST_TIMEOUT = 30000; // 30 seconds for long operations

/**
 * Service class for handling project-related API operations
 * Implements comprehensive error handling and performance optimization
 */
class ProjectService {
  private readonly baseUrl: string;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly requestControllers: Map<string, AbortController>;

  constructor() {
    this.baseUrl = `${API_CONFIG.API_VERSION}/projects`;
    this.circuitBreaker = new CircuitBreaker(CIRCUIT_BREAKER_CONFIG);
    this.requestControllers = new Map();
  }

  /**
   * Retrieves a paginated list of projects with optional filters
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @param filters - Optional filtering criteria
   * @param includeHierarchy - Whether to include project hierarchy
   * @returns Promise with paginated project list
   */
  public async getProjects(
    page: number,
    limit: number,
    filters?: ProjectFilters,
    includeHierarchy?: boolean
  ): Promise<ProjectListResponse> {
    const requestId = `getProjects-${Date.now()}`;
    const controller = new AbortController();
    this.requestControllers.set(requestId, controller);

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(includeHierarchy && { hierarchy: 'true' }),
        ...(filters?.status && { status: filters.status.join(',') }),
        ...(filters?.ownerId && { ownerId: filters.ownerId }),
        ...(filters?.search && { search: filters.search }),
        ...(filters?.tags && { tags: filters.tags.join(',') })
      });

      const response = await this.circuitBreaker.execute(() =>
        httpService.get<ProjectListResponse>(
          `${this.baseUrl}?${queryParams.toString()}`,
          { signal: controller.signal }
        )
      );

      return response;
    } finally {
      this.requestControllers.delete(requestId);
    }
  }

  /**
   * Creates a new project
   * @param project - Project creation payload
   * @returns Promise with created project
   */
  public async createProject(project: CreateProjectRequest): Promise<ProjectResponse> {
    return this.circuitBreaker.execute(() =>
      httpService.post<ProjectResponse>(this.baseUrl, project)
    );
  }

  /**
   * Updates an existing project
   * @param projectId - Project ID to update
   * @param updates - Project update payload
   * @returns Promise with updated project
   */
  public async updateProject(
    projectId: string,
    updates: UpdateProjectRequest
  ): Promise<ProjectResponse> {
    return this.circuitBreaker.execute(() =>
      httpService.put<ProjectResponse>(`${this.baseUrl}/${projectId}`, updates)
    );
  }

  /**
   * Deletes a project
   * @param projectId - Project ID to delete
   * @returns Promise indicating deletion success
   */
  public async deleteProject(projectId: string): Promise<void> {
    await this.circuitBreaker.execute(() =>
      httpService.delete(`${this.baseUrl}/${projectId}`)
    );
  }

  /**
   * Retrieves project hierarchy
   * @param projectId - Root project ID
   * @returns Promise with project hierarchy
   */
  public async getProjectHierarchy(projectId: string): Promise<ProjectHierarchyNode> {
    return this.circuitBreaker.execute(() =>
      httpService.get<ProjectHierarchyNode>(`${this.baseUrl}/${projectId}/hierarchy`)
    );
  }

  /**
   * Updates project status
   * @param projectId - Project ID
   * @param status - New project status
   * @returns Promise with updated project
   */
  public async updateProjectStatus(
    projectId: string,
    status: ProjectStatus
  ): Promise<ProjectResponse> {
    return this.circuitBreaker.execute(() =>
      httpService.put<ProjectResponse>(
        `${this.baseUrl}/${projectId}/status`,
        { status }
      )
    );
  }

  /**
   * Retrieves project timeline events
   * @param projectId - Project ID
   * @param startDate - Timeline start date
   * @param endDate - Timeline end date
   * @returns Promise with project timeline events
   */
  public async getProjectTimeline(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProjectTimelineEvent[]> {
    const queryParams = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    return this.circuitBreaker.execute(() =>
      httpService.get<ProjectTimelineEvent[]>(
        `${this.baseUrl}/${projectId}/timeline?${queryParams.toString()}`
      )
    );
  }

  /**
   * Cancels any ongoing requests
   * Useful for cleanup during component unmounting
   */
  public cancelOngoingRequests(): void {
    this.requestControllers.forEach(controller => {
      controller.abort();
    });
    this.requestControllers.clear();
  }
}

// Export singleton instance
export const projectService = new ProjectService();