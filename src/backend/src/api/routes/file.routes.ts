/**
 * File Routes Module
 * Version: 1.0.0
 * 
 * Implements secure file operation endpoints with comprehensive validation,
 * authentication, authorization, and monitoring controls.
 */

import { Router } from 'express'; // v4.18.2
import multer from 'multer'; // v1.4.5-lts.1
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.4.1
import { injectable, inject } from 'inversify'; // v6.0.1
import { monitor } from '../decorators/monitor.decorator';

import { FileController } from '../controllers/file.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateFileUpload } from '../validators/file.validator';
import { UserRole } from '../../types/auth.types';
import { storageConfig } from '../../config/storage.config';

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: storageConfig.maxFileSize,
        files: 1
    }
});

// Configure rate limiters for different operations
const uploadRateLimiter = new RateLimiterMemory({
    points: 100,              // Number of uploads
    duration: 15 * 60,        // Per 15 minutes
    blockDuration: 60 * 60    // Block for 1 hour if exceeded
});

const downloadRateLimiter = new RateLimiterMemory({
    points: 200,              // Number of downloads
    duration: 15 * 60,        // Per 15 minutes
    blockDuration: 30 * 60    // Block for 30 minutes if exceeded
});

@injectable()
export class FileRoutes {
    constructor(
        @inject('FileController') private fileController: FileController
    ) {}

    /**
     * Initializes file routes with comprehensive security controls
     * @returns Configured Express router
     */
    @monitor()
    public initializeRoutes(): Router {
        const router = Router();

        // Apply rate limiting middleware
        const rateLimitUpload = async (req: any, res: any, next: any) => {
            try {
                await uploadRateLimiter.consume(req.ip);
                next();
            } catch {
                res.status(429).json({
                    error: 'Too many upload requests. Please try again later.'
                });
            }
        };

        const rateLimitDownload = async (req: any, res: any, next: any) => {
            try {
                await downloadRateLimiter.consume(req.ip);
                next();
            } catch {
                res.status(429).json({
                    error: 'Too many download requests. Please try again later.'
                });
            }
        };

        // File upload endpoint with enhanced security
        router.post('/upload',
            authenticate,
            authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER]),
            rateLimitUpload,
            upload.single('file'),
            validateFileUpload,
            this.fileController.uploadFile
        );

        // File download endpoint with streaming support
        router.get('/download/:fileId',
            authenticate,
            authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER, UserRole.GUEST]),
            rateLimitDownload,
            this.fileController.downloadFile
        );

        // File deletion endpoint with proper authorization
        router.delete('/:fileId',
            authenticate,
            authorize([UserRole.ADMIN, UserRole.MANAGER]),
            this.fileController.deleteFile
        );

        // Get file metadata endpoint
        router.get('/:fileId',
            authenticate,
            authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER, UserRole.GUEST]),
            this.fileController.getFileById
        );

        // List files endpoint with pagination
        router.get('/',
            authenticate,
            authorize([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER]),
            this.fileController.getAllFiles
        );

        return router;
    }
}

// Export configured router instance
const fileRoutes = new FileRoutes(new FileController(null)).initializeRoutes();
export default fileRoutes;

// Export route initialization for dependency injection
export const initializeFileRoutes = (fileController: FileController): Router => {
    return new FileRoutes(fileController).initializeRoutes();
};