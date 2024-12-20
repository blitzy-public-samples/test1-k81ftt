/**
 * @fileoverview Enhanced project validator implementing comprehensive validation rules
 * for project operations with security controls and performance optimization
 * @version 1.0.0
 */

import { validate, ValidationError } from 'class-validator'; // ^0.14.0
import { CreateProjectDto, UpdateProjectDto } from '../../dto/project.dto';
import { PROJECT_VALIDATION } from '../../constants/validation.constants';
import { ProjectStatus } from '../../interfaces/IProject';
import { UUID, isUUID } from '../../types/common.types';
import { Injectable } from '@nestjs/common';

/**
 * Interface for validation result with detailed error feedback
 */
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  errorMessages: string[];
}

/**
 * Interface for validation cache entry
 */
interface ValidationCacheEntry {
  result: ValidationResult;
  timestamp: number;
}

/**
 * Enhanced project validator with comprehensive validation capabilities
 * Implements caching and performance optimization
 */
@Injectable()
export class ProjectValidator {
  private readonly CACHE_TTL = 300000; // 5 minutes cache TTL
  private readonly validationCache: Map<string, ValidationCacheEntry>;

  constructor() {
    this.validationCache = new Map();
  }

  /**
   * Validates project creation data with enhanced security checks
   * @param projectData - Project creation DTO
   * @returns Detailed validation result
   */
  async validateCreateProject(projectData: CreateProjectDto): Promise<ValidationResult> {
    const cacheKey = this.generateCacheKey('create', projectData);
    const cachedResult = this.getCachedValidation(cacheKey);
    if (cachedResult) return cachedResult;

    const errors: ValidationError[] = await validate(projectData);
    const errorMessages: string[] = [];

    // Basic field validation
    if (!this.validateProjectName(projectData.name)) {
      errorMessages.push(`Project name must be between ${PROJECT_VALIDATION.NAME_MIN_LENGTH} and ${PROJECT_VALIDATION.NAME_MAX_LENGTH} characters`);
    }

    if (projectData.description && projectData.description.length > PROJECT_VALIDATION.DESCRIPTION_MAX_LENGTH) {
      errorMessages.push(`Description cannot exceed ${PROJECT_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`);
    }

    // Owner ID validation
    if (!isUUID(projectData.ownerId)) {
      errorMessages.push('Invalid owner ID format');
    }

    // Timeline validation
    if (!this.validateProjectTimeline(projectData.startDate, projectData.endDate)) {
      errorMessages.push('Invalid project timeline: End date must be after start date');
    }

    // Hierarchy validation if parent project is specified
    if (projectData.parentProjectId) {
      if (!isUUID(projectData.parentProjectId)) {
        errorMessages.push('Invalid parent project ID format');
      }
      if (projectData.parentProjectId === projectData.ownerId) {
        errorMessages.push('Parent project cannot be the same as owner ID');
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0 && errorMessages.length === 0,
      errors,
      errorMessages
    };

    this.cacheValidationResult(cacheKey, result);
    return result;
  }

  /**
   * Validates project update data with status transition checks
   * @param projectData - Project update DTO
   * @returns Detailed validation result with transition checks
   */
  async validateUpdateProject(projectData: UpdateProjectDto): Promise<ValidationResult> {
    const cacheKey = this.generateCacheKey('update', projectData);
    const cachedResult = this.getCachedValidation(cacheKey);
    if (cachedResult) return cachedResult;

    const errors: ValidationError[] = await validate(projectData);
    const errorMessages: string[] = [];

    // Name validation if provided
    if (projectData.name && !this.validateProjectName(projectData.name)) {
      errorMessages.push(`Project name must be between ${PROJECT_VALIDATION.NAME_MIN_LENGTH} and ${PROJECT_VALIDATION.NAME_MAX_LENGTH} characters`);
    }

    // Description length validation if provided
    if (projectData.description && projectData.description.length > PROJECT_VALIDATION.DESCRIPTION_MAX_LENGTH) {
      errorMessages.push(`Description cannot exceed ${PROJECT_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`);
    }

    // Status transition validation
    if (projectData.status && !this.validateStatusTransition(projectData.status)) {
      errorMessages.push('Invalid project status transition');
    }

    // Timeline validation if dates are provided
    if (projectData.startDate && projectData.endDate) {
      if (!this.validateProjectTimeline(projectData.startDate, projectData.endDate)) {
        errorMessages.push('Invalid project timeline: End date must be after start date');
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0 && errorMessages.length === 0,
      errors,
      errorMessages
    };

    this.cacheValidationResult(cacheKey, result);
    return result;
  }

  /**
   * Validates project name against defined rules
   * @param name - Project name to validate
   * @returns boolean indicating if name is valid
   */
  private validateProjectName(name: string): boolean {
    if (!name) return false;
    if (name.length < PROJECT_VALIDATION.NAME_MIN_LENGTH || 
        name.length > PROJECT_VALIDATION.NAME_MAX_LENGTH) return false;
    return PROJECT_VALIDATION.NAME_PATTERN.test(name);
  }

  /**
   * Validates project timeline constraints
   * @param startDate - Project start date
   * @param endDate - Project end date
   * @returns boolean indicating if timeline is valid
   */
  private validateProjectTimeline(startDate: Date, endDate: Date): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start < end && start >= new Date();
  }

  /**
   * Validates project status transitions
   * @param newStatus - New project status
   * @returns boolean indicating if status transition is valid
   */
  private validateStatusTransition(newStatus: ProjectStatus): boolean {
    return Object.values(ProjectStatus).includes(newStatus);
  }

  /**
   * Generates cache key for validation results
   * @param operation - Validation operation type
   * @param data - Data being validated
   * @returns Cache key string
   */
  private generateCacheKey(operation: string, data: any): string {
    return `${operation}-${JSON.stringify(data)}`;
  }

  /**
   * Retrieves cached validation result if valid
   * @param key - Cache key
   * @returns Cached validation result or null
   */
  private getCachedValidation(key: string): ValidationResult | null {
    const cached = this.validationCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    return null;
  }

  /**
   * Caches validation result
   * @param key - Cache key
   * @param result - Validation result to cache
   */
  private cacheValidationResult(key: string, result: ValidationResult): void {
    this.validationCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }
}

export { ProjectValidator, ValidationResult };