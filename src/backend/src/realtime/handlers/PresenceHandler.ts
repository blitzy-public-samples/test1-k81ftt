/**
 * @fileoverview Handles real-time user presence tracking and management with high availability
 * and performance optimization in a distributed environment.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { injectable } from 'inversify'; // v6.0.1
import { Logger } from 'winston'; // v3.8.0
import Redis from 'ioredis'; // v5.0.0
import { RateLimiter } from 'rate-limiter-flexible'; // v2.4.1
import { IEventHandler } from '../../core/interfaces/IEventHandler';
import { EventPayload, EventType } from '../../types/event.types';
import { UUID } from '../../types/common.types';

/**
 * Enum defining possible presence statuses
 */
export enum PresenceStatus {
  ONLINE = 'ONLINE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE'
}

/**
 * Interface for presence metadata
 */
interface PresenceMetadata {
  lastActivity: Date;
  deviceInfo: string;
  location?: string;
}

/**
 * Interface for presence data storage
 */
interface PresenceData {
  userId: UUID;
  status: PresenceStatus;
  metadata: PresenceMetadata;
  lastUpdated: Date;
}

/**
 * Constants for presence management
 */
const PRESENCE_CONSTANTS = {
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  PRESENCE_TTL: 30 * 60, // 30 minutes in seconds
  RATE_LIMIT_POINTS: 30,
  RATE_LIMIT_DURATION: 60, // 1 minute
  REDIS_KEY_PREFIX: 'presence:',
  MAX_RETRY_ATTEMPTS: 3,
  CACHE_SIZE: 10000, // Maximum number of users to track in memory
} as const;

/**
 * @class PresenceHandler
 * @implements {IEventHandler}
 * @description Handles real-time user presence tracking and management with high availability
 */
@injectable()
export class PresenceHandler implements IEventHandler {
  private onlineUsers: Map<string, PresenceData>;
  private readonly redisClient: Redis;
  private readonly logger: Logger;
  private readonly rateLimiter: RateLimiter;
  private readonly cleanupInterval: NodeJS.Timeout;
  private readonly presenceTTL: number;

  /**
   * Creates an instance of PresenceHandler
   */
  constructor(
    redisClient: Redis,
    logger: Logger,
    rateLimiter: RateLimiter
  ) {
    this.onlineUsers = new Map();
    this.redisClient = redisClient;
    this.logger = logger;
    this.rateLimiter = rateLimiter;
    this.presenceTTL = PRESENCE_CONSTANTS.PRESENCE_TTL;

    // Start cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanupStalePresence(),
      PRESENCE_CONSTANTS.CLEANUP_INTERVAL
    );

