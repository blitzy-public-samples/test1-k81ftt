/**
 * @fileoverview Storage utility functions for browser storage operations
 * Provides type-safe, encrypted storage capabilities with error handling
 * @version 1.0.0
 */

import CryptoJS from 'crypto-js'; // v4.1.1
import { ErrorResponse } from '../types/common.types';

// Encryption key from environment variable or secure configuration
const STORAGE_ENCRYPTION_KEY = process.env.REACT_APP_STORAGE_ENCRYPTION_KEY || 'default-key';

// Storage operation error codes
export const StorageErrorCodes = {
  INVALID_KEY: 'STORAGE_001',
  STORAGE_UNAVAILABLE: 'STORAGE_002',
  QUOTA_EXCEEDED: 'STORAGE_003',
  PARSE_ERROR: 'STORAGE_004',
  ENCRYPTION_ERROR: 'STORAGE_005',
  DECRYPTION_ERROR: 'STORAGE_006',
} as const;

/**
 * Custom error class for storage operations
 * Extends Error with additional context for storage-specific errors
 */
export class StorageError extends Error implements ErrorResponse {
  public readonly code: string;
  public readonly details: Record<string, unknown>;
  public readonly correlationId: string;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.details = details || {};
    this.correlationId = crypto.randomUUID();
  }
}

/**
 * Type guard for storage operation results
 * @param value - Value to check
 * @returns True if value is a StorageError
 */
export function isStorageError(value: unknown): value is StorageError {
  return value instanceof StorageError;
}

/**
 * Validates storage key format and constraints
 * @param key - Storage key to validate
 * @throws StorageError if key is invalid
 */
export function validateStorageKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    throw new StorageError(
      StorageErrorCodes.INVALID_KEY,
      'Storage key must be a non-empty string'
    );
  }

  if (key.length > 100) {
    throw new StorageError(
      StorageErrorCodes.INVALID_KEY,
      'Storage key must not exceed 100 characters'
    );
  }

  const validKeyRegex = /^[a-zA-Z0-9_.-]+$/;
  if (!validKeyRegex.test(key)) {
    throw new StorageError(
      StorageErrorCodes.INVALID_KEY,
      'Storage key contains invalid characters'
    );
  }

  return true;
}

/**
 * Checks if browser storage is available and has sufficient space
 * @param type - Storage type to check (localStorage or sessionStorage)
 * @returns True if storage is available and has space
 * @throws StorageError if storage is unavailable
 */
export function checkStorageAvailability(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type];
    const testKey = `__storage_test__${Math.random()}`;
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    throw new StorageError(
      StorageErrorCodes.STORAGE_UNAVAILABLE,
      `${type} is not available`,
      { originalError: error }
    );
  }
}

/**
 * Encrypts data using AES encryption
 * @param data - Data to encrypt
 * @returns Encrypted data string
 * @throws StorageError if encryption fails
 */
function encryptData(data: string): string {
  try {
    return CryptoJS.AES.encrypt(data, STORAGE_ENCRYPTION_KEY).toString();
  } catch (error) {
    throw new StorageError(
      StorageErrorCodes.ENCRYPTION_ERROR,
      'Failed to encrypt data',
      { originalError: error }
    );
  }
}

/**
 * Decrypts AES encrypted data
 * @param encryptedData - Data to decrypt
 * @returns Decrypted data string
 * @throws StorageError if decryption fails
 */
function decryptData(encryptedData: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, STORAGE_ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    throw new StorageError(
      StorageErrorCodes.DECRYPTION_ERROR,
      'Failed to decrypt data',
      { originalError: error }
    );
  }
}

/**
 * Sets an item in localStorage with optional encryption
 * @param key - Storage key
 * @param value - Value to store
 * @param encrypt - Whether to encrypt the data
 * @throws StorageError if operation fails
 */
export function setLocalStorageItem<T>(
  key: string,
  value: T,
  encrypt: boolean = false
): void {
  validateStorageKey(key);
  checkStorageAvailability('localStorage');

  try {
    let dataToStore = JSON.stringify(value);
    if (encrypt) {
      dataToStore = encryptData(dataToStore);
    }

    localStorage.setItem(key, dataToStore);
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new StorageError(
        StorageErrorCodes.QUOTA_EXCEEDED,
        'Storage quota exceeded',
        { originalError: error }
      );
    }

    throw new StorageError(
      StorageErrorCodes.PARSE_ERROR,
      'Failed to store data',
      { originalError: error }
    );
  }
}

/**
 * Gets an item from localStorage with optional decryption
 * @param key - Storage key
 * @param encrypted - Whether the data is encrypted
 * @returns Parsed value or null if not found
 * @throws StorageError if operation fails
 */
export function getLocalStorageItem<T>(
  key: string,
  encrypted: boolean = false
): T | null {
  validateStorageKey(key);
  checkStorageAvailability('localStorage');

  try {
    const storedValue = localStorage.getItem(key);
    if (!storedValue) {
      return null;
    }

    let parsedValue = storedValue;
    if (encrypted) {
      parsedValue = decryptData(storedValue);
    }

    return JSON.parse(parsedValue) as T;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }

    throw new StorageError(
      StorageErrorCodes.PARSE_ERROR,
      'Failed to retrieve or parse stored data',
      { originalError: error }
    );
  }
}

/**
 * Removes an item from localStorage
 * @param key - Storage key
 * @throws StorageError if operation fails
 */
export function removeLocalStorageItem(key: string): void {
  validateStorageKey(key);
  checkStorageAvailability('localStorage');

  try {
    localStorage.removeItem(key);
  } catch (error) {
    throw new StorageError(
      StorageErrorCodes.STORAGE_UNAVAILABLE,
      'Failed to remove item from storage',
      { originalError: error }
    );
  }
}

/**
 * Clears all items from localStorage
 * @throws StorageError if operation fails
 */
export function clearLocalStorage(): void {
  checkStorageAvailability('localStorage');

  try {
    localStorage.clear();
  } catch (error) {
    throw new StorageError(
      StorageErrorCodes.STORAGE_UNAVAILABLE,
      'Failed to clear storage',
      { originalError: error }
    );
  }
}