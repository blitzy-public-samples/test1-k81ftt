import { Prisma } from '@prisma/client'; // ^5.0.0
import { IComment, CommentType } from '../interfaces/IComment';
import { UUID, ValidatedBaseEntity } from '../types/common.types';
import { IsString, Length, IsArray, IsUUID, IsBoolean, IsEnum, IsInt, Min } from 'class-validator'; // v0.14.0
import { Transform } from 'class-transformer'; // v0.5.1
import DOMPurify from 'isomorphic-dompurify'; // v1.1.0

/**
 * Prisma model implementation for Comment entity
 * Represents comments on tasks with support for threaded discussions,
 * @mentions, and real-time updates
 * 
 * @implements {IComment}
 */
export class Comment extends ValidatedBaseEntity implements IComment {
  @IsUUID('4')
  readonly id: UUID;

  @IsString()
  @Length(1, 2000, {
    message: 'Comment content must be between 1 and 2000 characters'
  })
  @Transform(({ value }) => DOMPurify.sanitize(value))
  content: string;

  @IsUUID('4')
  taskId: UUID;

  @IsUUID('4')
  authorId: UUID;

  @IsArray()
  @IsUUID('4', { each: true })
  mentions: UUID[];

  @IsUUID('4', { nullable: true })
  parentId: UUID | null;

  @IsBoolean()
  isEdited: boolean;

  @IsEnum(CommentType)
  type: CommentType;

  @IsInt()
  @Min(1)
  version: number;

  @IsString()
  contentHistory: string;

  /**
   * Creates a new Comment instance
   * @param {Partial<IComment>} data - Initial comment data
   * @throws {ValidationError} If validation fails
   */
  constructor(data: Partial<IComment>) {
    super(
      data.id as UUID,
      data.createdAt || new Date(),
      data.updatedAt || new Date(),
      1
    );

    this.content = data.content || '';
    this.taskId = data.taskId as UUID;
    this.authorId = data.authorId as UUID;
    this.mentions = data.mentions || [];
    this.parentId = data.parentId || null;
    this.isEdited = false;
    this.type = data.parentId ? CommentType.REPLY : CommentType.COMMENT;
    this.contentHistory = JSON.stringify([]);
    
    // Validate content length
    if (this.content.length < 1 || this.content.length > 2000) {
      throw new Error('Comment content must be between 1 and 2000 characters');
    }
  }

  /**
   * Updates comment content with version tracking
   * @param {string} newContent - New comment content
   * @throws {Error} If content validation fails
   */
  updateContent(newContent: string): void {
    if (newContent.length < 1 || newContent.length > 2000) {
      throw new Error('Comment content must be between 1 and 2000 characters');
    }

    // Store current content in history
    const history = JSON.parse(this.contentHistory);
    history.push({
      content: this.content,
      timestamp: new Date().toISOString(),
      version: this.version
    });
    this.contentHistory = JSON.stringify(history);

    // Update content and metadata
    this.content = DOMPurify.sanitize(newContent);
    this.version += 1;
    this.isEdited = true;
    this.updatedAt = new Date();
  }

  /**
   * Converts comment to JSON representation
   * @returns {object} Sanitized and formatted comment object
   */
  toJSON(): object {
    const history = JSON.parse(this.contentHistory);
    return {
      id: this.id,
      content: this.content,
      taskId: this.taskId,
      authorId: this.authorId,
      mentions: this.mentions,
      parentId: this.parentId,
      isEdited: this.isEdited,
      type: this.type,
      version: this.version,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      contentHistory: history,
      // Include derived fields for API responses
      hasReplies: false, // To be populated by repository
      replyCount: 0, // To be populated by repository
    };
  }

  /**
   * Creates Prisma database model
   * @returns {Prisma.CommentCreateInput} Prisma create input
   */
  toPrismaModel(): Prisma.CommentCreateInput {
    return {
      id: this.id,
      content: this.content,
      task: { connect: { id: this.taskId } },
      author: { connect: { id: this.authorId } },
      mentions: this.mentions,
      parent: this.parentId ? { connect: { id: this.parentId } } : undefined,
      isEdited: this.isEdited,
      type: this.type,
      version: this.version,
      contentHistory: this.contentHistory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Creates a system-generated comment
   * @param {string} content - System message content
   * @param {UUID} taskId - Associated task ID
   * @returns {Comment} System comment instance
   */
  static createSystemComment(content: string, taskId: UUID): Comment {
    const comment = new Comment({
      content,
      taskId,
      authorId: 'system' as UUID,
      mentions: [],
      type: CommentType.SYSTEM
    });
    return comment;
  }
}