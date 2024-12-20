/**
 * @fileoverview Enhanced implementation of the repository pattern for Project entities,
 * providing data access operations with Prisma ORM integration, supporting advanced
 * querying, filtering, audit logging, caching, and optimistic locking.
 * @version 1.0.0
 */

import { Injectable } from '@nestjs/common'; // v10.0+
import { PrismaClient } from '@prisma/client'; // v5.0+
import { Cache } from '@nestjs/cache-manager'; // v2.0+
import { Logger } from '@nestjs/common'; // v10.0+
import { IRepository } from '../interfaces/IRepository';
import { Project, ProjectStatus } from '../../models/Project';
import { UUID } from '../../types/common.types';

/**
 * Cache configuration constants
 */
const CACHE_TTL = 3600; // 1 hour in seconds
const CACHE_PREFIX = 'project:';

/**
 * Enhanced repository implementation for Project entities with advanced features
 * including caching, audit logging, and optimistic locking.
 */
@Injectable()
export class ProjectRepository implements IRepository<Project> {
  private readonly logger = new Logger(ProjectRepository.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheManager: Cache
  ) {}

  /**
   * Retrieves a project by ID with caching support
   * @param id - Project unique identifier
   * @returns Promise resolving to Project or null
   */
  async findById(id: UUID): Promise<Project | null> {
    try {
      // Check cache first
      const cacheKey = `${CACHE_PREFIX}${id}`;
      const cachedProject = await this.cacheManager.get<Project>(cacheKey);
      
      if (cachedProject) {
        this.logger.debug(`Cache hit for project ${id}`);
        return cachedProject;
      }

      // Query database if not in cache
      const project = await this.prisma.project.findUnique({
        where: { id, isDeleted: false },
        include: { tasks: true }
      });

      if (project) {
        // Store in cache
        await this.cacheManager.set(cacheKey, project, CACHE_TTL);
        this.logger.debug(`Cached project ${id}`);
      }

      return project;
    } catch (error) {
      this.logger.error(`Error retrieving project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves projects with advanced filtering and pagination
   * @param options - Query options for filtering, sorting, and pagination
   * @returns Promise resolving to paginated results
   */
  async findAll(options?: QueryOptions): Promise<{
    data: Project[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const {
        pagination = { page: 1, pageSize: 10 },
        sort = [{ field: 'createdAt', direction: 'DESC' }],
        filters = [],
        includes = []
      } = options || {};

      // Build where clause from filters
      const where = {
        isDeleted: false,
        AND: filters.map(filter => ({
          [filter.field]: {
            [this.mapOperator(filter.operator)]: filter.value
          }
        }))
      };

      // Execute count and data queries in parallel
      const [total, projects] = await Promise.all([
        this.prisma.project.count({ where }),
        this.prisma.project.findMany({
          where,
          include: this.buildIncludeObject(includes),
          orderBy: sort.map(s => ({ [s.field]: s.direction })),
          skip: (pagination.page - 1) * pagination.pageSize,
          take: pagination.pageSize
        })
      ]);

      const totalPages = Math.ceil(total / pagination.pageSize);

      return {
        data: projects,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages
      };
    } catch (error) {
      this.logger.error('Error retrieving projects:', error);
      throw error;
    }
  }

  /**
   * Creates a new project with validation and audit logging
   * @param data - Project data for creation
   * @returns Promise resolving to created Project
   */
  async create(data: Partial<Project>): Promise<Project> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            ...data,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          include: { tasks: true }
        });

        // Create audit log entry
        await tx.auditLog.create({
          data: {
            entityType: 'Project',
            entityId: project.id,
            action: 'CREATE',
            userId: data.ownerId as string,
            changes: { ...data }
          }
        });

        return project;
      });
    } catch (error) {
      this.logger.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Updates project with optimistic locking and audit logging
   * @param id - Project ID to update
   * @param data - Update data
   * @param version - Expected version for optimistic locking
   * @returns Promise resolving to updated Project
   */
  async update(id: UUID, data: Partial<Project>, version: number): Promise<Project> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verify version match for optimistic locking
        const current = await tx.project.findUnique({
          where: { id }
        });

        if (!current || current.version !== version) {
          throw new Error('Version mismatch - update conflict detected');
        }

        const updated = await tx.project.update({
          where: { id },
          data: {
            ...data,
            version: version + 1,
            updatedAt: new Date()
          },
          include: { tasks: true }
        });

        // Create audit log entry
        await tx.auditLog.create({
          data: {
            entityType: 'Project',
            entityId: id,
            action: 'UPDATE',
            userId: data.ownerId as string,
            changes: { ...data },
            previousVersion: version
          }
        });

        // Invalidate cache
        await this.cacheManager.del(`${CACHE_PREFIX}${id}`);

        return updated;
      });
    } catch (error) {
      this.logger.error(`Error updating project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Soft deletes a project with audit logging
   * @param id - Project ID to delete
   * @returns Promise resolving to boolean indicating success
   */
  async softDelete(id: UUID): Promise<boolean> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const project = await tx.project.update({
          where: { id },
          data: {
            isDeleted: true,
            updatedAt: new Date()
          }
        });

        // Create audit log entry
        await tx.auditLog.create({
          data: {
            entityType: 'Project',
            entityId: id,
            action: 'DELETE',
            userId: project.ownerId,
            changes: { isDeleted: true }
          }
        });

        // Invalidate cache
        await this.cacheManager.del(`${CACHE_PREFIX}${id}`);

        return true;
      });
    } catch (error) {
      this.logger.error(`Error deleting project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Maps filter operators to Prisma operators
   * @param operator - Filter operator
   * @returns Prisma operator
   */
  private mapOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      eq: 'equals',
      neq: 'not',
      gt: 'gt',
      gte: 'gte',
      lt: 'lt',
      lte: 'lte',
      like: 'contains',
      in: 'in',
      between: 'between'
    };
    return operatorMap[operator] || 'equals';
  }

  /**
   * Builds include object for Prisma queries
   * @param includes - Array of relations to include
   * @returns Prisma include object
   */
  private buildIncludeObject(includes: string[]): Record<string, boolean> {
    return includes.reduce((acc, include) => ({
      ...acc,
      [include]: true
    }), {});
  }
}