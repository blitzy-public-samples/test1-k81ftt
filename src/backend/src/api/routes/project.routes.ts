/**
 * @fileoverview Express router configuration for project-related endpoints with
 * comprehensive security, validation, and performance optimizations.
 * @version 1.0.0
 */

import express, { Router } from 'express'; // ^4.18.0
import rateLimit from 'express-rate-limit'; // ^6.0.0
import compression from 'compression'; // ^1.7.4
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateCreateProject, validateUpdateProject } from '../validators/project.validator';
import { ProjectController } from '../controllers/project.controller';
import { UserRole } from '../../types/auth.types';
import { traceRoute, measurePerformance } from '../../utils/monitoring';

// Initialize router
const projectRouter: Router = express.Router();

// Configure rate limiting
const projectRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure route-specific rate limits
const createProjectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit each IP to 30 project creations per hour
  message: 'Too many project creation attempts from this IP, please try again later'
});

const updateProjectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 project updates per hour
  message: 'Too many project update attempts from this IP, please try again later'
});

const deleteProjectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 project deletions per hour
  message: 'Too many project deletion attempts from this IP, please try again later'
});

/**
 * Configure project routes with comprehensive security and performance optimizations
 * @param projectController - Instance of ProjectController
 */
const configureProjectRoutes = (projectController: ProjectController): Router => {
  // Apply global middleware
  projectRouter.use(projectRateLimiter);
  projectRouter.use(compression());
  projectRouter.use(authenticate);

  // GET /projects - Retrieve all projects with filtering and pagination
  projectRouter.get('/',
    traceRoute('get-projects'),
    measurePerformance(),
    authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER], ['read:projects']),
    async (req, res, next) => {
      try {
        const result = await projectController.getProjects(
          Number(req.query.page) || 1,
          Number(req.query.limit) || 10,
          req.query
        );
        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /projects/:id - Retrieve specific project
  projectRouter.get('/:id',
    traceRoute('get-project-by-id'),
    measurePerformance(),
    authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER], ['read:projects']),
    async (req, res, next) => {
      try {
        const project = await projectController.getProjectById(req.params.id);
        res.json(project);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /projects - Create new project
  projectRouter.post('/',
    traceRoute('create-project'),
    measurePerformance(),
    createProjectLimiter,
    authorize([UserRole.ADMIN, UserRole.MANAGER], ['create:projects']),
    validateCreateProject,
    async (req, res, next) => {
      try {
        const project = await projectController.createProject(req.body);
        res.status(201).json(project);
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /projects/:id - Update existing project
  projectRouter.put('/:id',
    traceRoute('update-project'),
    measurePerformance(),
    updateProjectLimiter,
    authorize([UserRole.ADMIN, UserRole.MANAGER], ['update:projects']),
    validateUpdateProject,
    async (req, res, next) => {
      try {
        const project = await projectController.updateProject(
          req.params.id,
          req.body
        );
        res.json(project);
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /projects/:id - Delete project
  projectRouter.delete('/:id',
    traceRoute('delete-project'),
    measurePerformance(),
    deleteProjectLimiter,
    authorize([UserRole.ADMIN], ['delete:projects']),
    async (req, res, next) => {
      try {
        await projectController.deleteProject(req.params.id);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  return projectRouter;
};

// Export configured router
export { projectRouter, configureProjectRoutes };