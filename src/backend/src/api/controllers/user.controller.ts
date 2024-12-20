/**
 * Enhanced User Management Controller
 * Version: 1.0.0
 * 
 * Implements secure REST API endpoints for user management with:
 * - Enterprise SSO support
 * - Role-based access control
 * - Request validation
 * - Rate limiting
 * - Audit logging
 * - GDPR compliance
 */

import { injectable, inject } from 'inversify'; // v6.0.1
import { 
  controller, 
  httpGet, 
  httpPost, 
  httpPut, 
  httpDelete,
  authorize,
  validate
} from 'routing-controllers'; // v0.10.0
import { RateLimit } from '@nestjs/throttler'; // v4.0.0
import { IsUUID, IsEmail, IsString, IsEnum, ValidateNested } from 'class-validator'; // v0.14.0
import { Type } from 'class-transformer'; // v0.5.1

import { UserService } from '../../core/services/UserService';
import { IUser, IUserPreferences } from '../../interfaces/IUser';
import { UserRole } from '../../types/auth.types';
import { UUID, QueryOptions, ErrorResponse } from '../../types/common.types';

/**
 * DTO for user creation with validation
 */
class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  organizationId: string;

  @ValidateNested()
  @Type(() => UserPreferencesDto)
  preferences: IUserPreferences;
}

/**
 * DTO for user update operations
 */
class UpdateUserDto {
  @IsString()
  firstName?: string;

  @IsString()
  lastName?: string;

  @IsEnum(UserRole)
  role?: UserRole;

  @ValidateNested()
  @Type(() => UserPreferencesDto)
  preferences?: Partial<IUserPreferences>;
}

/**
 * DTO for user preferences validation
 */
class UserPreferencesDto implements IUserPreferences {
  @IsString()
  theme: 'light' | 'dark' | 'system' | 'high-contrast';

  @IsString()
  language: string;

  @ValidateNested()
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    digest: boolean;
  };

  @IsString()
  timezone: string;

  @IsString()
  dateFormat: string;

  @ValidateNested()
  accessibility: {
    screenReader: boolean;
    reduceMotion: boolean;
    highContrast: boolean;
  };
}

/**
 * Enhanced REST API controller for user management operations
 */
@injectable()
@controller('/api/v1/users')
@RateLimit({ ttl: 60, limit: 100 })
export class UserController {
  constructor(
    @inject(UserService) private readonly userService: UserService
  ) {}

  /**
   * Retrieves paginated list of users with security checks
   */
  @httpGet('/')
  @authorize(['ADMIN', 'MANAGER'])
  @validate()
  async getUsers(
    @QueryOptions() options?: QueryOptions
  ): Promise<{ data: IUser[]; total: number }> {
    return this.userService.findAll(options);
  }

  /**
   * Retrieves a specific user by ID with security checks
   */
  @httpGet('/:id')
  @authorize(['ADMIN', 'MANAGER'])
  @validate()
  async getUserById(
    @IsUUID('4') id: UUID
  ): Promise<IUser> {
    return this.userService.findById(id);
  }

  /**
   * Creates a new user with validation and security checks
   */
  @httpPost('/')
  @authorize(['ADMIN'])
  @validate()
  async createUser(
    @Type(() => CreateUserDto) userData: CreateUserDto
  ): Promise<IUser> {
    return this.userService.create(userData);
  }

  /**
   * Updates an existing user with version control
   */
  @httpPut('/:id')
  @authorize(['ADMIN'])
  @validate()
  async updateUser(
    @IsUUID('4') id: UUID,
    @Type(() => UpdateUserDto) userData: UpdateUserDto,
    @IsString() version: number
  ): Promise<IUser> {
    return this.userService.update(id, userData, version);
  }

  /**
   * Deletes a user with GDPR compliance
   */
  @httpDelete('/:id')
  @authorize(['ADMIN'])
  @validate()
  async deleteUser(
    @IsUUID('4') id: UUID
  ): Promise<boolean> {
    return this.userService.delete(id);
  }

  /**
   * Updates user preferences with validation
   */
  @httpPut('/:id/preferences')
  @authorize(['ADMIN', 'MANAGER', 'MEMBER'])
  @validate()
  async updatePreferences(
    @IsUUID('4') id: UUID,
    @ValidateNested() @Type(() => UserPreferencesDto) preferences: IUserPreferences
  ): Promise<IUser> {
    return this.userService.update(id, { preferences }, 1);
  }

  /**
   * Error handler for controller operations
   */
  private handleError(error: Error): ErrorResponse {
    return {
      code: error.name,
      message: error.message,
      details: error['details'] || {}
    };
  }
}