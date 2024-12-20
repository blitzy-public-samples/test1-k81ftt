/**
 * Central Configuration Module
 * Version: 1.0.0
 * 
 * Aggregates and validates all application configuration settings with:
 * - Enhanced security measures
 * - Environment-specific handling
 * - Runtime validation
 * - Configuration change monitoring
 * - Sensitive data encryption
 */

// External imports
import { config as dotenvConfig } from 'dotenv'; // ^16.0.0
import { EventEmitter } from 'events'; // ^1.0.0
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'; // ^1.0.0

// Internal imports
import { authConfig } from './auth.config';
import { databaseConfig, validateDatabaseConfig } from './database.config';
import { redisConfig, validateRedisConfig } from './redis.config';
import { storageConfig } from './storage.config';
import { loggerConfig } from './logger.config';
import { emailConfig, validateEmailConfig } from './email.config';
import { LogLevel } from '../core/interfaces/ILogger';

// Initialize environment variables
dotenvConfig();

// Environment constants
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const CONFIG_VERSION = process.env.CONFIG_VERSION || '1.0.0';
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * Configuration validation error
 */
class ConfigurationError extends Error {
    constructor(message: string) {
        super(`Configuration Error: ${message}`);
        this.name = 'ConfigurationError';
    }
}

/**
 * Configuration manager class for handling configuration lifecycle
 */
@singleton
class ConfigurationManager {
    private static instance: ConfigurationManager;
    private configChangeEmitter: EventEmitter;
    private configCache: Map<string, any>;
    private encryptionKey: Buffer;

    private constructor() {
        this.configChangeEmitter = new EventEmitter();
        this.configCache = new Map();
        this.encryptionKey = Buffer.from(ENCRYPTION_KEY || '', 'hex');
        this.initializeConfig();
    }

    /**
     * Encrypts sensitive configuration values
     */
    private encryptValue(value: string): string {
        const iv = randomBytes(16);
        const cipher = createCipheriv('aes-256-cbc', this.encryptionKey, iv);
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypts sensitive configuration values
     */
    private decryptValue(value: string): string {
        const [ivHex, encrypted] = value.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    /**
     * Initializes configuration with validation
     */
    private async initializeConfig(): Promise<void> {
        try {
            await this.validateConfigurations();
            this.setupConfigurationWatchers();
        } catch (error) {
            throw new ConfigurationError(`Configuration initialization failed: ${error.message}`);
        }
    }

    /**
     * Sets up watchers for configuration changes
     */
    private setupConfigurationWatchers(): void {
        this.configChangeEmitter.on('configChange', async (key: string) => {
            try {
                await this.reloadConfiguration(key);
            } catch (error) {
                console.error(`Failed to reload configuration for ${key}:`, error);
            }
        });
    }

    /**
     * Reloads specific configuration with validation
     */
    public async reloadConfiguration(configKey: string): Promise<void> {
        this.configCache.delete(configKey);
        await this.validateConfigurations();
        this.configChangeEmitter.emit('configReloaded', configKey);
    }

    /**
     * Validates all configuration settings
     */
    @logConfigValidation
    @measurePerformance
    private async validateConfigurations(): Promise<void> {
        try {
            // Validate database configuration
            await validateDatabaseConfig(databaseConfig);

            // Validate Redis configuration
            const redisValidation = validateRedisConfig(redisConfig.connection);
            if (!redisValidation.isValid) {
                throw new Error(`Redis configuration invalid: ${redisValidation.errors.join(', ')}`);
            }

            // Validate email configuration
            validateEmailConfig(emailConfig);

            // Validate storage configuration
            storageConfig.validate();

            // Cache validated configurations
            this.configCache.set('database', databaseConfig);
            this.configCache.set('redis', redisConfig);
            this.configCache.set('storage', storageConfig);
            this.configCache.set('email', emailConfig);
            this.configCache.set('auth', authConfig);
            this.configCache.set('logger', loggerConfig);

        } catch (error) {
            throw new ConfigurationError(`Configuration validation failed: ${error.message}`);
        }
    }

    /**
     * Gets configuration value with optional decryption
     */
    public getConfig<T>(key: string, decrypt: boolean = false): T {
        const value = this.configCache.get(key);
        if (!value) {
            throw new ConfigurationError(`Configuration not found for key: ${key}`);
        }
        return decrypt ? this.decryptSensitiveData(value) : value;
    }

    /**
     * Decrypts sensitive configuration data
     */
    private decryptSensitiveData<T>(config: T): T {
        if (typeof config !== 'object' || !config) return config;

        const decrypted = { ...config };
        for (const [key, value] of Object.entries(config)) {
            if (this.isSensitiveKey(key) && typeof value === 'string') {
                (decrypted as any)[key] = this.decryptValue(value);
            } else if (typeof value === 'object') {
                (decrypted as any)[key] = this.decryptSensitiveData(value);
            }
        }
        return decrypted;
    }

    /**
     * Checks if a configuration key contains sensitive data
     */
    private isSensitiveKey(key: string): boolean {
        const sensitiveKeys = ['password', 'secret', 'key', 'token'];
        return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive));
    }
}

// Export unified configuration object
export const config = {
    auth: ConfigurationManager.prototype.getConfig('auth'),
    database: ConfigurationManager.prototype.getConfig('database'),
    redis: ConfigurationManager.prototype.getConfig('redis'),
    storage: ConfigurationManager.prototype.getConfig('storage'),
    logger: ConfigurationManager.prototype.getConfig('logger'),
    email: ConfigurationManager.prototype.getConfig('email'),
    environment: {
        nodeEnv: NODE_ENV,
        isProduction: IS_PRODUCTION,
        isDevelopment: IS_DEVELOPMENT,
        version: CONFIG_VERSION
    }
};

// Export configuration manager for advanced usage
export const configManager = new ConfigurationManager();