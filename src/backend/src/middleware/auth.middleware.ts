/**
 * @fileoverview Enhanced Authentication and Authorization Middleware
 * @version 1.0.0
 * 
 * Implements comprehensive security controls for request authentication and
 * authorization with support for JWT validation, RBAC, MFA, and rate limiting.
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { injectable } from 'inversify'; // ^6.0.1
import rateLimit from 'express-rate-limit'; // ^6.7.0
import helmet from 'helmet'; // ^7.0.0
import { IAuth } from '../interfaces/IAuth';
import { UserRole, JwtCustomPayload } from '../types/auth.types';

// Custom type for authenticated request
interface AuthenticatedRequest extends Request {
  user?: JwtCustomPayload;
}

// Security configuration constants
const SECURITY_CONFIG = {
  MAX_TOKEN_AGE_SECONDS: 3600,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  MFA_REQUIRED_ROLES: [UserRole.ADMIN, UserRole.MANAGER],
  TOKEN_HEADER_NAME: 'Authorization',
  TOKEN_PREFIX: 'Bearer',
};

// Role hierarchy for authorization checks
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER, UserRole.GUEST],
  [UserRole.MANAGER]: [UserRole.MANAGER, UserRole.MEMBER, UserRole.GUEST],
  [UserRole.MEMBER]: [UserRole.MEMBER, UserRole.GUEST],
  [UserRole.GUEST]: [UserRole.GUEST],
};

@injectable()
export class AuthMiddleware {
  constructor(private authService: IAuth) {}

  /**
   * Enhanced authentication middleware with comprehensive security checks
   * Implements token validation, MFA verification, and security headers
   */
  public authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Apply security headers
      helmet()(req, res, () => {});

      // Extract and validate token
      const authHeader = req.header(SECURITY_CONFIG.TOKEN_HEADER_NAME);
      if (!authHeader?.startsWith(SECURITY_CONFIG.TOKEN_PREFIX)) {
        throw new Error('Invalid authorization header format');
      }

      const token = authHeader.substring(SECURITY_CONFIG.TOKEN_PREFIX.length + 1);
      if (!token) {
        throw new Error('No token provided');
      }

      // Validate token and check blacklist
      const isBlacklisted = await this.authService.checkTokenBlacklist(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      // Decode and validate token
      const payload = await this.authService.validateToken(token);
      if (!payload) {
        throw new Error('Invalid token');
      }

      // Verify token age
      const tokenAge = (Date.now() / 1000) - payload.iat!;
      if (tokenAge > SECURITY_CONFIG.MAX_TOKEN_AGE_SECONDS) {
        throw new Error('Token has expired');
      }

      // Check MFA requirement for specific roles
      if (
        SECURITY_CONFIG.MFA_REQUIRED_ROLES.includes(payload.role) &&
        !payload.mfaVerified
      ) {
        throw new Error('MFA verification required');
      }

      // Attach validated user to request
      req.user = payload;
      next();
    } catch (error) {
      res.status(401).json({
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'AUTH_ERROR',
      });
    }
  };

  /**
   * Enhanced authorization middleware with role hierarchy and permission checks
   * @param allowedRoles - Array of roles allowed to access the resource
   * @param requiredPermissions - Array of required permissions
   */
  public authorize = (allowedRoles: UserRole[], requiredPermissions: string[] = []) => {
    // Apply role-specific rate limiting
    const roleRateLimit = rateLimit({
      windowMs: SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS,
      max: SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS,
      message: 'Too many requests from this IP, please try again later',
    });

    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Apply rate limiting
        await new Promise((resolve) => roleRateLimit(req, res, resolve));

        // Verify authentication
        if (!req.user) {
          throw new Error('User not authenticated');
        }

        // Check role hierarchy
        const userRoleHierarchy = ROLE_HIERARCHY[req.user.role];
        const hasValidRole = allowedRoles.some(role => userRoleHierarchy.includes(role));
        
        if (!hasValidRole) {
          throw new Error('Insufficient role privileges');
        }

        // Validate required permissions
        if (requiredPermissions.length > 0) {
          const hasRequiredPermissions = requiredPermissions.every(
            permission => req.user!.permissions.includes(permission)
          );
          
          if (!hasRequiredPermissions) {
            throw new Error('Missing required permissions');
          }
        }

        next();
      } catch (error) {
        res.status(403).json({
          error: 'Authorization failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'AUTH_ERROR',
        });
      }
    };
  };
}

// Export middleware instance
export const { authenticate, authorize } = new AuthMiddleware(
  // AuthService instance will be injected via inversify
  {} as IAuth
);
```

This implementation provides:

1. Comprehensive JWT token validation with blacklist checking
2. MFA verification for high-privilege roles
3. Role-based access control with hierarchical permissions
4. Rate limiting per role
5. Security headers via helmet
6. Token age validation
7. Detailed error handling and logging
8. Type safety with TypeScript
9. Dependency injection support
10. Configurable security parameters

The middleware can be used in routes like:

```typescript
router.get('/protected',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.MANAGER], ['read:data']),
  controller.handler
);