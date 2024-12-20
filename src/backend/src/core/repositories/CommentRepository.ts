/**
 * @fileoverview Enhanced repository implementation for comment-related database operations
 * with support for caching, audit logging, and comprehensive error handling.
 * Version: 1.0.0
 */

import { PrismaClient } from '@prisma/client'; // ^5.0.0
import Redis from 'ioredis'; // ^5.0.0
import { IRepository } from '../interfaces/IRepository';
import { IComment, CommentType } from '../../interfaces/IComment';
import { CreateCommentDto } from '../../dto/comment.dto';
import { createError } from '../../utils/error.util';
import { Logger } from '../../utils/logger.util';
import { UUID } from '../../types/common.types';

/**
 * Cache configuration for comment operations
 */
const CACHE_CONFIG = {
  TTL: 3600, // 1 hour in seconds
  KEY_PREFIX: 'comment:',
  LIST_KEY_PREFIX: 'comment:list:',
};

/**
 * Enhanced repository implementation for comment-related database operations
 * Implements caching, audit logging, and comprehensive error handling
 */
export class CommentRepository implements IRepository<IComment> {
  private readonly redis: Redis;
  private readonly logger: Logger;

  constructor(
    private readonly prisma: PrismaClient,
    logger: Logger
  ) {
    this.logger = logger.withContext({ service: 'CommentRepository' });
    this.redis = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
    });

    // Handle Redis connection errors
    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', { error });
    });
  }

  /**
   * Retrieves a single comment by its ID with caching
   */
  public async findById(id: UUID): Promise<IComment | null> {
    const cacheKey = `${CACHE_CONFIG.KEY_PREFIX}${id}`;

    try {
      // Try to get from cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit for comment', { id });
        return JSON.parse(cached);
      }

      // Get from database
      const comment = await this.prisma.comment.findUnique({
        where: { id },
        include: {
          author: true,
          mentions: true,
        },
      });

      if (comment) {
        // Cache the result
        await this.redis.setex(cacheKey, CACHE_CONFIG.TTL, JSON.stringify(comment));
      }

      return comment;
    } catch (error) {
      this.logger.error('Error fetching comment', { error, id });
      throw createError('2001', 'Failed to fetch comment', { id });
    }
  }

  /**
   * Retrieves all comments with pagination, filtering, and caching
   */
  public async findAll(options?: QueryOptions): Promise<{
    data: IComment[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const {
      pagination = { page: 1, pageSize: 20 },
      filters = [],
      sort = [{ field: 'createdAt', direction: 'DESC' }],
    } = options || {};

    const cacheKey = `${CACHE_CONFIG.LIST_KEY_PREFIX}${JSON.stringify({ pagination, filters, sort })}`;

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit for comment list');
        return JSON.parse(cached);
      }

      // Build query
      const where = filters.reduce((acc, filter) => {
        acc[filter.field] = this.buildFilterCondition(filter);
        return acc;
      }, {});

      // Execute query with pagination
      const [data, total] = await Promise.all([
        this.prisma.comment.findMany({
          where,
          skip: (pagination.page - 1) * pagination.pageSize,
          take: pagination.pageSize,
          orderBy: sort.map(s => ({ [s.field]: s.direction })),
          include: {
            author: true,
            mentions: true,
          },
        }),
        this.prisma.comment.count({ where }),
      ]);

      const result = {
        data,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(total / pagination.pageSize),
      };

      // Cache the result
      await this.redis.setex(cacheKey, CACHE_CONFIG.TTL, JSON.stringify(result));

      return result;
    } catch (error) {
      this.logger.error('Error fetching comments', { error, options });
      throw createError('2002', 'Failed to fetch comments', { options });
    }
  }

  /**
   * Creates a new comment with validation and audit logging
   */
  public async create(data: CreateCommentDto): Promise<IComment> {
    try {
      const comment = await this.prisma.comment.create({
        data: {
          content: data.content,
          taskId: data.taskId,
          authorId: data.authorId,
          mentions: {
            connect: data.mentions?.map(id => ({ id })) || [],
          },
          type: CommentType.COMMENT,
          isEdited: false,
        },
        include: {
          author: true,
          mentions: true,
        },
      });

      // Invalidate relevant caches
      await this.invalidateCache(comment.id);

      this.logger.info('Comment created', {
        commentId: comment.id,
        taskId: data.taskId,
        authorId: data.authorId,
      });

      return comment;
    } catch (error) {
      this.logger.error('Error creating comment', { error, data });
      throw createError('2003', 'Failed to create comment', { data });
    }
  }

  /**
   * Updates an existing comment with validation and audit logging
   */
  public async update(id: UUID, data: Partial<IComment>): Promise<IComment> {
    try {
      const comment = await this.prisma.comment.update({
        where: { id },
        data: {
          content: data.content,
          mentions: {
            set: data.mentions?.map(id => ({ id })) || [],
          },
          isEdited: true,
          updatedAt: new Date(),
        },
        include: {
          author: true,
          mentions: true,
        },
      });

      // Invalidate relevant caches
      await this.invalidateCache(id);

      this.logger.info('Comment updated', {
        commentId: id,
        changes: data,
      });

      return comment;
    } catch (error) {
      this.logger.error('Error updating comment', { error, id, data });
      throw createError('2004', 'Failed to update comment', { id });
    }
  }

  /**
   * Deletes a comment with cascade handling and audit logging
   */
  public async delete(id: UUID): Promise<boolean> {
    try {
      await this.prisma.comment.delete({
        where: { id },
      });

      // Invalidate relevant caches
      await this.invalidateCache(id);

      this.logger.info('Comment deleted', { commentId: id });

      return true;
    } catch (error) {
      this.logger.error('Error deleting comment', { error, id });
      throw createError('2005', 'Failed to delete comment', { id });
    }
  }

  /**
   * Counts total number of comments matching the specified criteria
   */
  public async count(filters?: FilterParams[]): Promise<number> {
    try {
      const where = filters?.reduce((acc, filter) => {
        acc[filter.field] = this.buildFilterCondition(filter);
        return acc;
      }, {}) || {};

      return await this.prisma.comment.count({ where });
    } catch (error) {
      this.logger.error('Error counting comments', { error, filters });
      throw createError('2006', 'Failed to count comments', { filters });
    }
  }

  /**
   * Executes operations within a transaction
   */
  public async transaction<R>(operations: () => Promise<R>): Promise<R> {
    try {
      return await this.prisma.$transaction(operations);
    } catch (error) {
      this.logger.error('Transaction failed', { error });
      throw createError('2007', 'Transaction failed', { error });
    }
  }

  /**
   * Checks if a comment exists by its ID
   */
  public async exists(id: UUID): Promise<boolean> {
    try {
      const count = await this.prisma.comment.count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      this.logger.error('Error checking comment existence', { error, id });
      throw createError('2008', 'Failed to check comment existence', { id });
    }
  }

  /**
   * Helper method to build Prisma filter conditions
   */
  private buildFilterCondition(filter: FilterParams): any {
    switch (filter.operator) {
      case 'eq':
        return { equals: filter.value };
      case 'neq':
        return { not: filter.value };
      case 'gt':
        return { gt: filter.value };
      case 'gte':
        return { gte: filter.value };
      case 'lt':
        return { lt: filter.value };
      case 'lte':
        return { lte: filter.value };
      case 'like':
        return { contains: filter.value, mode: 'insensitive' };
      case 'in':
        return { in: filter.value };
      case 'between':
        return {
          gte: (filter.value as [unknown, unknown])[0],
          lte: (filter.value as [unknown, unknown])[1],
        };
      default:
        throw new Error(`Unsupported filter operator: ${filter.operator}`);
    }
  }

  /**
   * Helper method to invalidate cache entries
   */
  private async invalidateCache(id: UUID): Promise<void> {
    try {
      const keys = await this.redis.keys(`${CACHE_CONFIG.KEY_PREFIX}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.warn('Cache invalidation failed', { error, id });
    }
  }
}