/**
 * Authentication Helper Module
 * Version: 1.0.0
 * 
 * Enterprise-grade authentication helper implementing:
 * - Enhanced JWT token management with device binding
 * - Rate-limited token generation and validation
 * - Secure password handling with Argon2id
 * - Comprehensive security logging and monitoring
 */

// External imports
import jwt from 'jsonwebtoken'; // ^9.0.0
import { createClient } from 'redis'; // ^4.0.0

// Internal imports
import { authConfig } from '../config/auth.config';
import { hashPassword, verifyPassword, generateSecureToken } from '../utils/encryption.util';
import { SecurityLogger } from '../utils/logger.util';
import { UserRole, AuthTokens, JwtCustomPayload } from '../types/auth.types';

// Initialize Redis client for token management and rate limiting
const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
    }
});

redisClient.on('error', (err) => SecurityLogger.error('Redis Client Error', { error: err }));

// Constants
const TOKEN_HEADER_KEY = 'Authorization';
const TOKEN_TYPE = 'Bearer';
const MAX_TOKEN_AGE = 3600; // 1 hour in seconds
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 300; // 5 minutes in seconds
const TOKEN_BLACKLIST_PREFIX = 'blacklist:';

/**
 * Generates access and refresh tokens with enhanced security features
 * @param userId - User identifier
 * @param role - User role for RBAC
 * @param deviceFingerprint - Device-specific identifier for token binding
 * @returns Promise containing token pair and metadata
 */
export async function generateAuthTokens(
    userId: string,
    role: UserRole,
    deviceFingerprint: string
): Promise<AuthTokens> {
    try {
        // Check rate limiting
        const rateLimitKey = `ratelimit:token:${userId}`;
        const attempts = await redisClient.incr(rateLimitKey);
        
        if (attempts === 1) {
            await redisClient.expire(rateLimitKey, RATE_LIMIT_WINDOW);
        }

        if (attempts > authConfig.rateLimit.maxTokensPerWindow) {
            SecurityLogger.warn('Token generation rate limit exceeded', {
                userId,
                attempts
            });
            throw new Error('Rate limit exceeded');
        }

        // Generate token payload
        const payload: JwtCustomPayload = {
            userId,
            role,
            deviceFingerprint,
            iat: Math.floor(Date.now() / 1000),
            jti: await generateSecureToken(32)
        };

        // Generate access token
        const accessToken = jwt.sign(payload, authConfig.jwt.secret, {
            expiresIn: authConfig.jwt.accessTokenExpiry,
            algorithm: authConfig.jwt.algorithms[0],
            issuer: authConfig.jwt.issuer,
            audience: authConfig.jwt.audience
        });

        // Generate refresh token
        const refreshToken = await generateSecureToken(64);
        const refreshTokenHash = await hashPassword(refreshToken);

        // Store refresh token metadata
        await redisClient.setEx(
            `refresh:${refreshToken}`,
            authConfig.jwt.refreshTokenExpiry,
            JSON.stringify({
                userId,
                deviceFingerprint,
                tokenHash: refreshTokenHash
            })
        );

        SecurityLogger.info('Auth tokens generated', {
            userId,
            tokenId: payload.jti
        });

        return {
            accessToken,
            refreshToken,
            expiresIn: authConfig.jwt.accessTokenExpiry,
            tokenType: TOKEN_TYPE
        };
    } catch (error) {
        SecurityLogger.error('Token generation failed', { error, userId });
        throw new Error('Failed to generate authentication tokens');
    }
}

/**
 * Validates JWT access token with enhanced security checks
 * @param token - JWT access token to validate
 * @param deviceFingerprint - Device-specific identifier for validation
 * @returns Promise containing decoded token payload
 */
export async function validateAccessToken(
    token: string,
    deviceFingerprint: string
): Promise<JwtCustomPayload> {
    try {
        // Check token blacklist
        const isBlacklisted = await redisClient.exists(`${TOKEN_BLACKLIST_PREFIX}${token}`);
        if (isBlacklisted) {
            SecurityLogger.warn('Blacklisted token used', { token: token.substring(0, 10) });
            throw new Error('Token has been revoked');
        }

        // Verify token signature and claims
        const decoded = jwt.verify(token, authConfig.jwt.secret, {
            algorithms: authConfig.jwt.algorithms,
            issuer: authConfig.jwt.issuer,
            audience: authConfig.jwt.audience,
            clockTolerance: authConfig.jwt.clockTolerance
        }) as JwtCustomPayload;

        // Verify device binding
        if (decoded.deviceFingerprint !== deviceFingerprint) {
            SecurityLogger.warn('Device fingerprint mismatch', {
                tokenId: decoded.jti,
                userId: decoded.userId
            });
            throw new Error('Invalid token binding');
        }

        SecurityLogger.info('Access token validated', {
            userId: decoded.userId,
            tokenId: decoded.jti
        });

        return decoded;
    } catch (error) {
        SecurityLogger.error('Token validation failed', { error });
        throw new Error('Invalid access token');
    }
}

/**
 * Securely hashes user password with strength validation
 * @param password - Plain text password to hash
 * @returns Promise containing hashed password
 */
export async function hashUserPassword(password: string): Promise<string> {
    try {
        // Validate password strength
        if (password.length < 12) {
            throw new Error('Password too short');
        }

        const hashedPassword = await hashPassword(password);
        SecurityLogger.info('Password hashed successfully');
        
        return hashedPassword;
    } catch (error) {
        SecurityLogger.error('Password hashing failed', { error });
        throw new Error('Failed to hash password');
    }
}

/**
 * Verifies user password with brute force protection
 * @param password - Plain text password to verify
 * @param hashedPassword - Stored password hash
 * @param userId - User identifier for rate limiting
 * @returns Promise containing boolean indicating match
 */
export async function verifyUserPassword(
    password: string,
    hashedPassword: string,
    userId: string
): Promise<boolean> {
    try {
        // Check failed attempts rate limiting
        const attemptsKey = `attempts:${userId}`;
        const attempts = await redisClient.incr(attemptsKey);
        
        if (attempts === 1) {
            await redisClient.expire(attemptsKey, RATE_LIMIT_WINDOW);
        }

        if (attempts > MAX_FAILED_ATTEMPTS) {
            SecurityLogger.warn('Password verification rate limit exceeded', { userId });
            throw new Error('Too many failed attempts');
        }

        const isValid = await verifyPassword(password, hashedPassword);

        if (isValid) {
            await redisClient.del(attemptsKey);
            SecurityLogger.info('Password verified successfully', { userId });
        } else {
            SecurityLogger.warn('Password verification failed', { userId, attempts });
        }

        return isValid;
    } catch (error) {
        SecurityLogger.error('Password verification error', { error, userId });
        throw new Error('Password verification failed');
    }
}