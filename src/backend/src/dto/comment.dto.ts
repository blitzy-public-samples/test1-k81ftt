import { IsString, IsUUID, IsArray, IsOptional, MinLength, MaxLength } from 'class-validator'; // v0.14.0
import { IComment, CommentType } from '../interfaces/IComment';
import { UUID } from '../types/common.types';

/**
 * Data Transfer Object for creating new comments in the task management system.
 * Implements comprehensive validation rules and type safety checks to ensure
 * data integrity and prevent injection attacks.
 * 
 * @implements {Pick<IComment, 'content' | 'taskId' | 'mentions' | 'parentId'>}
 */
export class CreateCommentDto implements Pick<IComment, 'content' | 'taskId' | 'mentions' | 'parentId'> {
  /**
   * The content of the comment, supporting markdown and @mentions
   * Enforces minimum and maximum length constraints to prevent empty or excessive comments
   */
  @IsString({ message: 'Comment content must be a string' })
  @MinLength(1, { message: 'Comment content cannot be empty' })
  @MaxLength(2000, { message: 'Comment content cannot exceed 2000 characters' })
  content: string;

  /**
   * UUID of the task this comment belongs to
   * Must be a valid UUID to prevent ID manipulation
   */
  @IsUUID('4', { message: 'Invalid task ID format' })
  taskId: UUID;

  /**
   * Array of user UUIDs that are @mentioned in the comment
   * Optional field that must contain valid UUIDs when present
   */
  @IsArray({ message: 'Mentions must be an array of UUIDs' })
  @IsUUID('4', { each: true, message: 'Each mention must be a valid UUID' })
  @IsOptional()
  mentions: UUID[];

  /**
   * UUID of the parent comment for threaded discussions
   * Optional field that must be a valid UUID when present
   */
  @IsUUID('4', { message: 'Invalid parent comment ID format' })
  @IsOptional()
  parentId: UUID | null;
}

/**
 * Data Transfer Object for updating existing comments.
 * Supports partial updates with validation rules to maintain data integrity.
 * Only allows modification of content and mentions to preserve comment history.
 * 
 * @implements {Pick<IComment, 'content' | 'mentions'>}
 */
export class UpdateCommentDto implements Pick<IComment, 'content' | 'mentions'> {
  /**
   * Updated content of the comment
   * Enforces the same length constraints as creation
   */
  @IsString({ message: 'Comment content must be a string' })
  @MinLength(1, { message: 'Comment content cannot be empty' })
  @MaxLength(2000, { message: 'Comment content cannot exceed 2000 characters' })
  content: string;

  /**
   * Updated array of @mentioned user UUIDs
   * Optional field that must contain valid UUIDs when present
   */
  @IsArray({ message: 'Mentions must be an array of UUIDs' })
  @IsUUID('4', { each: true, message: 'Each mention must be a valid UUID' })
  @IsOptional()
  mentions: UUID[];
}