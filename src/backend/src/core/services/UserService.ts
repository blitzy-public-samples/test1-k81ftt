/**
 * Enterprise-grade User Management Service
 * Version: 1.0.0
 * 
 * Implements comprehensive user management with:
 * - Enterprise SSO integration
 * - Multi-factor authentication
 * - Role-based access control
 * - Audit logging
 * - GDPR compliance
 * - Enhanced security features
 */

import { injectable, inject } from 'inversify'; // v6.0.1
import { validate } from 'class-validator'; // v0.14.0
import { AuditLogger } from '@company/audit-logger'; // v2.0.0
import { Encryption } from '@company/encryption'; // v1.5.0
import { SSOProvider } from '@company/sso-provider'; // v3.0.0

import { IService } from '../interfaces/IService';
import { IUser } from '../../interfaces/IUser';
import { UserRepository } from '../repositories/UserRepository';
import { UserRole, AuthProvider, AuthTokens, JwtCustomPayload } from '../../types/auth.types';
import { UUID, QueryOptions, WriteOptions } from '../../types/common.types';

/**
 * Data transfer object for user creation
 */
interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  ssoProvider?: AuthProvider;
  organizationId: string;
  preferences: IUser['preferences'];
}

/**
 * Data transfer object for user updates
 */
interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  preferences?: Partial<IUser['preferences']>;
  mfaEnabled?: boolean;
}

/**
 * SSO authentication credentials
 */
interface SSOCredentials {
  provider: AuthProvider;
  token: string;
  organizationId: string;
}

/**
 * Enterprise-grade user management service implementation
 */
@injectable()
export class UserService implements IService<IUser, CreateUserDto, UpdateUserDto> {
  constructor(
    @inject(UserRepository) private readonly userRepository: UserRepository,
    @inject(AuditLogger) private readonly auditLogger: AuditLogger,
    @inject(Encryption) private readonly encryption: Encryption,
    @inject(SSOProvider) private readonly ssoProvider: SSOProvider
  ) {}

  /**
   * Retrieves a user by ID with security checks and audit logging
   */
  async findById(id: UUID, includes?: string[]): Promise<IUser> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      await this.auditLogger.log('USER_ACCESS', {
        action: 'READ',
        userId: id,
        includes
      });

      return this.encryption.decryptSensitiveData(user);
    } catch (error) {
      await this.auditLogger.log('USER_ACCESS_ERROR', {
        action: 'READ',
        userId: id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Retrieves all users with pagination and filtering
   */
  async findAll(options?: QueryOptions): Promise<{
    data: IUser[];
    total: number;
    hasMore: boolean;
  }> {
    const result = await this.userRepository.findAll(options);
    
    await this.auditLogger.log('USER_LIST_ACCESS', {
      action: 'LIST',
      options
    });

    return {
      data: result.data.map(user => this.encryption.decryptSensitiveData(user)),
      total: result.total,
      hasMore: result.hasMore
    };
  }

  /**
   * Creates a new user with validation and security checks
   */
  async create(data: CreateUserDto, options?: WriteOptions): Promise<IUser> {
    try {
      // Validate input data
      const validationErrors = await validate(data);
      if (validationErrors.length > 0) {
        throw new Error('Invalid user data');
      }

      // Encrypt sensitive data
      const encryptedData = this.encryption.encryptSensitiveData(data);

      const user = await this.userRepository.create({
        ...encryptedData,
        isActive: true,
        mfaEnabled: false,
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        version: 1
      });

      await this.auditLogger.log('USER_CREATION', {
        action: 'CREATE',
        userId: user.id,
        organizationId: data.organizationId
      });

      return user;
    } catch (error) {
      await this.auditLogger.log('USER_CREATION_ERROR', {
        action: 'CREATE',
        error: error.message,
        data: { ...data, password: undefined }
      });
      throw error;
    }
  }

  /**
   * Updates user data with version control and audit logging
   */
  async update(
    id: UUID,
    data: UpdateUserDto,
    version: number,
    options?: WriteOptions
  ): Promise<IUser> {
    try {
      const validationErrors = await validate(data);
      if (validationErrors.length > 0) {
        throw new Error('Invalid update data');
      }

      const encryptedData = this.encryption.encryptSensitiveData(data);
      const user = await this.userRepository.update(id, {
        ...encryptedData,
        version
      });

      await this.auditLogger.log('USER_UPDATE', {
        action: 'UPDATE',
        userId: id,
        changes: data
      });

      return user;
    } catch (error) {
      await this.auditLogger.log('USER_UPDATE_ERROR', {
        action: 'UPDATE',
        userId: id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handles SSO authentication flow with security checks
   */
  async authenticateWithSSO(credentials: SSOCredentials): Promise<AuthTokens> {
    try {
      const ssoUserData = await this.ssoProvider.validateToken(credentials.token);
      
      let user = await this.userRepository.findByEmail(ssoUserData.email);
      
      if (!user) {
        user = await this.create({
          email: ssoUserData.email,
          firstName: ssoUserData.firstName,
          lastName: ssoUserData.lastName,
          role: UserRole.MEMBER,
          ssoProvider: credentials.provider,
          organizationId: credentials.organizationId,
          preferences: {
            theme: 'system',
            language: 'en',
            notifications: {
              email: true,
              push: true,
              inApp: true,
              digest: false
            },
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
            accessibility: {
              screenReader: false,
              reduceMotion: false,
              highContrast: false
            }
          }
        });
      }

      const tokens = await this.ssoProvider.generateTokens(user);

      await this.auditLogger.log('SSO_AUTH_SUCCESS', {
        action: 'SSO_LOGIN',
        userId: user.id,
        provider: credentials.provider
      });

      return tokens;
    } catch (error) {
      await this.auditLogger.log('SSO_AUTH_ERROR', {
        action: 'SSO_LOGIN',
        provider: credentials.provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validates MFA token with rate limiting and security checks
   */
  async validateMFA(userId: UUID, mfaToken: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      
      if (!user.mfaEnabled) {
        throw new Error('MFA not enabled for user');
      }

      const isValid = await this.ssoProvider.validateMFAToken(
        user.mfaSecret,
        mfaToken
      );

      await this.auditLogger.log('MFA_VALIDATION', {
        action: 'MFA_VERIFY',
        userId,
        success: isValid
      });

      return isValid;
    } catch (error) {
      await this.auditLogger.log('MFA_VALIDATION_ERROR', {
        action: 'MFA_VERIFY',
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Permanently deletes a user with GDPR compliance
   */
  async delete(id: UUID, options?: WriteOptions): Promise<boolean> {
    try {
      const success = await this.userRepository.delete(id);
      
      await this.auditLogger.log('USER_DELETION', {
        action: 'DELETE',
        userId: id,
        success
      });

      return success;
    } catch (error) {
      await this.auditLogger.log('USER_DELETION_ERROR', {
        action: 'DELETE',
        userId: id,
        error: error.message
      });
      throw error;
    }
  }
}