    // Initialize presence tracking
    this.initializePresenceTracking().catch(err => {
      this.logger.error('Failed to initialize presence tracking', { error: err });
    });
  }

  /**
   * Handles presence-related events
   * @param {EventPayload} payload - Event payload
   */
  public async handle(payload: Readonly<EventPayload>): Promise<void> {
    try {
      // Validate payload
      if (!payload || !payload.type || !payload.data) {
        throw new Error('Invalid event payload');
      }

      // Check rate limits
      await this.checkRateLimit(payload.userId);

      switch (payload.type) {
        case EventType.REAL_TIME_UPDATE:
          await this.handlePresenceUpdate(payload);
          break;
        default:
          this.logger.warn('Unhandled event type', { 
            type: payload.type,
            correlationId: payload.correlationId 
          });
      }

      this.logger.info('Presence event handled successfully', {
        eventId: payload.id,
        correlationId: payload.correlationId
      });
    } catch (error) {
      this.logger.error('Error handling presence event', {
        error,
        eventId: payload.id,
        correlationId: payload.correlationId
      });
      throw error;
    }
  }

  /**
   * Updates user presence status
   * @param {string} userId - User ID
   * @param {PresenceStatus} status - New presence status
   * @param {PresenceMetadata} metadata - Presence metadata
   */
  public async updateUserPresence(
    userId: string,
    status: PresenceStatus,
    metadata: PresenceMetadata
  ): Promise<void> {
    try {
      const presenceData: PresenceData = {
        userId: userId as UUID,
        status,
        metadata,
        lastUpdated: new Date()
      };

      // Update Redis with retry mechanism
      await this.updateRedisPresence(userId, presenceData);

      // Update local cache
      this.updateLocalCache(userId, presenceData);

      this.logger.debug('User presence updated', { userId, status });
    } catch (error) {
      this.logger.error('Failed to update user presence', { error, userId });
      throw error;
    }
  }

  /**
   * Retrieves current user presence
   * @param {string} userId - User ID
   */
  public async getUserPresence(userId: string): Promise<PresenceData | null> {
    try {
      // Check local cache first
      const cachedPresence = this.onlineUsers.get(userId);
      if (cachedPresence) {
        return cachedPresence;
      }

      // Fallback to Redis
      const redisKey = `${PRESENCE_CONSTANTS.REDIS_KEY_PREFIX}${userId}`;
      const presenceData = await this.redisClient.get(redisKey);
      
      return presenceData ? JSON.parse(presenceData) : null;
    } catch (error) {
      this.logger.error('Failed to get user presence', { error, userId });
      return null;
    }
  }

  /**
   * Cleans up stale presence data
   */
  private async cleanupStalePresence(): Promise<void> {
    try {
      const now = new Date();
      const staleThreshold = new Date(now.getTime() - (this.presenceTTL * 1000));

      // Cleanup local cache
      for (const [userId, data] of this.onlineUsers.entries()) {
        if (data.lastUpdated < staleThreshold) {
          this.onlineUsers.delete(userId);
        }
      }

      this.logger.debug('Completed presence cleanup');
    } catch (error) {
      this.logger.error('Error during presence cleanup', { error });
    }
  }

  /**
   * Initializes presence tracking
   */
  private async initializePresenceTracking(): Promise<void> {
    try {
      // Subscribe to Redis presence channel
      await this.redisClient.subscribe('presence-updates');
      
      this.redisClient.on('message', (channel, message) => {
        if (channel === 'presence-updates') {
          const presenceUpdate = JSON.parse(message);
          this.updateLocalCache(presenceUpdate.userId, presenceUpdate);
        }
      });

      this.logger.info('Presence tracking initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize presence tracking', { error });
      throw error;
    }
  }

  /**
   * Updates presence data in Redis
   */
  private async updateRedisPresence(
    userId: string,
    presenceData: PresenceData,
    retryCount = 0
  ): Promise<void> {
    try {
      const redisKey = `${PRESENCE_CONSTANTS.REDIS_KEY_PREFIX}${userId}`;
      await this.redisClient
        .multi()
        .set(redisKey, JSON.stringify(presenceData))
        .expire(redisKey, this.presenceTTL)
        .publish('presence-updates', JSON.stringify(presenceData))
        .exec();
    } catch (error) {
      if (retryCount < PRESENCE_CONSTANTS.MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.updateRedisPresence(userId, presenceData, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Updates the local presence cache
   */
  private updateLocalCache(userId: string, presenceData: PresenceData): void {
    // Implement LRU cache behavior
    if (this.onlineUsers.size >= PRESENCE_CONSTANTS.CACHE_SIZE) {
      const oldestKey = this.onlineUsers.keys().next().value;
      this.onlineUsers.delete(oldestKey);
    }
    this.onlineUsers.set(userId, presenceData);
  }

  /**
   * Handles presence update events
   */
  private async handlePresenceUpdate(payload: Readonly<EventPayload>): Promise<void> {
    const { userId, status, metadata } = payload.data as {
      userId: string;
      status: PresenceStatus;
      metadata: PresenceMetadata;
    };

    await this.updateUserPresence(userId, status, metadata);
  }

  /**
   * Checks rate limits for presence updates
   */
  private async checkRateLimit(userId: string): Promise<void> {
    try {
      await this.rateLimiter.consume(userId, 1);
    } catch (error) {
      throw new Error('Rate limit exceeded for presence updates');
    }
  }

  /**
   * Cleanup resources on service shutdown
   */
  public async shutdown(): Promise<void> {
    clearInterval(this.cleanupInterval);
    await this.redisClient.quit();
  }
}