import { BaseEntity, UUID } from '../types/common.types';

/**
 * Enumeration defining the types of comments supported in the system
 * COMMENT: Standard user comment on a task
 * REPLY: Response to an existing comment
 * SYSTEM: Automatically generated notification or system message
 */
export enum CommentType {
  COMMENT = 'COMMENT',
  REPLY = 'REPLY',
  SYSTEM = 'SYSTEM'
}

/**
 * Interface defining the structure of a comment entity in the task management system.
 * Extends BaseEntity to inherit common fields (id, createdAt, updatedAt).
 * Supports threaded comments, @mentions, and system-generated notifications.
 * 
 * @extends {BaseEntity}
 */
export interface IComment extends BaseEntity {
  /**
   * Unique identifier for the comment
   */
  id: UUID;

  /**
   * The actual content of the comment, supporting markdown and @mentions
   */
  content: string;

  /**
   * Reference to the task this comment belongs to
   */
  taskId: UUID;

  /**
   * Reference to the user who created the comment
   */
  authorId: UUID;

  /**
   * Array of user IDs that were @mentioned in the comment
   */
  mentions: UUID[];

  /**
   * Reference to parent comment ID for threaded discussions
   * Null for top-level comments
   */
  parentId: UUID | null;

  /**
   * Flag indicating if the comment has been edited
   */
  isEdited: boolean;

  /**
   * Type of comment (user comment, reply, or system notification)
   */
  type: CommentType;

  /**
   * Timestamp when the comment was created
   * Inherited from BaseEntity
   */
  createdAt: Date;

  /**
   * Timestamp when the comment was last updated
   * Inherited from BaseEntity
   */
  updatedAt: Date;
}