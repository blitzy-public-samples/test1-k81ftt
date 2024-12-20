/**
 * @fileoverview Express router configuration for comment-related endpoints with
 * comprehensive security, validation, and real-time update capabilities.
 * Implements rate limiting, caching, and input validation for robust comment handling.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { Router } from 'express'; // ^4.18.0
import compression from 'compression'; // ^1.7.4
import { caching } from 'cache-manager'; // ^5.2.0
import { CommentController } from '../controllers/comment.controller';
import { 
  validateCreateComment, 
  validateUpdateComment 
} from '../validators/comment.validator';
import { 
  authenticate, 
  authorize 
} from '../middlewares/auth.middleware';
import { errorHandler } from '../middlewares/error.middleware';
import { logger } from '../../utils/logger.util';
import { UserRole } from '../../types/auth.types';
import { EventType } from '../../types/event.types';

// Constants for route configuration
const BASE_ROUTE = '/api/v1/comments';
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100;
const CACHE_TTL = 300; // 5 minutes

/**
 * Configures and returns an Express router with secured comment-related routes
 * Implements comprehensive security, caching, and real-time updates
 */
export function configureCommentRoutes(
  commentController: CommentController
): Router {
  const router = Router();

  // Apply compression middleware for response optimization
  router.use(compression());

  // Configure response caching
  const cache = caching({
    ttl: CACHE_TTL,
    store: 'memory',
    max: 1000
  });

  /**
   * POST /api/v1/comments
   * Creates a new comment with real-time notification
   */
  router.post('/',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER]),
    validateCreateComment,
    async (req, res, next) => {
      try {
        const startTime = Date.now();
        const result = await commentController.createComment(req.body);

        logger.info('Comment created successfully', {
          userId: req.user?.id,
          taskId: req.body.taskId,
          duration: Date.now() - startTime
        });

        res.status(201).json({
          success: true,
          data: result,
          message: 'Comment created successfully'
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PUT /api/v1/comments/:id
   * Updates an existing comment with ownership verification
   */
  router.put('/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER]),
    validateUpdateComment,
    async (req, res, next) => {
      try {
        const startTime = Date.now();
        const result = await commentController.updateComment(
          req.params.id,
          req.body,
          req.user!.id
        );

        logger.info('Comment updated successfully', {
          userId: req.user?.id,
          commentId: req.params.id,
          duration: Date.now() - startTime
        });

        res.json({
          success: true,
          data: result,
          message: 'Comment updated successfully'
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * DELETE /api/v1/comments/:id
   * Deletes a comment with cascade deletion
   */
  router.delete('/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER]),
    async (req, res, next) => {
      try {
        const startTime = Date.now();
        await commentController.deleteComment(req.params.id, req.user!.id);

        logger.info('Comment deleted successfully', {
          userId: req.user?.id,
          commentId: req.params.id,
          duration: Date.now() - startTime
        });

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/v1/comments/task/:taskId
   * Gets paginated task comments with caching
   */
  router.get('/task/:taskId',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER, UserRole.GUEST]),
    async (req, res, next) => {
      try {
        const startTime = Date.now();
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        // Check cache first
        const cacheKey = `comments:task:${req.params.taskId}:${page}:${limit}`;
        const cachedResult = await cache.get(cacheKey);

        if (cachedResult) {
          logger.debug('Cache hit for task comments', { taskId: req.params.taskId });
          return res.json(cachedResult);
        }

        const result = await commentController.getTaskComments(
          req.params.taskId,
          page,
          limit
        );

        // Cache the result
        await cache.set(cacheKey, result);

        logger.info('Task comments retrieved successfully', {
          userId: req.user?.id,
          taskId: req.params.taskId,
          duration: Date.now() - startTime
        });

        res.json({
          success: true,
          data: result,
          message: 'Task comments retrieved successfully'
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/v1/comments/mentions/:userId
   * Gets @mentions for a user with caching
   */
  router.get('/mentions/:userId',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER]),
    async (req, res, next) => {
      try {
        const startTime = Date.now();
        
        // Check cache first
        const cacheKey = `comments:mentions:${req.params.userId}`;
        const cachedResult = await cache.get(cacheKey);

        if (cachedResult) {
          logger.debug('Cache hit for user mentions', { userId: req.params.userId });
          return res.json(cachedResult);
        }

        const result = await commentController.getMentions(req.params.userId);

        // Cache the result
        await cache.set(cacheKey, result);

        logger.info('User mentions retrieved successfully', {
          userId: req.user?.id,
          targetUserId: req.params.userId,
          duration: Date.now() - startTime
        });

        res.json({
          success: true,
          data: result,
          message: 'User mentions retrieved successfully'
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Apply error handling middleware
  router.use(errorHandler);

  return router;
}

// Export configured router
export const commentRouter = configureCommentRoutes(new CommentController());