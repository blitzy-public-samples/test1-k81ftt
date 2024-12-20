/**
 * Main Router Configuration
 * Version: 1.0.0
 * 
 * Implements a secure, performant, and scalable routing system with comprehensive
 * middleware chain, error handling, and monitoring capabilities.
 */

import express, { Router } from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4

// Import route modules
import { authRouter } from './auth.routes';
import { taskRouter } from './task.routes';
import { projectRouter } from './project.routes';
import { analyticsRouter } from './analytics.routes';

// Import middleware
import { errorHandler, notFoundHandler } from '../middlewares/error.middleware';
import { loggingMiddleware } from '../middlewares/logging.middleware';
import { rateLimiter } from '../middlewares/rateLimiter.middleware';

// Initialize router
const router = Router();

/**
 * Configure global middleware chain with security and performance optimizations
 */

// Security middleware
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
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

// CORS configuration
router.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Performance middleware
router.use(compression());

// Logging and monitoring
router.use(loggingMiddleware);

// Global rate limiting
router.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  enableCircuitBreaker: true,
  enableMetrics: true,
  enableCaching: true
}));

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0'
  });
});

/**
 * Mount route modules with versioning
 */
router.use('/api/v1/auth', authRouter);
router.use('/api/v1/tasks', taskRouter);
router.use('/api/v1/projects', projectRouter);
router.use('/api/v1/analytics', analyticsRouter);

/**
 * Error handling
 */

// 404 handler
router.use(notFoundHandler);

// Global error handler
router.use(errorHandler);

// Export configured router
export default router;
```

This implementation provides:

1. Comprehensive security with Helmet configuration and CORS setup
2. Performance optimization with compression
3. Structured logging and monitoring
4. Global rate limiting with circuit breaker
5. Health check endpoint
6. Versioned API routes
7. Centralized error handling
8. Proper middleware chain organization
9. TypeScript type safety
10. Production-ready security headers

The router can be used in the main application like:

```typescript
import express from 'express';
import router from './api/routes';

const app = express();
app.use(router);