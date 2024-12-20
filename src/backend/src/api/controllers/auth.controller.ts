/**
 * Enterprise Authentication Controller
 * Version: 1.0.0
 * 
 * Implements secure authentication endpoints with comprehensive security features
 * including MFA support, rate limiting, and audit logging.
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { injectable, inject } from 'inversify'; // ^6.0.1
import { controller, httpPost, httpGet, middleware } from 'inversify-express-utils'; // ^6.4.3
import rateLimit from 'express-rate-limit'; // ^6.7.0

import { AuthService } from '../../core/services/AuthService';
import { 
  LoginCredentials, 
  RegisterData, 
  AuthTokens, 
  AuthProvider 
} from '../../types/auth.types';

// Service identifiers for dependency injection
const TYPES = {
  AuthService: Symbol.for('AuthService')
};

// Rate limiting configurations
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour
  message: 'Too many registration attempts, please try again later'
});

/**
 * Enhanced authentication controller implementing enterprise security features
 */
@injectable()
@controller('/api/auth')
export class AuthController {
  constructor(
    @inject(TYPES.AuthService) private authService: AuthService
  ) {}

  /**
   * User login endpoint with MFA support and enhanced security
   * 
   * @param req Express request object containing login credentials
   * @param res Express response object
   */
  @httpPost('/login')
  @middleware(loginLimiter)
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const credentials: LoginCredentials = {
        email: req.body.email,
        password: req.body.password,
        provider: req.body.provider || AuthProvider.LOCAL,
        mfaToken: req.body.mfaToken
      };

      const tokens = await this.authService.login(credentials);

      // Set secure cookie options
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      };

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

      // Set security headers
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
      });

      return res.status(200).json({
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType
      });
    } catch (error) {
      return this.handleAuthError(error, res);
    }
  }

  /**
   * User registration endpoint with security validations
   * 
   * @param req Express request object containing registration data
   * @param res Express response object
   */
  @httpPost('/register')
  @middleware(registrationLimiter)
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const registrationData: RegisterData = {
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        acceptedTerms: req.body.acceptedTerms
      };

      if (!registrationData.acceptedTerms) {
        return res.status(400).json({
          code: 'TERMS_NOT_ACCEPTED',
          message: 'Terms and conditions must be accepted'
        });
      }

      const user = await this.authService.register(registrationData);

      return res.status(201).json({
        message: 'Registration successful',
        userId: user.id
      });
    } catch (error) {
      return this.handleAuthError(error, res);
    }
  }

  /**
   * Token refresh endpoint with security validations
   * 
   * @param req Express request object
   * @param res Express response object
   */
  @httpPost('/refresh-token')
  async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({
          code: 'REFRESH_TOKEN_MISSING',
          message: 'Refresh token is required'
        });
      }

      const tokens = await this.authService.refreshToken(refreshToken);

      // Update refresh token cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(200).json({
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType
      });
    } catch (error) {
      return this.handleAuthError(error, res);
    }
  }

  /**
   * MFA setup endpoint for enhanced security
   * 
   * @param req Express request object
   * @param res Express response object
   */
  @httpPost('/mfa/setup')
  async setupMfa(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id; // Set by auth middleware
      const mfaData = await this.authService.generateMfaSecret(userId);

      return res.status(200).json({
        qrCode: mfaData.code,
        userId: mfaData.userId
      });
    } catch (error) {
      return this.handleAuthError(error, res);
    }
  }

  /**
   * MFA validation endpoint
   * 
   * @param req Express request object
   * @param res Express response object
   */
  @httpPost('/mfa/validate')
  async validateMfa(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, token } = req.body;
      const isValid = await this.authService.validateMfaToken(userId, token);

      return res.status(200).json({
        valid: isValid
      });
    } catch (error) {
      return this.handleAuthError(error, res);
    }
  }

  /**
   * Logout endpoint with token revocation
   * 
   * @param req Express request object
   * @param res Express response object
   */
  @httpPost('/logout')
  async logout(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id; // Set by auth middleware
      const currentToken = req.headers.authorization?.split(' ')[1];

      await this.authService.logout(userId, currentToken);

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      return res.status(200).json({
        message: 'Logout successful'
      });
    } catch (error) {
      return this.handleAuthError(error, res);
    }
  }

  /**
   * Centralized error handler for authentication operations
   * 
   * @param error Error object
   * @param res Express response object
   */
  private handleAuthError(error: any, res: Response): Response {
    const errorResponse = {
      code: error.name || 'AUTH_ERROR',
      message: error.message || 'An authentication error occurred'
    };

    switch (error.name) {
      case 'AuthenticationError':
        return res.status(401).json(errorResponse);
      case 'TokenValidationError':
        return res.status(401).json(errorResponse);
      case 'MfaValidationError':
        return res.status(401).json(errorResponse);
      case 'ValidationError':
        return res.status(400).json(errorResponse);
      default:
        return res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred'
        });
    }
  }
}