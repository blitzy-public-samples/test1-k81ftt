// @ts-nocheck
import { config } from 'dotenv'; // ^16.0.0 - Load environment variables for secure Redis configuration
import { EventEmitter } from 'events';

// Load environment variables
config();

// Interfaces
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  tls: boolean;
  cluster?: RedisClusterConfig;
  sentinel?: RedisSentinelConfig;
  security: RedisSecurityConfig;
  pool: RedisPoolConfig;
}

interface RedisClusterConfig {
  nodes: string[];
  replicas: number;
  enableReadFromReplicas: boolean;
  clusterRetryDelay: number;
}

interface RedisSentinelConfig {
  sentinels: string[];
  masterName: string;
  sentinelRetryDelay: number;
}

interface RedisSecurityConfig {
  tlsCert?: string;
  tlsKey?: string;
  tlsCA?: string;
  rejectUnauthorized: boolean;
  allowedCommands: string[];
}

interface RedisPoolConfig {
  minConnections: number;
  maxConnections: number;
  idleTimeout: number;
  acquireTimeout: number;
}

interface RedisOptions {
  retryAttempts: number;
  retryDelay: number;
  keepAlive: number;
  enableReadyCheck: boolean;
  connectTimeout: number;
  commandTimeout: number;
  autoResubscribe: boolean;
  autoResendUnfulfilledCommands: boolean;
  maxRetriesPerRequest: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface MonitoringHandlers {
  healthCheck: () => Promise<boolean>;
  getMetrics: () => Promise<Record<string, any>>;
  errorHandler: (error: Error) => void;
  connectionMonitor: EventEmitter;
}

// Global Constants
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);
const REDIS_TLS_ENABLED = process.env.REDIS_TLS_ENABLED === 'true';
const REDIS_CLUSTER_ENABLED = process.env.REDIS_CLUSTER_ENABLED === 'true';
const REDIS_SENTINEL_ENABLED = process.env.REDIS_SENTINEL_ENABLED === 'true';
const REDIS_MONITORING_ENABLED = process.env.REDIS_MONITORING_ENABLED === 'true';

// Default configurations
const REDIS_DEFAULTS: RedisOptions = {
  retryAttempts: 5,
  retryDelay: 1000,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true
};

const REDIS_POOL_DEFAULTS: RedisPoolConfig = {
  minConnections: 5,
  maxConnections: 50,
  idleTimeout: 60000,
  acquireTimeout: 30000
};

// Configuration validation function
export const validateRedisConfig = (config: RedisConfig): ValidationResult => {
  const errors: string[] = [];

  // Basic connection validation
  if (!config.host) errors.push('Redis host is required');
  if (typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
    errors.push('Invalid Redis port number');
  }

  // Cluster configuration validation
  if (config.cluster) {
    if (!Array.isArray(config.cluster.nodes) || config.cluster.nodes.length === 0) {
      errors.push('Cluster nodes must be a non-empty array');
    }
    if (config.cluster.replicas < 0) errors.push('Invalid replicas count');
  }

  // Sentinel configuration validation
  if (config.sentinel) {
    if (!Array.isArray(config.sentinel.sentinels) || config.sentinel.sentinels.length === 0) {
      errors.push('Sentinel nodes must be a non-empty array');
    }
    if (!config.sentinel.masterName) errors.push('Sentinel master name is required');
  }

  // Security configuration validation
  if (config.tls) {
    if (config.security.rejectUnauthorized && !config.security.tlsCA) {
      errors.push('TLS CA certificate is required when rejectUnauthorized is true');
    }
  }

  // Pool configuration validation
  if (config.pool.maxConnections < config.pool.minConnections) {
    errors.push('Maximum connections must be greater than minimum connections');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Monitoring setup function
const createRedisMonitoring = (config: RedisConfig): MonitoringHandlers => {
  const monitor = new EventEmitter();

  return {
    healthCheck: async () => {
      try {
        // Implement health check logic
        return true;
      } catch (error) {
        return false;
      }
    },
    getMetrics: async () => {
      return {
        connections: 0, // Implement actual metrics collection
        operations: 0,
        memory: 0,
        hitRate: 0
      };
    },
    errorHandler: (error: Error) => {
      monitor.emit('error', error);
      // Implement error logging and alerting
    },
    connectionMonitor: monitor
  };
};

// Main Redis configuration
const createRedisConfig = (): RedisConfig => {
  const baseConfig: RedisConfig = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    db: REDIS_DB,
    tls: REDIS_TLS_ENABLED,
    security: {
      rejectUnauthorized: true,
      allowedCommands: ['get', 'set', 'del', 'publish', 'subscribe'],
      tlsCert: process.env.REDIS_TLS_CERT,
      tlsKey: process.env.REDIS_TLS_KEY,
      tlsCA: process.env.REDIS_TLS_CA
    },
    pool: {
      ...REDIS_POOL_DEFAULTS,
      minConnections: parseInt(process.env.REDIS_POOL_MIN || String(REDIS_POOL_DEFAULTS.minConnections), 10),
      maxConnections: parseInt(process.env.REDIS_POOL_MAX || String(REDIS_POOL_DEFAULTS.maxConnections), 10)
    }
  };

  // Add cluster configuration if enabled
  if (REDIS_CLUSTER_ENABLED) {
    baseConfig.cluster = {
      nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
      replicas: parseInt(process.env.REDIS_CLUSTER_REPLICAS || '1', 10),
      enableReadFromReplicas: process.env.REDIS_CLUSTER_READ_REPLICAS === 'true',
      clusterRetryDelay: parseInt(process.env.REDIS_CLUSTER_RETRY_DELAY || '1000', 10)
    };
  }

  // Add sentinel configuration if enabled
  if (REDIS_SENTINEL_ENABLED) {
    baseConfig.sentinel = {
      sentinels: process.env.REDIS_SENTINEL_NODES?.split(',') || [],
      masterName: process.env.REDIS_SENTINEL_MASTER_NAME || 'mymaster',
      sentinelRetryDelay: parseInt(process.env.REDIS_SENTINEL_RETRY_DELAY || '1000', 10)
    };
  }

  return baseConfig;
};

// Export the configuration object
export const redisConfig = {
  connection: createRedisConfig(),
  options: REDIS_DEFAULTS,
  monitoring: REDIS_MONITORING_ENABLED ? createRedisMonitoring(createRedisConfig()) : undefined
};

export default redisConfig;