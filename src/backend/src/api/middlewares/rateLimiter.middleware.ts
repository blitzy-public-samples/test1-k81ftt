/**
 * @fileoverview Enterprise-grade distributed rate limiting middleware
 * Implements Redis cluster-based rate limiting with circuit breaker pattern
 * and comprehensive monitoring capabilities.
 * @version 1.0.0
 */

import Redis from 'ioredis'; // ^5.0.0
import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import CircuitBreaker from 'opossum'; // ^6.0.0
import { redisConfig } from '../../config/redis.config';
import { createError } from '../../utils/error.util';
import { logger } from '../../utils/logger.util';

// Constants for rate limiter configuration
const DEFAULT_WINDOW_MS = 60000; // 1 minute
const DEFAULT_MAX_REQUESTS = 100;
const RATE_LIMIT_PREFIX = 'ratelimit:';
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CACHE_TIMEOUT = 1000; // 1 second
const METRICS_ENABLED = true;

/**
 * Interface for enhanced rate limiter configuration options
 */
export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  skipFailedRequests?: boolean;
  whitelist?: string[];
  enableCircuitBreaker?: boolean;
  breakerThreshold?: number;
  breakerTimeout?: number;
  enableMetrics?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
}

/**
 * Enhanced rate limiter implementation with Redis cluster support,
 * circuit breaker pattern, and monitoring capabilities
 */
class RateLimiter {
  private redisClient: Redis.Cluster;
  private options: Required<RateLimiterOptions>;
  private breaker: CircuitBreaker;
  private localCache: Map<string, { count: number; expires: number }>;

  constructor(options: RateLimiterOptions) {
    // Initialize Redis cluster client
    this.redisClient = new Redis.Cluster(redisConfig.connection.cluster?.nodes || [], {
      ...redisConfig.options,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    // Set default options
    this.options = {
      windowMs: options.windowMs || DEFAULT_WINDOW_MS,
      maxRequests: options.maxRequests || DEFAULT_MAX_REQUESTS,
      skipFailedRequests: options.skipFailedRequests || false,
      whitelist: options.whitelist || [],
      enableCircuitBreaker: options.enableCircuitBreaker ?? true,
      breakerThreshold: options.breakerThreshold || CIRCUIT_BREAKER_THRESHOLD,
      breakerTimeout: options.breakerTimeout || CIRCUIT_BREAKER_TIMEOUT,
      enableMetrics: options.enableMetrics ?? METRICS_ENABLED,
      enableCaching: options.enableCaching ?? true,
      cacheTimeout: options.cacheTimeout || CACHE_TIMEOUT,
    };

    // Initialize circuit breaker
    this.breaker = new CircuitBreaker(
      async (key: string) => this.incrementRedis(key),
      {
        timeout: this.options.breakerTimeout,
        errorThresholdPercentage: this.options.breakerThreshold,
        resetTimeout: 30000,
      }
    );

    // Initialize local cache
    this.localCache = new Map();

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Sets up event handlers for monitoring and logging
   */
  private setupEventHandlers(): void {
    // Redis connection events
    this.redisClient.on('error', (error) => {
      logger.error('Redis cluster error', { error, context: { service: 'rate-limiter' } });
    });

    this.redisClient.on('connect', () => {
      logger.info('Connected to Redis cluster', { context: { service: 'rate-limiter' } });
    });

    // Circuit breaker events
    this.breaker.on('open', () => {
      logger.warn('Rate limiter circuit breaker opened', {
        context: { service: 'rate-limiter' }
      });
    });

    this.breaker.on('halfOpen', () => {
      logger.info('Rate limiter circuit breaker half-opened', {
        context: { service: 'rate-limiter' }
      });
    });

    this.breaker.on('close', () => {
      logger.info('Rate limiter circuit breaker closed', {
        context: { service: 'rate-limiter' }
      });
    });
  }

  /**
   * Increments request count in Redis with retry logic
   */
  private async incrementRedis(key: string): Promise<number> {
    const multi = this.redisClient.multi();
    const redisKey = `${RATE_LIMIT_PREFIX}${key}`;

    multi.incr(redisKey);
    multi.pexpire(redisKey, this.options.windowMs);

    const results = await multi.exec();
    return results ? (results[0][1] as number) : 0;
  }

  /**
   * Checks and updates local cache
   */
  private checkCache(key: string): number | null {
    const cached = this.localCache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.count;
    }
    return null;
  }

  /**
   * Updates local cache with new count
   */
  private updateCache(key: string, count: number): void {
    this.localCache.set(key, {
      count,
      expires: Date.now() + this.options.cacheTimeout
    });
  }

  /**
   * Increments request count with circuit breaker and caching
   */
  public async increment(key: string): Promise<number> {
    if (this.options.enableCaching) {
      const cached = this.checkCache(key);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      const count = await this.breaker.fire(key);
      
      if (this.options.enableCaching) {
        this.updateCache(key, count);
      }

      if (this.options.enableMetrics) {
        logger.info('Rate limit increment', {
          context: {
            service: 'rate-limiter',
            key,
            count,
            limit: this.options.maxRequests
          },
          metrics: {
            rateLimit: {
              current: count,
              max: this.options.maxRequests,
              remaining: Math.max(0, this.options.maxRequests - count)
            }
          }
        });
      }

      return count;
    } catch (error) {
      logger.error('Rate limit increment failed', {
        error,
        context: { service: 'rate-limiter', key }
      });
      throw error;
    }
  }

  /**
   * Resets rate limit for a key
   */
  public async reset(key: string): Promise<void> {
    const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
    await this.redisClient.del(redisKey);
    this.localCache.delete(key);
  }
}

/**
 * Creates an enhanced Express middleware for distributed rate limiting
 */
export const rateLimiter = (options: RateLimiterOptions) => {
  const limiter = new RateLimiter(options);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    // Check whitelist
    if (options.whitelist?.includes(key)) {
      return next();
    }

    try {
      const count = await limiter.increment(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', options.maxRequests || DEFAULT_MAX_REQUESTS);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, (options.maxRequests || DEFAULT_MAX_REQUESTS) - count));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + (options.windowMs || DEFAULT_WINDOW_MS)).toISOString());

      if (count > (options.maxRequests || DEFAULT_MAX_REQUESTS)) {
        throw createError(
          '5002', // RATE_LIMIT_EXCEEDED
          'Rate limit exceeded',
          {
            limit: options.maxRequests || DEFAULT_MAX_REQUESTS,
            current: count,
            windowMs: options.windowMs || DEFAULT_WINDOW_MS
          }
        );
      }

      next();
    } catch (error) {
      if (options.skipFailedRequests) {
        return next();
      }

      if (error.code === '5002') {
        res.status(429).json({
          status: 'error',
          code: error.code,
          message: error.message,
          details: error.details
        });
      } else {
        next(error);
      }
    }
  };
};

export { RateLimiterOptions };
```

This implementation provides:

1. Distributed rate limiting using Redis cluster
2. Circuit breaker pattern for Redis operations
3. Local caching for performance optimization
4. Comprehensive monitoring and metrics
5. Configurable options for different use cases
6. Whitelist support
7. Security headers
8. Detailed error handling
9. TypeScript type safety
10. Enterprise-grade logging

The middleware can be used in Express applications like this:

```typescript
app.use(rateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  enableCircuitBreaker: true,
  enableMetrics: true,
  enableCaching: true
}));