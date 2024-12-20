/**
 * @fileoverview Enhanced service implementation for project management with comprehensive
 * business logic, validation, and event publishing capabilities.
 * @version 1.0.0
 */

import { Injectable, Logger, Cache } from '@nestjs/common'; // v10.0+
import { validate } from 'class-validator'; // v0.14.0
import { IService } from '../interfaces/IService';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { EventBus } from '../events/EventBus';
import { Project, ProjectStatus } from '../../models/Project';
import { UUID, QueryOptions, WriteOptions } from '../../types/common.types';
import { EventType, EventPriority } from '../../types/event.types';

/**
 * Enhanced service implementation for project management with comprehensive
 * business logic, validation, and event publishing capabilities.
 */
@Injectable()
export class ProjectService implements IService<Project, CreateProjectDto, UpdateProjectDto> {
  private readonly logger = new Logger(ProjectService.name);
  private readonly eventBus: EventBus;

  constructor(
    private readonly projectRepository: ProjectRepository,
    @Cache() private readonly cacheManager: Cache
  ) {
    this.eventBus = EventBus.getInstance();
    this.logger.log('ProjectService initialized');
  }

  /**
   * Retrieves a project by ID with enhanced validation and caching
   * @param id - Project unique identifier
   * @param includes - Optional relations to include
   * @throws EntityNotFoundError if project doesn't exist
   */
  async findById(id: UUID, includes?: string[]): Promise<Project> {
    this.logger.debug(`Retrieving project with ID: ${id}`);
    
    const project = await this.projectRepository.findById(id);
    if (!project) {
      this.logger.error(`Project not found with ID: ${id}`);
      throw new Error('Project not found');
    }

    return project;
  }

  /**
   * Retrieves all projects with enhanced filtering, pagination, and security
   * @param options - Query options for filtering, sorting, and pagination
   */
  async findAll(options?: QueryOptions): Promise<{
    data: Project[];
    total: number;
    hasMore: boolean;
  }> {
    this.logger.debug('Retrieving projects with options:', options);

    const result = await this.projectRepository.findAll(options);
    
    return {
      data: result.data,
      total: result.total,
      hasMore: (options?.pagination?.page || 1) * (options?.pagination?.limit || 10) < result.total
    };
  }

  /**
   * Creates a new project with comprehensive validation and event publishing
   * @param data - Project creation data
   * @param options - Optional write operation settings
   */
  async create(data: CreateProjectDto, options?: WriteOptions): Promise<Project> {
    this.logger.debug('Creating new project:', { ...data, sensitive: undefined });

    // Validate project data
    const validationErrors = await validate(data);
    if (validationErrors.length > 0) {
      this.logger.error('Project validation failed:', validationErrors);
      throw new Error('Invalid project data');
    }

    // Validate business rules
    await this.validateBusinessRules(data);

    try {
      // Create project
      const project = await this.projectRepository.create({
        ...data,
        status: ProjectStatus.PLANNING,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Publish event if not disabled
      if (options?.emitEvents !== false) {
        await this.eventBus.publish(EventType.PROJECT_CREATED, {
          id: project.id,
          type: EventType.PROJECT_CREATED,
          data: project,
          timestamp: new Date(),
          userId: data.ownerId,
          correlationId: crypto.randomUUID() as UUID,
          version: 1
        });
      }

      this.logger.log(`Project created successfully with ID: ${project.id}`);
      return project;
    } catch (error) {
      this.logger.error('Failed to create project:', error);
      throw error;
    }
  }

  /**
   * Updates an existing project with optimistic locking and event publishing
   * @param id - Project ID to update
   * @param data - Update data
   * @param version - Expected version for optimistic locking
   * @param options - Optional write operation settings
   */
  async update(
    id: UUID,
    data: UpdateProjectDto,
    version: number,
    options?: WriteOptions
  ): Promise<Project> {
    this.logger.debug(`Updating project ${id}:`, { ...data, sensitive: undefined });

    // Validate update data
    const validationErrors = await validate(data);
    if (validationErrors.length > 0) {
      this.logger.error('Project update validation failed:', validationErrors);
      throw new Error('Invalid update data');
    }

    try {
      // Update project with optimistic locking
      const project = await this.projectRepository.update(id, data, version);

      // Publish event if not disabled
      if (options?.emitEvents !== false) {
        await this.eventBus.publish(EventType.PROJECT_UPDATED, {
          id: project.id,
          type: EventType.PROJECT_UPDATED,
          data: project,
          timestamp: new Date(),
          userId: data.ownerId,
          correlationId: crypto.randomUUID() as UUID,
          version: project.version
        });
      }

      this.logger.log(`Project ${id} updated successfully`);
      return project;
    } catch (error) {
      this.logger.error(`Failed to update project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a project with cascading operations and event publishing
   * @param id - Project ID to delete
   * @param options - Optional write operation settings
   */
  async delete(id: UUID, options?: WriteOptions): Promise<boolean> {
    this.logger.debug(`Deleting project ${id}`);

    try {
      // Soft delete the project
      const success = await this.projectRepository.softDelete(id);

      // Publish event if not disabled and deletion was successful
      if (success && options?.emitEvents !== false) {
        await this.eventBus.publish(EventType.PROJECT_DELETED, {
          id,
          type: EventType.PROJECT_DELETED,
          data: { id },
          timestamp: new Date(),
          userId: 'system',
          correlationId: crypto.randomUUID() as UUID,
          version: 1
        });
      }

      this.logger.log(`Project ${id} deleted successfully`);
      return success;
    } catch (error) {
      this.logger.error(`Failed to delete project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Validates project data against business rules
   * @private
   */
  private async validateBusinessRules(data: CreateProjectDto | UpdateProjectDto): Promise<void> {
    // Validate project timeline
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      throw new Error('Project start date must be before end date');
    }

    // Validate project hierarchy if parent project is specified
    if ('parentId' in data && data.parentId) {
      const parentProject = await this.findById(data.parentId);
      if (!parentProject) {
        throw new Error('Parent project not found');
      }
      if (parentProject.status === ProjectStatus.COMPLETED || 
          parentProject.status === ProjectStatus.CANCELLED) {
        throw new Error('Cannot add project to completed or cancelled parent');
      }
    }

    // Additional business rule validations can be added here
  }
}

/**
 * Data transfer object for project creation
 */
export class CreateProjectDto {
  name!: string;
  description?: string;
  ownerId!: UUID;
  startDate!: Date;
  endDate!: Date;
  parentId?: UUID;
  metadata?: Record<string, unknown>;
}

/**
 * Data transfer object for project updates
 */
export class UpdateProjectDto {
  name?: string;
  description?: string;
  ownerId?: UUID;
  status?: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, unknown>;
}