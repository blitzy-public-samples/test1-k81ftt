import { IFile } from '../interfaces/IFile';
import { storageConfig } from '../config/storage.config';
import * as crypto from 'crypto'; // v20.0.0
import * as path from 'path'; // v20.0.0
import * as mime from 'mime-types'; // v2.1.35
import * as zlib from 'zlib'; // v20.0.0

// Constants for encryption and compression
const ENCRYPTION_ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const COMPRESSION_LEVEL = 6;

/**
 * Validates file against size, type restrictions, and performs security checks
 * @param file - Express Multer file object to validate
 * @throws Error if validation fails
 */
export async function validateFile(file: Express.Multer.File): Promise<boolean> {
    if (!file || !file.buffer) {
        throw new Error('Invalid file: File or file content is missing');
    }

    // Size validation
    if (file.size > storageConfig.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${storageConfig.maxFileSize / (1024 * 1024)}MB`);
    }

    // Deep MIME type inspection
    const detectedMimeType = mime.lookup(file.originalname);
    if (!detectedMimeType) {
        throw new Error('Unable to determine file type');
    }

    // Validate against allowed file types
    if (!storageConfig.allowedFileTypes.includes(detectedMimeType)) {
        throw new Error('File type not allowed');
    }

    // Validate file content matches extension
    const contentType = file.mimetype;
    if (contentType !== detectedMimeType) {
        throw new Error('File content does not match extension');
    }

    // Generate and store checksum for integrity verification
    const checksum = await generateChecksum(file.buffer);
    if (!checksum) {
        throw new Error('Failed to generate file checksum');
    }

    // Perform basic virus scan check (implementation would integrate with actual virus scanning service)
    await performVirusScan(file.buffer);

    return true;
}

/**
 * Generates a unique file name with timestamp and hash
 * @param originalName - Original file name
 * @returns Generated unique file name
 */
export function generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const sanitizedName = path.basename(originalName, extension)
        .replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase();

    return `${sanitizedName}-${timestamp}-${randomBytes}${extension}`;
}

/**
 * Encrypts file content using AES-256-GCM with compression
 * @param buffer - File content buffer
 * @param key - Encryption key
 * @returns Encrypted data with IV and authentication tag
 */
export async function encryptFile(
    buffer: Buffer,
    key: string
): Promise<{ encryptedData: Buffer; iv: Buffer; authTag: Buffer }> {
    try {
        // Compress the data first
        const compressedData = await compressFile(buffer);

        // Generate a random IV
        const iv = crypto.randomBytes(IV_LENGTH);

        // Create cipher with AES-256-GCM
        const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(key), iv);

        // Encrypt the compressed data
        const encryptedData = Buffer.concat([
            cipher.update(compressedData),
            cipher.final()
        ]);

        // Get the auth tag
        const authTag = cipher.getAuthTag();

        return {
            encryptedData,
            iv,
            authTag
        };
    } catch (error) {
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generates SHA-256 checksum for file integrity verification
 * @param buffer - File content buffer
 * @returns SHA-256 checksum of file content
 */
export function generateChecksum(buffer: Buffer): string {
    return crypto
        .createHash('sha256')
        .update(buffer)
        .digest('hex');
}

/**
 * Compresses file data using zlib
 * @param buffer - File content buffer
 * @returns Compressed file content
 */
async function compressFile(buffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        zlib.deflate(buffer, { level: COMPRESSION_LEVEL }, (err, result) => {
            if (err) {
                reject(new Error(`Compression failed: ${err.message}`));
            } else {
                resolve(result);
            }
        });
    });
}

/**
 * Performs virus scan on file content
 * @param buffer - File content buffer
 * @throws Error if virus is detected or scan fails
 */
async function performVirusScan(buffer: Buffer): Promise<void> {
    // This is a placeholder for actual virus scanning implementation
    // In production, this would integrate with a virus scanning service
    return new Promise((resolve, reject) => {
        // Simulate async virus scan
        setTimeout(() => {
            // Implement actual virus scanning logic here
            const isMalicious = false; // This would be the result from actual scan
            if (isMalicious) {
                reject(new Error('Malicious file detected'));
            } else {
                resolve();
            }
        }, 100);
    });
}

/**
 * Type guard to check if an object conforms to IFile interface
 * @param obj - Object to check
 * @returns Boolean indicating if object is IFile
 */
export function isIFile(obj: any): obj is IFile {
    return (
        obj &&
        typeof obj.mimeType === 'string' &&
        typeof obj.size === 'number' &&
        typeof obj.name === 'string'
    );
}