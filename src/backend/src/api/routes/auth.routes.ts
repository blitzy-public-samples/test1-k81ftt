/**
 * Authentication Routes Configuration
 * Version: 1.0.0
 * 
 * Implements secure authentication routes with enterprise-grade features including:
 * - Multi-factor authentication
 * - Distributed rate limiting
 * - Request validation
 * - Security headers
 * - Audit logging
 */

import { Router } from 'express'; // ^4.18.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { RedisStore } from 'rate-limit-redis'; // ^3.0.0
import helmet from 'helmet'; // ^6.0.0

// Internal imports
import { AuthController } from '../controllers/auth.controller';
import {
  validateLoginRequest,
  validateRegisterRequest,
  validateRefreshTokenRequest,
  validateMfaVerificationRequest
} from '../validators/auth.validator';
import { authenticate } from '../../middleware/auth.middleware';

// Initialize router with security defaults
const router = Router();

// Apply security headers
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
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

// Configure rate limiters with Redis store
const loginRateLimiter = rateLimit({
  store: new RedisStore({
    // Redis client should be injected from a connection pool
    client: global.redisClient,
    prefix: 'rl:login:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

const registerRateLimiter = rateLimit({
  store: new RedisStore({
    client: global.redisClient,
    prefix: 'rl:register:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many registration attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

const mfaRateLimiter = rateLimit({
  store: new RedisStore({
    client: global.redisClient,
    prefix: 'rl:mfa:'
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 MFA attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many MFA attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Initialize controller
const authController = new AuthController();

/**
 * Authentication Routes
 */

// Login endpoint with rate limiting and validation
router.post('/login',
  loginRateLimiter,
  validateLoginRequest,
  authController.login
);

// Registration endpoint with enhanced validation
router.post('/register',
  registerRateLimiter,
  validateRegisterRequest,
  authController.register
);

// MFA verification with rate limiting
router.post('/verify-mfa',
  mfaRateLimiter,
  validateMfaVerificationRequest,
  authController.verifyMFA
);

// Token refresh with validation
router.post('/refresh-token',
  validateRefreshTokenRequest,
  authController.refreshToken
);

// Secure logout requiring authentication
router.post('/logout',
  authenticate,
  authController.logout
);

// Health check endpoint
router.get('/health',
  authController.healthCheck
);

// Error handling middleware
router.use((err: Error, req: any, res: any, next: any) => {
  console.error(`Auth Route Error: ${err.message}`);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

export const authRouter = router;