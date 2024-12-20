// @ts-strict
import { Entity, Column, ManyToOne, OneToMany } from '@prisma/client'; // v5.0+
import { 
  IsString, IsUUID, IsDate, IsInt, Min, Max, 
  IsArray, ValidateNested, IsOptional 
} from 'class-validator'; // v0.14+
import { ITask, TaskStatus, TaskPriority } from '../interfaces/ITask';
import { UUID, ValidatedBaseEntity, ValidateUUID, ValidateTimestamp } from '../types/common.types';
import { Type } from 'class-transformer'; // v0.5+

/**
 * Enhanced Task entity implementing ITask interface with comprehensive validation,
 * audit logging, and attachment handling capabilities.
 */
@Entity('tasks')
export class Task extends ValidatedBaseEntity implements ITask {
  @Column()
  @IsString()
  @Min(3)
  @Max(100)
  title: string;

  @Column({ type: 'text', nullable: true })
  @IsString()
  @IsOptional()
  @Max(2000)
  description: string | null;

  @Column()
  @ValidateUUID()
  projectId: UUID;

  @Column()
  @ValidateUUID()
  assigneeId: UUID;

  @Column()
  @ValidateUUID()
  creatorId: UUID;

  @Column({ type: 'enum' })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @Column({ type: 'enum' })
  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @Column()
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @Column({ nullable: true })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate: Date | null;

  @Column({ nullable: true })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  completedAt: Date | null;

  @Column({ nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedHours: number | null;

  @Column('uuid', { array: true })
  @IsArray()
  @ValidateUUID({ each: true })
  dependencies: UUID[];

  @Column('varchar', { array: true })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @Column({ type: 'jsonb' })
  metadata: Record<string, any>;

  @OneToMany(() => Attachment, attachment => attachment.task)
  @ValidateNested({ each: true })
  @Type(() => Attachment)
  attachments: Attachment[];

  @OneToMany(() => Comment, comment => comment.task)
  @ValidateNested({ each: true })
  @Type(() => Comment)
  comments: Comment[];

  /**
   * Creates a new Task instance with comprehensive validation
   * @param taskData - Partial task data for initialization
   */
  constructor(taskData: Partial<ITask>) {
    super(taskData.id);

    // Initialize required fields with validation
    this.title = taskData.title || '';
    this.description = taskData.description || null;
    this.projectId = taskData.projectId!;
    this.assigneeId = taskData.assigneeId!;
    this.creatorId = taskData.creatorId!;
    this.status = taskData.status || TaskStatus.TODO;
    this.priority = taskData.priority || TaskPriority.MEDIUM;
    this.dueDate = taskData.dueDate || new Date();

    // Initialize optional fields
    this.startDate = taskData.startDate || null;
    this.completedAt = taskData.completedAt || null;
    this.estimatedHours = taskData.estimatedHours || null;
    
    // Initialize collections
    this.dependencies = taskData.dependencies || [];
    this.tags = taskData.tags || [];
    this.metadata = taskData.metadata || {};
    this.attachments = [];
    this.comments = [];
  }

  /**
   * Updates task status with validation and audit logging
   * @param newStatus - New status to set
   * @param reason - Reason for status change
   * @throws ValidationError if status transition is invalid
   */
  async updateStatus(newStatus: TaskStatus, reason: string): Promise<void> {
    // Validate status transition
    if (!this.isValidStatusTransition(this.status, newStatus)) {
      throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
    }

    const oldStatus = this.status;
    this.status = newStatus;

    // Update timestamps based on status
    if (newStatus === TaskStatus.IN_PROGRESS && !this.startDate) {
      this.startDate = new Date();
    } else if (newStatus === TaskStatus.COMPLETED) {
      this.completedAt = new Date();
    }

    // Add status change to metadata
    this.metadata.statusHistory = this.metadata.statusHistory || [];
    this.metadata.statusHistory.push({
      from: oldStatus,
      to: newStatus,
      reason,
      timestamp: new Date()
    });

    this.version++;
  }

  /**
   * Adds new attachment with validation
   * @param attachment - Attachment to add
   * @throws ValidationError if attachment is invalid
   */
  async addAttachment(attachment: Attachment): Promise<void> {
    // Validate attachment
    if (!attachment.isValid()) {
      throw new Error('Invalid attachment');
    }

    // Check file size limits
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (attachment.size > MAX_FILE_SIZE) {
      throw new Error('Attachment exceeds maximum file size');
    }

    this.attachments.push(attachment);
    this.version++;
  }

  /**
   * Validates task dependencies
   * @returns Promise resolving to true if dependencies are valid
   * @throws ValidationError if dependencies are invalid
   */
  async validateDependencies(): Promise<boolean> {
    if (this.dependencies.length === 0) {
      return true;
    }

    // Check for circular dependencies
    const visited = new Set<UUID>();
    const checkCircular = async (taskId: UUID): Promise<boolean> => {
      if (visited.has(taskId)) {
        return false;
      }
      visited.add(taskId);
      // Implementation would need to fetch dependent task dependencies
      // and recursively check them
      return true;
    };

    for (const depId of this.dependencies) {
      if (!await checkCircular(depId)) {
        throw new Error('Circular dependency detected');
      }
    }

    return true;
  }

  /**
   * Validates if a status transition is allowed
   * @param from - Current status
   * @param to - Target status
   * @returns boolean indicating if transition is valid
   */
  private isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
    const validTransitions = {
      [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW, TaskStatus.BLOCKED],
      [TaskStatus.IN_REVIEW]: [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.BLOCKED],
      [TaskStatus.BLOCKED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
      [TaskStatus.COMPLETED]: [TaskStatus.IN_PROGRESS]
    };

    return validTransitions[from]?.includes(to) || false;
  }
}