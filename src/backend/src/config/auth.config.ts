/**
 * Authentication Configuration Module
 * Version: 1.0.0
 * 
 * Enterprise-grade authentication and authorization configuration including:
 * - JWT token management with enhanced security
 * - OAuth 2.0/OIDC integration with Azure AD B2C
 * - Multi-factor authentication settings
 * - Secure session management with Redis
 */

// External imports
import { config } from 'dotenv'; // ^16.0.0

// Internal imports
import { AuthProvider } from '../types/auth.types';

// Initialize environment variables
config();

/**
 * JWT configuration interface with enhanced security options
 */
interface JwtConfig {
    secret: string;
    accessTokenExpiry: number;  // in seconds
    refreshTokenExpiry: number; // in seconds
    issuer: string;
    audience: string;
    algorithms: string[];
    keyRotationInterval: number; // in seconds
    jwtIdEnabled: boolean;
    clockTolerance: number;     // in seconds
}

/**
 * OAuth/OIDC configuration interface with enterprise features
 */
interface OAuthConfig {
    azureAdTenantId: string;
    azureAdClientId: string;
    azureAdClientSecret: string;
    azureAdRedirectUri: string;
    scopes: string[];
    authorityUrl: string;
    metadataUrl: string;
    validateIssuer: boolean;
    allowedIssuers: string[];
}

/**
 * Multi-factor authentication configuration interface with rate limiting
 */
interface MfaConfig {
    enabled: boolean;
    codeLength: number;
    codeExpiry: number;         // in seconds
    maxAttempts: number;
    cooldownPeriod: number;     // in seconds
    rateLimit: number;
    rateLimitWindow: string;
    requireTrustedDevice: boolean;
}

/**
 * Enhanced session configuration interface with security features
 */
interface SessionConfig {
    maxAge: number;            // in milliseconds
    secure: boolean;
    httpOnly: boolean;
    name: string;
    domain: string;
    sameSite: string;
    path: string;
    priority: string;
    rolling: boolean;
    renewalThreshold: number;  // in milliseconds
}

/**
 * Comprehensive authentication configuration object
 * Implements enterprise security standards and best practices
 */
export const authConfig = {
    jwt: {
        secret: process.env.JWT_SECRET!,
        accessTokenExpiry: 3600,           // 1 hour
        refreshTokenExpiry: 86400,         // 24 hours
        issuer: 'task-management-system',
        audience: 'task-management-users',
        algorithms: ['RS256'],             // Use asymmetric signing
        keyRotationInterval: 86400,        // 24 hours
        jwtIdEnabled: true,               // Enable JWT ID for revocation
        clockTolerance: 30                // 30 seconds tolerance
    } as JwtConfig,

    oauth: {
        azureAdTenantId: process.env.AZURE_AD_TENANT_ID!,
        azureAdClientId: process.env.AZURE_AD_CLIENT_ID!,
        azureAdClientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        azureAdRedirectUri: process.env.AZURE_AD_REDIRECT_URI!,
        scopes: [
            'openid',
            'profile',
            'email',
            'offline_access',
            'user.read',
            'directory.read.all'
        ],
        authorityUrl: process.env.AZURE_AD_AUTHORITY_URL!,
        metadataUrl: process.env.AZURE_AD_METADATA_URL!,
        validateIssuer: true,
        allowedIssuers: process.env.ALLOWED_ISSUERS?.split(',') || []
    } as OAuthConfig,

    mfa: {
        enabled: true,
        codeLength: 6,                    // 6-digit codes
        codeExpiry: 300,                  // 5 minutes
        maxAttempts: 3,                   // 3 attempts before lockout
        cooldownPeriod: 300,              // 5 minutes cooldown
        rateLimit: 5,                     // 5 attempts per window
        rateLimitWindow: '15m',           // 15 minute window
        requireTrustedDevice: true        // Require device verification
    } as MfaConfig,

    session: {
        maxAge: 86400000,                 // 24 hours
        secure: true,                     // HTTPS only
        httpOnly: true,                   // Prevent XSS
        name: 'tms_session',              // Custom session name
        domain: process.env.COOKIE_DOMAIN!,
        sameSite: 'strict',              // CSRF protection
        path: '/',
        priority: 'high',                // High priority cookie
        rolling: true,                   // Reset expiry on activity
        renewalThreshold: 3600000        // Renew if less than 1 hour left
    } as SessionConfig
};

/**
 * Type guard to validate authentication provider
 * @param provider - The provider to validate
 * @returns boolean indicating if the provider is valid
 */
export const isValidAuthProvider = (provider: string): provider is AuthProvider => {
    return Object.values(AuthProvider).includes(provider as AuthProvider);
};

/**
 * Validate JWT configuration
 * Ensures all required JWT settings are properly configured
 * @throws Error if JWT configuration is invalid
 */
const validateJwtConfig = (): void => {
    if (!authConfig.jwt.secret) {
        throw new Error('JWT secret must be configured');
    }
    if (authConfig.jwt.accessTokenExpiry >= authConfig.jwt.refreshTokenExpiry) {
        throw new Error('Access token expiry must be less than refresh token expiry');
    }
};

/**
 * Validate OAuth configuration
 * Ensures all required OAuth settings are properly configured
 * @throws Error if OAuth configuration is invalid
 */
const validateOAuthConfig = (): void => {
    const requiredEnvVars = [
        'AZURE_AD_TENANT_ID',
        'AZURE_AD_CLIENT_ID',
        'AZURE_AD_CLIENT_SECRET',
        'AZURE_AD_REDIRECT_URI',
        'AZURE_AD_AUTHORITY_URL',
        'AZURE_AD_METADATA_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required OAuth environment variables: ${missingVars.join(', ')}`);
    }
};

// Validate configurations on module load
validateJwtConfig();
validateOAuthConfig();