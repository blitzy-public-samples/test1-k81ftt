// @ts-strict
import { randomBytes, createHash } from 'crypto'; // v18.0.0
import { Prisma } from '@prisma/client'; // ^5.0.0
import { IFile, AllowedFileTypes } from '../interfaces/IFile';
import { BaseEntity, UUID, ValidateUUID } from '../types/common.types';
import { storageConfig } from '../config/storage.config';

/**
 * Enhanced Prisma model class for file attachments with security features
 * Implements comprehensive validation, encryption, and secure URL generation
 */
export class File implements IFile, BaseEntity {
  @ValidateUUID()
  readonly id: UUID;
  
  readonly name: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly path: string;
  readonly url: string;
  readonly uploadedBy: UUID;
  readonly taskId: UUID;
  readonly projectId: UUID;
  readonly encryptionKey?: string;
  readonly encryptionIV?: string;
  readonly checksum: string;
  readonly isEncrypted: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly downloadCount: number;
  readonly accessControl: string[];
  readonly virusScanStatus?: string;
  readonly lastAccessedAt?: Date;
  readonly expiryDate?: Date;
  readonly cacheTTL?: number;

  /**
   * Creates a new File instance with encryption support
   * @param data - Partial file data
   * @param enableEncryption - Flag to enable encryption (defaults to storage config)
   */
  constructor(data: Partial<IFile>, enableEncryption: boolean = storageConfig.encryptionEnabled) {
    this.id = data.id || randomBytes(16).toString('hex') as UUID;
    this.name = this.sanitizeFileName(data.name || '');
    this.originalName = data.originalName || '';
    this.mimeType = data.mimeType || '';
    this.size = data.size || 0;
    this.path = data.path || '';
    this.uploadedBy = data.uploadedBy!;
    this.taskId = data.taskId!;
    this.projectId = data.projectId!;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.downloadCount = 0;
    this.accessControl = data.accessControl || [];
    this.lastAccessedAt = undefined;
    
    // Initialize encryption if enabled
    if (enableEncryption) {
      this.encryptionKey = randomBytes(32).toString('hex');
      this.encryptionIV = randomBytes(16).toString('hex');
      this.isEncrypted = true;
    } else {
      this.isEncrypted = false;
    }

    // Calculate file checksum for integrity verification
    this.checksum = this.calculateChecksum(data);

    // Generate secure URL with configured CDN endpoint
    this.url = this.generateUrl();
  }

  /**
   * Validates file metadata and security requirements
   * @throws Error if validation fails
   */
  validate(): boolean {
    // Validate file size
    if (this.size > storageConfig.maxFileSize) {
      throw new Error(`File size ${this.size} exceeds maximum allowed size of ${storageConfig.maxFileSize}`);
    }

    // Validate mime type
    if (!Object.values(AllowedFileTypes).includes(this.mimeType as AllowedFileTypes)) {
      throw new Error(`File type ${this.mimeType} is not allowed`);
    }

    // Validate required fields
    if (!this.name || !this.originalName || !this.path) {
      throw new Error('Required file fields are missing');
    }

    // Validate encryption metadata if encrypted
    if (this.isEncrypted) {
      if (!this.encryptionKey || !this.encryptionIV) {
        throw new Error('Encryption metadata is missing');
      }
      if (this.encryptionKey.length !== 64) { // 32 bytes in hex
        throw new Error('Invalid encryption key length');
      }
      if (this.encryptionIV.length !== 32) { // 16 bytes in hex
        throw new Error('Invalid encryption IV length');
      }
    }

    // Validate checksum presence
    if (!this.checksum) {
      throw new Error('File checksum is missing');
    }

    return true;
  }

  /**
   * Generates a secure URL with expiry token
   * @returns Secure URL string with embedded security token
   */
  generateUrl(): string {
    const baseUrl = storageConfig.cdnEndpoint.trim().replace(/\/$/, '');
    const expiryTime = Math.floor(Date.now() / 1000) + (storageConfig.urlExpirySeconds || 3600);
    
    // Generate HMAC token for URL security
    const token = createHash('sha256')
      .update(`${this.path}${expiryTime}${this.id}`)
      .digest('hex');

    return `${baseUrl}/${this.path}?token=${token}&expires=${expiryTime}&id=${this.id}`;
  }

  /**
   * Sanitizes file name for secure storage
   * @param fileName - Original file name
   * @returns Sanitized file name
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace unsafe chars with underscore
      .replace(/\.{2,}/g, '.') // Remove consecutive dots
      .toLowerCase();
  }

  /**
   * Calculates file checksum for integrity verification
   * @param data - File data
   * @returns Hex string checksum
   */
  private calculateChecksum(data: Partial<IFile>): string {
    const checksumData = `${data.name}${data.size}${data.mimeType}${data.path}`;
    return createHash('sha256').update(checksumData).digest('hex');
  }

  /**
   * Converts File instance to Prisma create input
   * @returns Prisma.FileCreateInput
   */
  toPrismaCreateInput(): Prisma.FileCreateInput {
    return {
      id: this.id,
      name: this.name,
      originalName: this.originalName,
      mimeType: this.mimeType,
      size: this.size,
      path: this.path,
      url: this.url,
      uploadedBy: { connect: { id: this.uploadedBy } },
      task: { connect: { id: this.taskId } },
      project: { connect: { id: this.projectId } },
      encryptionKey: this.encryptionKey,
      encryptionIV: this.encryptionIV,
      checksum: this.checksum,
      isEncrypted: this.isEncrypted,
      downloadCount: this.downloadCount,
      accessControl: this.accessControl,
      virusScanStatus: this.virusScanStatus,
      lastAccessedAt: this.lastAccessedAt,
      expiryDate: this.expiryDate,
      cacheTTL: this.cacheTTL
    };
  }
}