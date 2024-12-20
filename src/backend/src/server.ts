/**
 * Main server application entry point
 * Implements comprehensive security controls, performance optimization,
 * real-time WebSocket functionality, and robust error handling.
 * 
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import morgan from 'morgan'; // ^1.10.0
import winston from 'winston'; // ^3.8.0
import cors from 'cors'; // ^2.8.5
import promClient from 'prom-client'; // ^14.0.1
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

// Internal imports
import router from './api/routes';
import { config } from './config';
import { WebSocketManager } from './realtime/WebSocketManager';
import { logger } from './utils/logger.util';
import { errorHandler, notFoundHandler } from './api/middlewares/error.middleware';
import { loggingMiddleware } from './api/middlewares/logging.middleware';
import { rateLimiter } from './api/middlewares/rateLimiter.middleware';

// Global constants
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10);

/**
 * Initializes Express application with comprehensive middleware chain
 * and security controls
 */
async function initializeServer(): Promise<Express> {
  const app = express();

  // Initialize metrics collection
  const collectDefaultMetrics = promClient.collectDefaultMetrics;
  collectDefaultMetrics({ prefix: 'task_management_' });

  // Basic security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:'],
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
  app.use(cors(config.corsOptions));

  // Request compression
  app.use(compression());

  // Request correlation ID
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.id = req.headers['x-request-id'] as string || uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Logging middleware
  app.use(loggingMiddleware);
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

  // Body parsing middleware with size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Rate limiting
  app.use(rateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
    enableCircuitBreaker: true,
    enableMetrics: true,
    enableCaching: true
  }));

  // Metrics endpoint
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', promClient.register.contentType);
      res.end(await promClient.register.metrics());
    } catch (error) {
      res.status(500).end(error);
    }
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    });
  });

  // API routes
  app.use('/api', router);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Starts the HTTP and WebSocket servers with graceful shutdown handling
 */
async function startServer(): Promise<void> {
  try {
    // Validate configurations
    await config.validateConfigurations();

    // Initialize Express app
    const app = await initializeServer();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server started in ${NODE_ENV} mode on port ${PORT}`);
    });

    // Initialize WebSocket server
    const wsManager = new WebSocketManager();
    await wsManager.initialize(server);

    // Graceful shutdown handling
    const shutdown = async () => {
      logger.info('Shutting down server...');

      // Stop accepting new connections
      server.close(async () => {
        try {
          // Gracefully close WebSocket connections
          await wsManager.gracefulShutdown();
          
          // Close database connections and other resources
          // await db.disconnect();
          
          logger.info('Server shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT);
    };

    // Register shutdown handlers
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception:', error);
      shutdown();
    });

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled rejection:', reason);
      shutdown();
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export { initializeServer, startServer };