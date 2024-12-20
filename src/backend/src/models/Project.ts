/**
 * @fileoverview Project model class implementing the IProject interface with enhanced validation,
 * business logic, and ORM integration for comprehensive project management.
 * @version 1.0.0
 */

import { Entity, Column, OneToMany, Index } from '@prisma/client'; // v5.0+
import { DateTime } from 'luxon'; // v3.0+
import { IProject, ProjectStatus } from '../interfaces/IProject';
import { UUID, ValidateUUID, ValidateTimestamp } from '../types/common.types';
import { IsNotEmpty, IsString, ValidateNested, IsOptional } from 'class-validator'; // v0.14.0

/**
 * Project entity class with enhanced validation, business logic, and ORM integration
 * Implements comprehensive project management capabilities with timeline tracking
 */
@Entity('projects')
@Index(['ownerId', 'status'])
export class Project implements IProject {
  @ValidateUUID()
  @Column({ type: 'uuid', primary: true })
  readonly id: UUID;

  @IsNotEmpty()
  @IsString()
  @Column({ type: 'varchar', length: 255 })
  readonly name: string;

  @IsString()
  @Column({ type: 'text' })
  readonly description: string;

  @ValidateUUID()
  @Column({ type: 'uuid' })
  readonly ownerId: UUID;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING
  })
  private _status: ProjectStatus;

  @ValidateTimestamp()
  @Column({ type: 'timestamp with time zone' })
  readonly startDate: Date;

  @ValidateTimestamp()
  @Column({ type: 'timestamp with time zone' })
  readonly endDate: Date;

  @ValidateNested()
  @Column({ type: 'jsonb', default: {} })
  readonly metadata: Record<string, any>;

  @ValidateTimestamp()
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  readonly createdAt: Date;

  @ValidateTimestamp()
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  readonly updatedAt: Date;

  @OneToMany(() => Task, task => task.project)
  readonly tasks: Task[];

  @Column({ type: 'boolean', default: false })
  private _isDeleted: boolean;

  // Cache for duration calculation
  private _cachedDuration?: number;

  /**
   * Creates a new Project instance with enhanced validation
   * @param projectData - Partial project data for initialization
   * @throws {ValidationError} If required fields are missing or invalid
   */
  constructor(projectData: Partial<IProject>) {
    this.validateProjectData(projectData);
    
    this.id = projectData.id!;
    this.name = projectData.name!;
    this.description = projectData.description || '';
    this.ownerId = projectData.ownerId!;
    this._status = projectData.status || ProjectStatus.PLANNING;
    this.startDate = projectData.startDate || new Date();
    this.endDate = projectData.endDate!;
    this.metadata = projectData.metadata || {};
    this.createdAt = projectData.createdAt || new Date();
    this.updatedAt = projectData.updatedAt || new Date();
    this.tasks = [];
    this._isDeleted = false;
  }

  /**
   * Updates project status with validation and event emission
   * @param newStatus - New status to set
   * @param reason - Reason for status change
   * @throws {ValidationError} If status transition is invalid
   */
  async updateStatus(newStatus: ProjectStatus, reason: string): Promise<void> {
    if (!this.validateStatusTransition(newStatus)) {
      throw new Error(`Invalid status transition from ${this._status} to ${newStatus}`);
    }

    const oldStatus = this._status;
    this._status = newStatus;
    this.updatedAt = new Date();

    // Emit status change event
    await this.emitStatusChangeEvent(oldStatus, newStatus, reason);
    
    // Update related tasks if needed
    if (newStatus === ProjectStatus.COMPLETED || newStatus === ProjectStatus.CANCELLED) {
      await this.updateRelatedTasks(newStatus);
    }
  }

  /**
   * Checks if project is currently active with enhanced validation
   * @returns boolean indicating if project is active and not deleted
   */
  isActive(): boolean {
    if (this._isDeleted) return false;
    
    const activeStatuses = [ProjectStatus.PLANNING, ProjectStatus.IN_PROGRESS];
    if (!activeStatuses.includes(this._status)) return false;

    const now = new Date();
    return this.startDate <= now && now <= this.endDate;
  }

  /**
   * Calculates project duration in business days with timezone handling
   * @param excludeHolidays - Whether to exclude holidays from calculation
   * @returns number of business days
   */
  getDuration(excludeHolidays: boolean = true): number {
    if (this._cachedDuration !== undefined) {
      return this._cachedDuration;
    }

    const start = DateTime.fromJSDate(this.startDate);
    const end = DateTime.fromJSDate(this.endDate);

    let duration = 0;
    let current = start;

    while (current <= end) {
      const isWeekend = current.weekday > 5;
      const isHoliday = excludeHolidays && this.isHoliday(current);

      if (!isWeekend && !isHoliday) {
        duration++;
      }

      current = current.plus({ days: 1 });
    }

    this._cachedDuration = duration;
    return duration;
  }

  /**
   * Gets current project status
   */
  get status(): ProjectStatus {
    return this._status;
  }

  /**
   * Gets project deletion status
   */
  get isDeleted(): boolean {
    return this._isDeleted;
  }

  /**
   * Validates project data during initialization
   * @param projectData - Project data to validate
   * @throws {ValidationError} If validation fails
   */
  private validateProjectData(projectData: Partial<IProject>): void {
    if (!projectData.name) {
      throw new Error('Project name is required');
    }

    if (!projectData.ownerId) {
      throw new Error('Project owner is required');
    }

    if (projectData.startDate && projectData.endDate) {
      if (projectData.startDate > projectData.endDate) {
        throw new Error('Start date must be before end date');
      }
    }
  }

  /**
   * Validates status transition
   * @param newStatus - Status to transition to
   * @returns boolean indicating if transition is valid
   */
  private validateStatusTransition(newStatus: ProjectStatus): boolean {
    const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
      [ProjectStatus.PLANNING]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
      [ProjectStatus.IN_PROGRESS]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      [ProjectStatus.ON_HOLD]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
      [ProjectStatus.COMPLETED]: [],
      [ProjectStatus.CANCELLED]: []
    };

    return validTransitions[this._status].includes(newStatus);
  }

  /**
   * Emits status change event
   * @param oldStatus - Previous status
   * @param newStatus - New status
   * @param reason - Reason for change
   */
  private async emitStatusChangeEvent(
    oldStatus: ProjectStatus,
    newStatus: ProjectStatus,
    reason: string
  ): Promise<void> {
    // Implementation would depend on event system
    // Placeholder for event emission logic
  }

  /**
   * Updates related tasks when project status changes
   * @param projectStatus - New project status
   */
  private async updateRelatedTasks(projectStatus: ProjectStatus): Promise<void> {
    // Implementation would depend on task update logic
    // Placeholder for task update logic
  }

  /**
   * Checks if a given date is a holiday
   * @param date - Date to check
   * @returns boolean indicating if date is a holiday
   */
  private isHoliday(date: DateTime): boolean {
    // Implementation would depend on holiday calendar integration
    // Placeholder for holiday check logic
    return false;
  }
}