/**
 * @fileoverview Enterprise-grade storage service providing secure, type-safe storage operations
 * with encryption, quota management, and error handling capabilities.
 * @version 1.0.0
 */

import CryptoJS from 'crypto-js'; // v4.1.1
import { ErrorResponse } from '../types/common.types';
import {
  setLocalStorageItem,
  getLocalStorageItem,
  removeLocalStorageItem,
  setSessionStorageItem,
  getSessionStorageItem,
  removeSessionStorageItem,
  clearStorage,
  StorageError,
  StorageErrorCodes,
} from '../utils/storage.utils';

/**
 * Configuration for storage quota management
 */
interface StorageQuota {
  maxSize: number;
  warningThreshold: number;
  cleanupThreshold: number;
}

/**
 * Configuration for retry mechanism
 */
interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffFactor: number;
}

/**
 * Options for storage operations
 */
interface StorageOptions {
  encrypt?: boolean;
  expiresIn?: number;
  namespace?: string;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Metadata stored with each item
 */
interface StorageMetadata {
  timestamp: number;
  expiresAt?: number;
  version: string;
  encrypted: boolean;
  keyVersion: string;
  size: number;
  checksum: string;
}

/**
 * Enterprise-grade storage service providing secure storage operations
 * with encryption, quota management, and comprehensive error handling
 */
export class StorageService {
  private static instance: StorageService;
  private encryptionKey: string;
  private readonly keyRotationInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private readonly VERSION = '1.0.0';

  private readonly storageQuota: StorageQuota = {
    maxSize: 5 * 1024 * 1024, // 5MB
    warningThreshold: 0.8, // 80%
    cleanupThreshold: 0.9, // 90%
  };

