import { BaseEntity, UUID } from '../types/common.types';

/**
 * Enum defining allowed file types with their corresponding MIME types
 * Based on system requirements for file attachment support
 */
export enum AllowedFileTypes {
  PDF = 'application/pdf',
  DOC = 'application/msword',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  JPG = 'image/jpeg',
  PNG = 'image/png'
}

/**
 * Maximum file size constant (25MB) as specified in form validation rules
 */
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

/**
 * Interface defining the structure and properties of file attachments
 * Implements security features including encryption, access control, and monitoring
 * Extends BaseEntity for common fields (id, createdAt, updatedAt)
 */
export interface IFile extends BaseEntity {
  // Basic file properties
  name: string;                      // Sanitized file name for storage
  originalName: string;              // Original file name as uploaded
  mimeType: string;                  // File MIME type (must match AllowedFileTypes)
  size: number;                      // File size in bytes (max: MAX_FILE_SIZE)
  path: string;                      // Storage path on server/cloud
  url: string;                       // Public URL for file access

  // Relationship identifiers
  uploadedBy: UUID;                  // User ID who uploaded the file
  taskId: UUID;                      // Associated task ID
  projectId: UUID;                   // Associated project ID

  // Security and encryption properties
  encryptionKey?: string;            // AES-256 encryption key (if encrypted)
  encryptionIV?: string;             // Initialization vector for encryption
  checksum: string;                  // File integrity checksum
  isEncrypted: boolean;              // Indicates if file is encrypted
  contentEncoding?: string;          // Content encoding type if applicable
  
  // Lifecycle management
  expiryDate?: Date;                 // Optional file expiration date
  retentionPolicy?: string;          // Data retention policy identifier
  cacheTTL?: number;                 // Cache time-to-live in seconds
  
  // Storage optimization
  compressionType?: string;          // Compression algorithm used if any
  
  // Access control and monitoring
  accessControl: string[];           // Array of role/user IDs with access
  virusScanStatus?: string;          // Status of virus scan
  lastAccessedAt?: Date;             // Last access timestamp
  downloadCount: number;             // Number of downloads
}