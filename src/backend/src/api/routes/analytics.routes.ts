/**
 * Analytics Routes Configuration
 * Version: 1.0.0
 * 
 * Implements secure and optimized routes for analytics endpoints with comprehensive
 * security controls, rate limiting, caching, and streaming support.
 */

import { Router } from 'express'; // ^4.18.2
import compression from 'compression'; // ^1.7.4
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateAnalyticsQuery } from '../validators/analytics.validator';
import { AnalyticsController } from '../controllers/analytics.controller';
import { UserRole } from '../../types/auth.types';

// Initialize router
const router = Router();

// Apply compression for all analytics routes
router.use(compression());

// Configure rate limits for different endpoints
const standardRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

const reportRateLimit = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 10, // 10 report generations per window
    message: 'Report generation limit exceeded, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

// Apply authentication middleware to all routes
router.use(authenticate);

// Project Analytics Routes
router.get('/projects/:projectId',
    standardRateLimit,
    authorize([UserRole.ADMIN, UserRole.MANAGER]),
    validateAnalyticsQuery,
    AnalyticsController.prototype.getProjectAnalytics
);

// User Analytics Routes
router.get('/users/:userId',
    standardRateLimit,
    authorize([UserRole.ADMIN]),
    validateAnalyticsQuery,
    AnalyticsController.prototype.getUserAnalytics
);

// System Metrics Routes
router.get('/system',
    standardRateLimit,
    authorize([UserRole.ADMIN]),
    validateAnalyticsQuery,
    AnalyticsController.prototype.getSystemMetrics
);

// Report Generation Routes
router.get('/reports',
    reportRateLimit,
    authorize([UserRole.ADMIN, UserRole.MANAGER]),
    validateAnalyticsQuery,
    AnalyticsController.prototype.generateReport
);

// Error handling middleware
router.use((err: Error, req: any, res: any, next: any) => {
    console.error('Analytics Route Error:', err);
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message
        });
    }

    if (err.name === 'AuthorizationError') {
        return res.status(403).json({
            error: 'Authorization Error',
            message: 'Insufficient permissions'
        });
    }

    // Default error response
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
    });
});

export { router as analyticsRoutes };