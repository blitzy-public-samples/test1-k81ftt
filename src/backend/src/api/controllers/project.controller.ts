/**
 * @fileoverview Enhanced REST API controller for project management with comprehensive
 * security, validation, monitoring, and performance optimizations.
 * @version 1.0.0
 */

import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  UseInterceptors,
  Logger,
  HttpStatus,
  HttpException
} from '@nestjs/common'; // v10.0+
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiSecurity,
  ApiParam,
  ApiQuery 
} from '@nestjs/swagger'; // v7.0+
import { RateLimit } from '@nestjs/throttler'; // v5.0+
import { CacheInterceptor } from '@nestjs/cache-manager'; // v2.0+

import { ProjectService } from '../../core/services/ProjectService';
import { ProjectValidator } from '../validators/project.validator';
import { CreateProjectDto, UpdateProjectDto, ProjectResponseDto } from '../../dto/project.dto';
import { PaginatedResponse, UUID } from '../../types/common.types';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { TransformInterceptor } from '../interceptors/transform.interceptor';

/**
 * Enhanced REST API controller for project management with comprehensive
 * security, validation, monitoring, and performance optimizations.
 */
@Controller('api/v1/projects')
@ApiTags('Projects')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(LoggingInterceptor, TransformInterceptor)
@ApiSecurity('bearer')
export class ProjectController {
  private readonly logger = new Logger(ProjectController.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly projectValidator: ProjectValidator
  ) {}

  /**
   * Retrieves paginated list of projects with caching and monitoring
   */
  @Get()
  @UseInterceptors(CacheInterceptor)
  @RateLimit({ limit: 100, windowMs: 60000 })
  @ApiOperation({ summary: 'Get all projects' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: ProjectResponseDto, isArray: true })
  async getProjects(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters?: Record<string, any>
  ): Promise<PaginatedResponse<ProjectResponseDto>> {
    try {
      this.logger.debug(`Retrieving projects - page: ${page}, limit: ${limit}`);

      const result = await this.projectService.findAll({
        pagination: { page, limit },
        filters: this.transformFilters(filters)
      });

      return {
        data: result.data.map(project => new ProjectResponseDto(project)),
        pagination: {
          page,
          limit,
          total: result.total,
          hasMore: result.hasMore
        }
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve projects: ${error.message}`);
      throw new HttpException('Failed to retrieve projects', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Retrieves a specific project by ID with caching
   */
  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @RateLimit({ limit: 100, windowMs: 60000 })
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ProjectResponseDto })
  async getProjectById(@Param('id') id: UUID): Promise<ProjectResponseDto> {
    try {
      this.logger.debug(`Retrieving project with ID: ${id}`);
      const project = await this.projectService.findById(id);
      return new ProjectResponseDto(project);
    } catch (error) {
      this.logger.error(`Failed to retrieve project ${id}: ${error.message}`);
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Creates a new project with validation and security checks
   */
  @Post()
  @RateLimit({ limit: 30, windowMs: 60000 })
  @ApiOperation({ summary: 'Create new project' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProjectResponseDto })
  async createProject(@Body() projectData: CreateProjectDto): Promise<ProjectResponseDto> {
    try {
      this.logger.debug('Creating new project');

      const validationResult = await this.projectValidator.validateCreateProject(projectData);
      if (!validationResult.isValid) {
        throw new HttpException(
          { message: 'Validation failed', errors: validationResult.errorMessages },
          HttpStatus.BAD_REQUEST
        );
      }

      const project = await this.projectService.create(projectData);
      return new ProjectResponseDto(project);
    } catch (error) {
      this.logger.error(`Failed to create project: ${error.message}`);
      throw new HttpException(
        error.response || 'Failed to create project',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Updates an existing project with validation and optimistic locking
   */
  @Put(':id')
  @RateLimit({ limit: 30, windowMs: 60000 })
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ProjectResponseDto })
  async updateProject(
    @Param('id') id: UUID,
    @Body() projectData: UpdateProjectDto
  ): Promise<ProjectResponseDto> {
    try {
      this.logger.debug(`Updating project ${id}`);

      const validationResult = await this.projectValidator.validateUpdateProject(projectData);
      if (!validationResult.isValid) {
        throw new HttpException(
          { message: 'Validation failed', errors: validationResult.errorMessages },
          HttpStatus.BAD_REQUEST
        );
      }

      const project = await this.projectService.update(id, projectData, projectData.version);
      return new ProjectResponseDto(project);
    } catch (error) {
      this.logger.error(`Failed to update project ${id}: ${error.message}`);
      throw new HttpException(
        error.response || 'Failed to update project',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Deletes a project with security checks and cascade operations
   */
  @Delete(':id')
  @RateLimit({ limit: 10, windowMs: 60000 })
  @ApiOperation({ summary: 'Delete project' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async deleteProject(@Param('id') id: UUID): Promise<void> {
    try {
      this.logger.debug(`Deleting project ${id}`);
      await this.projectService.delete(id);
    } catch (error) {
      this.logger.error(`Failed to delete project ${id}: ${error.message}`);
      throw new HttpException(
        error.response || 'Failed to delete project',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Transforms query filters to service-compatible format
   * @private
   */
  private transformFilters(filters?: Record<string, any>): Array<{ field: string; operator: string; value: any }> {
    if (!filters) return [];

    return Object.entries(filters)
      .filter(([key]) => !['page', 'limit'].includes(key))
      .map(([field, value]) => ({
        field,
        operator: 'eq',
        value
      }));
  }
}