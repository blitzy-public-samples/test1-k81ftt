// @package dotenv ^16.0.0
import { config } from 'dotenv';

// Initialize environment variables
config();

/**
 * Maximum file size allowed for uploads (25MB in bytes)
 */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Allowed MIME types for file uploads
 */
const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
] as const;

/**
 * Flag to enable/disable encryption for stored files
 */
const ENCRYPTION_ENABLED = process.env.STORAGE_ENCRYPTION_ENABLED === 'true';

/**
 * Storage configuration validation error
 */
class StorageConfigurationError extends Error {
    constructor(message: string) {
        super(`Storage Configuration Error: ${message}`);
        this.name = 'StorageConfigurationError';
    }
}

/**
 * Validates the storage configuration settings
 * @throws {StorageConfigurationError} when configuration is invalid
 */
const validateStorageConfig = (): void => {
    // Validate connection string
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
        throw new StorageConfigurationError(
            'Missing AZURE_STORAGE_CONNECTION_STRING. Please set this environment variable.'
        );
    }

    // Validate container name
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'task-attachments';
    if (!/^[a-z0-9](?!.*--)[a-z0-9-]{1,61}[a-z0-9]$/.test(containerName)) {
        throw new StorageConfigurationError(
            'Invalid container name. Must be 3-63 characters, lowercase letters, numbers and hyphens only.'
        );
    }

    // Validate CDN endpoint if provided
    if (process.env.AZURE_STORAGE_CDN_ENDPOINT) {
        try {
            new URL(process.env.AZURE_STORAGE_CDN_ENDPOINT);
        } catch {
            throw new StorageConfigurationError(
                'Invalid CDN endpoint URL format. Please provide a valid HTTPS URL.'
            );
        }
    }

    // Validate encryption settings
    if (ENCRYPTION_ENABLED) {
        if (!process.env.STORAGE_ENCRYPTION_KEY) {
            throw new StorageConfigurationError(
                'Encryption is enabled but STORAGE_ENCRYPTION_KEY is not set.'
            );
        }
        if (process.env.STORAGE_ENCRYPTION_KEY.length < 32) {
            throw new StorageConfigurationError(
                'STORAGE_ENCRYPTION_KEY must be at least 32 characters long for AES-256.'
            );
        }
    }
};

/**
 * Encryption configuration interface
 */
interface EncryptionConfig {
    enabled: boolean;
    algorithm: 'AES-256-CBC';
    key: string;
    ivLength: number;
}

/**
 * Storage configuration object
 */
export const storageConfig = {
    /**
     * Azure Storage connection string
     */
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,

    /**
     * Azure Storage container name
     */
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'task-attachments',

    /**
     * Azure CDN endpoint URL
     */
    cdnEndpoint: process.env.AZURE_STORAGE_CDN_ENDPOINT || '',

    /**
     * Maximum allowed file size in bytes
     */
    maxFileSize: MAX_FILE_SIZE,

    /**
     * Array of allowed file MIME types
     */
    allowedFileTypes: ALLOWED_FILE_TYPES,

    /**
     * Flag indicating if encryption is enabled
     */
    encryptionEnabled: ENCRYPTION_ENABLED,

    /**
     * Encryption configuration settings
     */
    encryptionConfig: {
        enabled: ENCRYPTION_ENABLED,
        algorithm: 'AES-256-CBC' as const,
        key: process.env.STORAGE_ENCRYPTION_KEY || '',
        ivLength: 16
    } as EncryptionConfig,

    /**
     * Validates the current storage configuration
     */
    validate: validateStorageConfig
} as const;

// Validate configuration on module load
validateStorageConfig();

// Export configuration object
export default storageConfig;

// Export individual configuration values for selective imports
export const {
    connectionString,
    containerName,
    cdnEndpoint,
    maxFileSize,
    allowedFileTypes,
    encryptionEnabled,
    encryptionConfig
} = storageConfig;