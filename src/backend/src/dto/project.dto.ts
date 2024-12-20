/**
 * @fileoverview Data Transfer Object definitions for Project-related operations
 * Provides validated structures for project creation, updates, and responses
 * with enhanced support for project hierarchy, task grouping, timeline management,
 * and dependency tracking.
 * @version 1.0.0
 */

import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsEnum, 
  IsDate, 
  IsUUID, 
  ValidateNested 
} from 'class-validator'; // ^0.14.0
import { Type } from 'class-transformer'; // ^0.5.0
import { IProject, ProjectStatus } from '../interfaces/IProject';
import { UUID } from '../types/common.types';

/**
 * DTO for project creation requests with enhanced support for 
 * hierarchy, task grouping, and dependencies
 */
export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsUUID('4')
  @IsNotEmpty()
  ownerId: UUID;

  @IsUUID('4')
  @IsOptional()
  parentProjectId?: UUID;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endDate: Date;

  @IsOptional()
  @ValidateNested()
  metadata?: Record<string, any>;
}

/**
 * DTO for project update requests with support for modifying 
 * hierarchy, task groups, and dependencies
 */
export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsUUID('4')
  @IsOptional()
  parentProjectId?: UUID;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsOptional()
  @ValidateNested()
  metadata?: Record<string, any>;
}

/**
 * DTO for project responses including hierarchy, task grouping, 
 * and dependency information
 */
export class ProjectResponseDto implements Partial<IProject> {
  @IsUUID('4')
  readonly id: UUID;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  readonly description: string;

  @IsUUID('4')
  readonly ownerId: UUID;

  @IsEnum(ProjectStatus)
  readonly status: ProjectStatus;

  @IsUUID('4')
  @IsOptional()
  readonly parentProjectId?: UUID;

  @IsOptional()
  readonly hierarchyLevel?: number;

  @IsDate()
  @Type(() => Date)
  readonly startDate: Date;

  @IsDate()
  @Type(() => Date)
  readonly endDate: Date;

  @ValidateNested()
  readonly metadata: Record<string, any>;

  @IsDate()
  @Type(() => Date)
  readonly createdAt: Date;

  @IsDate()
  @Type(() => Date)
  readonly updatedAt: Date;

  constructor(project: IProject) {
    this.id = project.id;
    this.name = project.name;
    this.description = project.description;
    this.ownerId = project.ownerId;
    this.status = project.status;
    this.startDate = project.startDate;
    this.endDate = project.endDate;
    this.metadata = project.metadata as Record<string, any>;
    this.createdAt = project.createdAt;
    this.updatedAt = project.updatedAt;
  }
}