import { Request, Response } from 'express'; // v4.18.2
import multer from 'multer'; // v1.4.5-lts.1
import compression from 'compression'; // v1.7.4
import helmet from 'helmet'; // v7.0.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import { validate } from 'class-validator'; // v0.14.0

import { IFile, AllowedFileTypes, MAX_FILE_SIZE } from '../../interfaces/IFile';
import { FileService } from '../../core/services/FileService';
import { UUID } from '../../types/common.types';
import { storageConfig } from '../../config/storage.config';

/**
 * Configure multer for memory storage and file filtering
 */
const multerStorage = multer.memoryStorage();
const multerUpload = multer({
  storage: multerStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (Object.values(AllowedFileTypes).includes(file.mimetype as AllowedFileTypes)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${Object.values(AllowedFileTypes).join(', ')}`));
    }
  }
});

/**
 * Rate limiter configuration for file operations
 */
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many file upload requests from this IP, please try again later'
});

const downloadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many file download requests from this IP, please try again later'
});

/**
 * Controller handling file operations with enhanced security features
 */
export class FileController {
  private readonly fileService: FileService;

  constructor(fileService: FileService) {
    this.fileService = fileService;
  }

  /**
   * Handles file upload with comprehensive validation and security checks
   * @param req Express request object
   * @param res Express response object
   */
  async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const taskId = req.body.taskId as UUID;
      const userId = req.user?.id as UUID;

      if (!taskId || !userId) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const uploadedFile = await this.fileService.uploadFile(req.file, taskId, userId);

      res.status(201).json({
        message: 'File uploaded successfully',
        file: uploadedFile
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Handles secure file download with access control
   * @param req Express request object
   * @param res Express response object
   */
  async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.id as UUID;
      const userId = req.user?.id as UUID;

      if (!fileId || !userId) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const { buffer, metadata } = await this.fileService.downloadFile(fileId, userId);

      // Set security headers
      res.set({
        'Content-Type': metadata.mimeType,
        'Content-Disposition': `attachment; filename="${metadata.originalName}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.send(buffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Deletes a file with security checks
   * @param req Express request object
   * @param res Express response object
   */
  async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.id as UUID;
      const userId = req.user?.id as UUID;

      if (!fileId || !userId) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const deleted = await this.fileService.delete(fileId);

      if (deleted) {
        res.status(200).json({ message: 'File deleted successfully' });
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Retrieves file metadata by ID
   * @param req Express request object
   * @param res Express response object
   */
  async getFileById(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.id as UUID;
      const userId = req.user?.id as UUID;

      if (!fileId || !userId) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const file = await this.fileService.findById(fileId);
      res.status(200).json(file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  }

  /**
   * Retrieves paginated list of files
   * @param req Express request object
   * @param res Express response object
   */
  async getAllFiles(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.fileService.findAll({
        pagination: { page, limit },
        sort: [{ field: 'createdAt', order: 'DESC' }]
      });

      res.status(200).json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  }
}

/**
 * Express middleware configuration for the file controller
 */
export const fileControllerMiddleware = {
  upload: [
    helmet(),
    compression(),
    uploadRateLimit,
    multerUpload.single('file')
  ],
  download: [
    helmet(),
    compression(),
    downloadRateLimit
  ],
  common: [
    helmet(),
    compression()
  ]
};