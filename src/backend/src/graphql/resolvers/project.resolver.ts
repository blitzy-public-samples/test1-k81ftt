/**
 * @fileoverview GraphQL resolver implementation for project-related operations with
 * comprehensive security, caching, and real-time update capabilities.
 * @version 1.0.0
 */

import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql'; // v10.0.0
import { UseGuards, UseInterceptors, Logger } from '@nestjs/common'; // v10.0.0
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager'; // v2.0.0
import { RateLimit } from '@nestjs/throttler'; // v5.0.0
import { AuthGuard } from '../../auth/guards/auth.guard';
import { ProjectService } from '../../core/services/ProjectService';
import { EventBus } from '../../core/events/EventBus';
import { Project, ProjectStatus } from '../../models/Project';
import { UUID, isUUID } from '../../types/common.types';
import { EventType } from '../../types/event.types';
import { CreateProjectDto, UpdateProjectDto } from '../../core/services/ProjectService';

@Resolver('Project')
@UseGuards(AuthGuard)
@UseInterceptors(CacheInterceptor)
export class ProjectResolver {
  private readonly logger = new Logger(ProjectResolver.name);
  private readonly eventBus: EventBus;

  constructor(
    private readonly projectService: ProjectService,
    eventBus: EventBus
  ) {
    this.eventBus = eventBus;
    this.logger.log('ProjectResolver initialized');
  }

  @Query('project')
  @CacheKey('project')
  @CacheTTL(300) // 5 minutes cache
  @RateLimit({ limit: 100, ttl: 60 })
  async project(@Args('id') id: string): Promise<Project> {
    this.logger.debug(`Fetching project with ID: ${id}`);

    if (!isUUID(id)) {
      throw new Error('Invalid project ID format');
    }

    try {
      const project = await this.projectService.findById(id as UUID);
      if (!project) {
        throw new Error('Project not found');
      }
      return project;
    } catch (error) {
      this.logger.error(`Error fetching project ${id}:`, error);
      throw error;
    }
  }

  @Query('projects')
  @CacheKey('projects')
  @CacheTTL(60) // 1 minute cache
  @RateLimit({ limit: 50, ttl: 60 })
  async projects(
    @Args('page') page: number = 1,
    @Args('limit') limit: number = 10,
    @Args('status') status?: ProjectStatus,
    @Args('ownerId') ownerId?: string
  ): Promise<{ data: Project[]; total: number; hasMore: boolean }> {
    this.logger.debug('Fetching projects with filters:', { page, limit, status, ownerId });

    try {
      const filters = [];
      if (status) filters.push({ field: 'status', operator: 'eq', value: status });
      if (ownerId && isUUID(ownerId)) {
        filters.push({ field: 'ownerId', operator: 'eq', value: ownerId });
      }

      return await this.projectService.findAll({
        pagination: { page, limit },
        filters
      });
    } catch (error) {
      this.logger.error('Error fetching projects:', error);
      throw error;
    }
  }

  @Mutation('createProject')
  @RateLimit({ limit: 20, ttl: 60 })
  async createProject(@Args('input') input: CreateProjectDto): Promise<Project> {
    this.logger.debug('Creating new project:', { ...input, sensitive: undefined });

    try {
      const project = await this.projectService.create(input, { emitEvents: true });
      
      await this.eventBus.publish(EventType.PROJECT_CREATED, {
        id: project.id,
        type: EventType.PROJECT_CREATED,
        data: project,
        timestamp: new Date(),
        userId: input.ownerId,
        correlationId: crypto.randomUUID() as UUID,
        version: 1
      });

      return project;
    } catch (error) {
      this.logger.error('Error creating project:', error);
      throw error;
    }
  }

  @Mutation('updateProject')
  @RateLimit({ limit: 30, ttl: 60 })
  async updateProject(
    @Args('id') id: string,
    @Args('input') input: UpdateProjectDto,
    @Args('version') version: number
  ): Promise<Project> {
    this.logger.debug(`Updating project ${id}:`, { ...input, sensitive: undefined });

    if (!isUUID(id)) {
      throw new Error('Invalid project ID format');
    }

    try {
      const project = await this.projectService.update(
        id as UUID,
        input,
        version,
        { emitEvents: true }
      );

      await this.eventBus.publish(EventType.PROJECT_UPDATED, {
        id: project.id,
        type: EventType.PROJECT_UPDATED,
        data: project,
        timestamp: new Date(),
        userId: input.ownerId || 'system',
        correlationId: crypto.randomUUID() as UUID,
        version: project.version
      });

      return project;
    } catch (error) {
      this.logger.error(`Error updating project ${id}:`, error);
      throw error;
    }
  }

  @Mutation('deleteProject')
  @RateLimit({ limit: 10, ttl: 60 })
  async deleteProject(@Args('id') id: string): Promise<boolean> {
    this.logger.debug(`Deleting project ${id}`);

    if (!isUUID(id)) {
      throw new Error('Invalid project ID format');
    }

    try {
      const success = await this.projectService.delete(id as UUID, { emitEvents: true });
      
      if (success) {
        await this.eventBus.publish(EventType.PROJECT_DELETED, {
          id: id as UUID,
          type: EventType.PROJECT_DELETED,
          data: { id },
          timestamp: new Date(),
          userId: 'system',
          correlationId: crypto.randomUUID() as UUID,
          version: 1
        });
      }

      return success;
    } catch (error) {
      this.logger.error(`Error deleting project ${id}:`, error);
      throw error;
    }
  }

  @Subscription('projectUpdated')
  projectUpdated() {
    return {
      subscribe: () => this.eventBus.asyncIterator([
        EventType.PROJECT_CREATED,
        EventType.PROJECT_UPDATED,
        EventType.PROJECT_DELETED
      ])
    };
  }
}