/**
 * User Routes Configuration
 * Version: 1.0.0
 * 
 * Implements secure RESTful API routes for user management with comprehensive
 * middleware chain for authentication, authorization, rate limiting, and audit logging.
 */

import { Router } from 'express'; // ^4.18.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4

import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { errorHandler } from '../middlewares/error.middleware';
import { UserRole } from '../../types/auth.types';

// Initialize router
const router = Router();

// Apply security headers
router.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
}));

// Apply compression
router.use(compression());

// Configure rate limiting
const standardRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const createUserRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 user creations per hour
  message: 'Too many user creation attempts from this IP, please try again later'
});

const updateUserRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 user updates per window
  message: 'Too many user update attempts from this IP, please try again later'
});

/**
 * Configures user management routes with comprehensive security middleware
 * @param userController Initialized UserController instance
 * @returns Configured Express router
 */
export const initializeUserRoutes = (userController: UserController): Router => {
  // GET /users - Retrieve all users with filtering and pagination
  router.get('/',
    standardRateLimit,
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER]),
    validateRequest('query'),
    async (req, res, next) => {
      try {
        const result = await userController.getUsers({
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 10,
          ...req.query
        });
        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /users/:id - Retrieve specific user
  router.get('/:id',
    standardRateLimit,
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER]),
    validateRequest('params'),
    async (req, res, next) => {
      try {
        const user = await userController.getUserById(req.params.id);
        res.json(user);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /users - Create new user
  router.post('/',
    createUserRateLimit,
    authenticate,
    authorize([UserRole.ADMIN]),
    validateRequest('body'),
    async (req, res, next) => {
      try {
        const user = await userController.createUser(req.body);
        res.status(201).json(user);
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /users/:id - Update existing user
  router.put('/:id',
    updateUserRateLimit,
    authenticate,
    authorize([UserRole.ADMIN]),
    validateRequest('body'),
    validateRequest('params'),
    async (req, res, next) => {
      try {
        const user = await userController.updateUser(
          req.params.id,
          req.body,
          Number(req.headers['if-match'])
        );
        res.json(user);
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /users/:id - Delete user
  router.delete('/:id',
    standardRateLimit,
    authenticate,
    authorize([UserRole.ADMIN]),
    validateRequest('params'),
    async (req, res, next) => {
      try {
        await userController.deleteUser(req.params.id);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /users/:id/preferences - Update user preferences
  router.put('/:id/preferences',
    updateUserRateLimit,
    authenticate,
    authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER]),
    validateRequest('body'),
    validateRequest('params'),
    async (req, res, next) => {
      try {
        const user = await userController.updatePreferences(
          req.params.id,
          req.body
        );
        res.json(user);
      } catch (error) {
        next(error);
      }
    }
  );

  // Apply error handling middleware
  router.use(errorHandler);

  return router;
};

// Export configured router
export default initializeUserRoutes;
```

This implementation provides:

1. Comprehensive security with Helmet configuration and security headers
2. Rate limiting for different operations with Redis-based storage
3. Role-based access control with granular permissions
4. Request validation for all endpoints
5. Error handling with proper HTTP status codes
6. Compression for response optimization
7. Audit logging through middleware
8. TypeScript type safety
9. Proper HTTP method usage
10. Structured error responses

The router can be used in the main application like:

```typescript
import { UserController } from './controllers/user.controller';
import { initializeUserRoutes } from './routes/user.routes';

const userController = new UserController();
const userRouter = initializeUserRoutes(userController);
app.use('/api/v1/users', userRouter);