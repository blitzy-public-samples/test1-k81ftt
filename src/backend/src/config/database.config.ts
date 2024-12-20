import { config } from 'dotenv'; // ^16.0.0
import { z } from 'zod'; // ^3.0.0
import { UUID } from '../types/common.types';

// Load environment variables
config();

// Constants for database configuration
const DEFAULT_CONNECTION_TIMEOUT = 30000;
const DEFAULT_IDLE_TIMEOUT = 10000;
const MAX_POOL_SIZE = 20;
const SSL_REJECT_UNAUTHORIZED = false;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;
const HEALTH_CHECK_INTERVAL = 30000;

// Environment variables with validation
const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_SSL = process.env.DATABASE_SSL === 'true';
const DATABASE_POOL_MIN = parseInt(process.env.DATABASE_POOL_MIN || '2');
const DATABASE_POOL_MAX = parseInt(process.env.DATABASE_POOL_MAX || '10');
const DATABASE_REPLICA_URLS = process.env.DATABASE_REPLICA_URLS?.split(',') || [];

// Zod schema for SSL configuration
const SSLConfigSchema = z.object({
  rejectUnauthorized: z.boolean(),
  ca: z.string().optional(),
  key: z.string().optional(),
  cert: z.string().optional(),
});

// Zod schema for connection pool configuration
const PoolConfigSchema = z.object({
  min: z.number().min(1).max(MAX_POOL_SIZE),
  max: z.number().min(1).max(MAX_POOL_SIZE),
  idleTimeoutMillis: z.number().min(1000),
});

// Zod schema for monitoring configuration
const MonitoringConfigSchema = z.object({
  enabled: z.boolean(),
  healthCheckIntervalMs: z.number().min(1000),
  metrics: z.object({
    collectQueryStats: z.boolean(),
    slowQueryThresholdMs: z.number().min(100),
  }),
});

// Interface for database configuration
interface DatabaseConfig {
  url: string;
  options: ConnectionOptions;
  enableSSL: boolean;
  monitoring: {
    enabled: boolean;
    healthCheckIntervalMs: number;
    metrics: {
      collectQueryStats: boolean;
      slowQueryThresholdMs: number;
    };
  };
  replication?: {
    enabled: boolean;
    replicas: string[];
  };
}

// Interface for connection options
interface ConnectionOptions {
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
  connectionTimeout: number;
  idleTimeout: number;
  ssl: {
    rejectUnauthorized: boolean;
    ca?: string;
    key?: string;
    cert?: string;
  };
  monitoring: {
    enabled: boolean;
    healthCheckIntervalMs: number;
    metrics: {
      collectQueryStats: boolean;
      slowQueryThresholdMs: number;
    };
  };
  retry: {
    attempts: number;
    delay: number;
  };
}

/**
 * Validates database configuration settings
 * @param config Database configuration to validate
 * @returns Promise resolving to boolean indicating validation status
 * @throws Error if validation fails
 */
async function validateDatabaseConfig(config: DatabaseConfig): Promise<boolean> {
  try {
    // Validate database URL
    if (!config.url) {
      throw new Error('Database URL is required');
    }

    // Validate SSL configuration
    if (config.enableSSL) {
      await SSLConfigSchema.parseAsync(config.options.ssl);
    }

    // Validate pool configuration
    await PoolConfigSchema.parseAsync(config.options.pool);

    // Validate monitoring configuration
    await MonitoringConfigSchema.parseAsync(config.monitoring);

    // Validate replica URLs if replication is enabled
    if (config.replication?.enabled && (!config.replication.replicas || config.replication.replicas.length === 0)) {
      throw new Error('Replica URLs are required when replication is enabled');
    }

    return true;
  } catch (error) {
    throw new Error(`Database configuration validation failed: ${error.message}`);
  }
}

/**
 * Creates and configures database connection pool
 * @param options Connection options for pool configuration
 * @returns Promise resolving to configured connection pool
 */
async function createConnectionPool(options: ConnectionOptions): Promise<any> {
  const poolConfig = {
    min: options.pool.min,
    max: options.pool.max,
    idleTimeoutMillis: options.pool.idleTimeoutMillis,
    createTimeoutMillis: options.connectionTimeout,
    acquireTimeoutMillis: options.connectionTimeout,
    reapIntervalMillis: options.monitoring.healthCheckIntervalMs,
    log: options.monitoring.enabled ? console : undefined,
  };

  // Return Prisma connection pool configuration
  return {
    datasources: {
      db: {
        url: DATABASE_URL,
        poolConfig,
      },
    },
    log: options.monitoring.enabled ? ['query', 'info', 'warn', 'error'] : undefined,
  };
}

// Export database configuration
export const databaseConfig: DatabaseConfig = {
  url: DATABASE_URL!,
  enableSSL: DATABASE_SSL,
  options: {
    pool: {
      min: DATABASE_POOL_MIN,
      max: DATABASE_POOL_MAX,
      idleTimeoutMillis: DEFAULT_IDLE_TIMEOUT,
    },
    connectionTimeout: DEFAULT_CONNECTION_TIMEOUT,
    idleTimeout: DEFAULT_IDLE_TIMEOUT,
    ssl: {
      rejectUnauthorized: SSL_REJECT_UNAUTHORIZED,
    },
    monitoring: {
      enabled: true,
      healthCheckIntervalMs: HEALTH_CHECK_INTERVAL,
      metrics: {
        collectQueryStats: true,
        slowQueryThresholdMs: 1000,
      },
    },
    retry: {
      attempts: RETRY_ATTEMPTS,
      delay: RETRY_DELAY,
    },
  },
  monitoring: {
    enabled: true,
    healthCheckIntervalMs: HEALTH_CHECK_INTERVAL,
    metrics: {
      collectQueryStats: true,
      slowQueryThresholdMs: 1000,
    },
  },
  replication: DATABASE_REPLICA_URLS.length > 0 ? {
    enabled: true,
    replicas: DATABASE_REPLICA_URLS,
  } : undefined,
};

// Validate configuration on module load
validateDatabaseConfig(databaseConfig).catch((error) => {
  console.error('Database configuration validation failed:', error);
  process.exit(1);
});

export { validateDatabaseConfig, createConnectionPool };