  private readonly retryConfig: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffFactor: 2,
  };

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.encryptionKey = process.env.REACT_APP_STORAGE_ENCRYPTION_KEY || 
      CryptoJS.lib.WordArray.random(32).toString();
    this.initializeService();
  }

  /**
   * Initialize the storage service
   */
  private initializeService(): void {
    this.setupKeyRotation();
    this.cleanupExpiredItems();
  }

  /**
   * Get singleton instance of StorageService
   */
  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Store data securely with encryption and metadata
   */
  public async setSecureItem<T>(
    key: string,
    value: T,
    options: StorageOptions = {}
  ): Promise<void> {
    try {
      const metadata: StorageMetadata = {
        timestamp: Date.now(),
        version: this.VERSION,
        encrypted: options.encrypt ?? true,
        keyVersion: this.getKeyVersion(),
        size: 0,
        checksum: '',
        ...(options.expiresIn && {
          expiresAt: Date.now() + options.expiresIn,
        }),
      };

      const serializedData = JSON.stringify(value);
      metadata.size = new Blob([serializedData]).size;
      metadata.checksum = this.calculateChecksum(serializedData);

      await this.validateStorageQuota(metadata.size);

      const storageKey = this.buildStorageKey(key, options.namespace);
      const storageValue = {
        data: options.encrypt ? this.encryptData(serializedData) : serializedData,
        metadata,
      };

      await this.retryOperation(() =>
        setLocalStorageItem(storageKey, storageValue, false)
      );
    } catch (error) {
      throw this.handleStorageError(error);
    }
  }

  /**
   * Retrieve and decrypt stored data with validation
   */
  public async getSecureItem<T>(
    key: string,
    options: StorageOptions = {}
  ): Promise<T | null> {
    try {
      const storageKey = this.buildStorageKey(key, options.namespace);
      const result = await this.retryOperation(() =>
        getLocalStorageItem<{
          data: string;
          metadata: StorageMetadata;
        }>(storageKey, false)
      );

      if (!result) {
        return null;
      }

      const { data, metadata } = result;

      if (this.isExpired(metadata)) {
        await this.removeSecureItem(key, options);
        return null;
      }

      const decryptedData = metadata.encrypted
        ? this.decryptData(data)
        : data;

      if (this.calculateChecksum(decryptedData) !== metadata.checksum) {
        throw new StorageError(
          StorageErrorCodes.PARSE_ERROR,
          'Data integrity check failed'
        );
      }

      return JSON.parse(decryptedData);
    } catch (error) {
      throw this.handleStorageError(error);
    }
  }

  /**
   * Remove stored item and its metadata
   */
  public async removeSecureItem(
    key: string,
    options: StorageOptions = {}
  ): Promise<void> {
    try {
      const storageKey = this.buildStorageKey(key, options.namespace);
      await this.retryOperation(() => removeLocalStorageItem(storageKey));
    } catch (error) {
      throw this.handleStorageError(error);
    }
  }

  /**
   * Rotate encryption key and re-encrypt all data
   */
  public async rotateEncryptionKey(): Promise<void> {
    try {
      const newKey = CryptoJS.lib.WordArray.random(32).toString();
      const items = await this.getAllItems();

      for (const [key, value] of items) {
        if (value.metadata.encrypted) {
          const decryptedData = this.decryptData(value.data);
          value.data = this.encryptData(decryptedData, newKey);
          value.metadata.keyVersion = this.generateKeyVersion();
          await setLocalStorageItem(key, value, false);
        }
      }

      this.encryptionKey = newKey;
    } catch (error) {
      throw this.handleStorageError(error);
    }
  }

  /**
   * Validate storage quota and manage space
   */
  public async validateStorageQuota(newItemSize: number): Promise<boolean> {
    try {
      const currentUsage = await this.calculateStorageUsage();
      const availableSpace = this.storageQuota.maxSize - currentUsage;

      if (newItemSize > availableSpace) {
        if (currentUsage / this.storageQuota.maxSize > this.storageQuota.cleanupThreshold) {
          await this.cleanupStorage();
        }
        
        const updatedAvailableSpace = this.storageQuota.maxSize - await this.calculateStorageUsage();
        if (newItemSize > updatedAvailableSpace) {
          throw new StorageError(
            StorageErrorCodes.QUOTA_EXCEEDED,
            'Storage quota exceeded after cleanup'
          );
        }
      }

      return true;
    } catch (error) {
      throw this.handleStorageError(error);
    }
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Encrypt data using current encryption key
   */
  private encryptData(data: string, key: string = this.encryptionKey): string {
    return CryptoJS.AES.encrypt(data, key).toString();
  }

  /**
   * Decrypt data using current encryption key
   */
  private decryptData(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Build storage key with optional namespace
   */
  private buildStorageKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  /**
   * Check if stored item is expired
   */
  private isExpired(metadata: StorageMetadata): boolean {
    return !!metadata.expiresAt && Date.now() > metadata.expiresAt;
  }

  /**
   * Generate new key version identifier
   */
  private generateKeyVersion(): string {
    return `${Date.now()}-${CryptoJS.lib.WordArray.random(8).toString()}`;
  }

  /**
   * Get current key version
   */
  private getKeyVersion(): string {
    return this.generateKeyVersion();
  }

  /**
   * Setup automatic key rotation
   */
  private setupKeyRotation(): void {
    setInterval(() => {
      this.rotateEncryptionKey().catch(console.error);
    }, this.keyRotationInterval);
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => T | Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.retryConfig.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        attempt++;
        if (attempt < this.retryConfig.maxAttempts) {
          await new Promise(resolve =>
            setTimeout(
              resolve,
              this.retryConfig.delayMs * Math.pow(this.retryConfig.backoffFactor, attempt)
            )
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * Handle storage errors with enhanced context
   */
  private handleStorageError(error: unknown): Error {
    if (error instanceof StorageError) {
      return error;
    }

    return new StorageError(
      StorageErrorCodes.STORAGE_UNAVAILABLE,
      'Storage operation failed',
      { originalError: error }
    );
  }

  /**
   * Get all stored items for maintenance operations
   */
  private async getAllItems(): Promise<Map<string, { data: string; metadata: StorageMetadata }>> {
    const items = new Map();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const item = await getLocalStorageItem<{
          data: string;
          metadata: StorageMetadata;
        }>(key, false);
        if (item) {
          items.set(key, item);
        }
      }
    }
    return items;
  }

  /**
   * Calculate current storage usage
   */
  private async calculateStorageUsage(): Promise<number> {
    const items = await this.getAllItems();
    return Array.from(items.values()).reduce(
      (total, item) => total + item.metadata.size,
      0
    );
  }

  /**
   * Clean up storage when approaching quota
   */
  private async cleanupStorage(): Promise<void> {
    const items = await this.getAllItems();
    const sortedItems = Array.from(items.entries()).sort(
      (a, b) => a[1].metadata.timestamp - b[1].metadata.timestamp
    );

    for (const [key] of sortedItems) {
      await removeLocalStorageItem(key);
      const currentUsage = await this.calculateStorageUsage();
      if (currentUsage / this.storageQuota.maxSize < this.storageQuota.warningThreshold) {
        break;
      }
    }
  }

  /**
   * Clean up expired items periodically
   */
  private async cleanupExpiredItems(): Promise<void> {
    const items = await this.getAllItems();
    for (const [key, value] of items) {
      if (this.isExpired(value.metadata)) {
        await removeLocalStorageItem(key);
      }
    }
  }
}