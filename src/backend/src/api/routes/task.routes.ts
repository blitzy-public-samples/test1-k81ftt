/**
 * Task Routes Configuration
 * Version: 1.0.0
 * 
 * Implements secure, validated, and monitored API endpoints for task management
 * with comprehensive middleware chains and real-time updates.
 */

import { Router } from 'express'; // ^4.18.0
import rateLimit from 'express-rate-limit'; // ^6.0.0

import { TaskController } from '../controllers/task.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { 
  validateCreateTask, 
  validateUpdateTask, 
  validateTaskId 
} from '../validators/task.validator';
import { UserRole } from '../../types/auth.types';

// Configure rate limiting for task endpoints
const taskRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Task-specific rate limits
const createTaskLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 task creations per hour
  message: 'Task creation limit exceeded, please try again later'
});

const updateTaskLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 task updates per hour
  message: 'Task update limit exceeded, please try again later'
});

/**
 * Initializes and configures task routes with comprehensive security
 * and validation middleware chains
 * 
 * @param taskController Initialized TaskController instance
 * @returns Configured Express router
 */
export const initializeTaskRoutes = (taskController: TaskController): Router => {
  const router = Router();

  // GET /tasks - Retrieve tasks with filtering and pagination
  router.get('/tasks',
    taskRateLimiter,
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER]),
    async (req, res, next) => {
      try {
        await taskController.getTasks(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /tasks/:id - Retrieve specific task by ID
  router.get('/tasks/:id',
    taskRateLimiter,
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER]),
    validateTaskId,
    async (req, res, next) => {
      try {
        await taskController.getTaskById(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /tasks - Create new task
  router.post('/tasks',
    createTaskLimiter,
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER]),
    validateCreateTask,
    async (req, res, next) => {
      try {
        await taskController.createTask(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /tasks/:id - Update existing task
  router.put('/tasks/:id',
    updateTaskLimiter,
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER]),
    validateTaskId,
    validateUpdateTask,
    async (req, res, next) => {
      try {
        await taskController.updateTask(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /tasks/:id - Delete task
  router.delete('/tasks/:id',
    taskRateLimiter,
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER]),
    validateTaskId,
    async (req, res, next) => {
      try {
        await taskController.deleteTask(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};

// Export configured router
export default initializeTaskRoutes;