/**
 * User Data Transfer Objects
 * Version: 1.0.0
 * 
 * Enterprise-grade DTOs for user-related operations with comprehensive validation
 * and security measures. Implements strict type checking and data sanitization.
 * 
 * @package TaskManagement
 * @subpackage DTO
 */

import { 
    IsEmail, 
    IsString, 
    IsEnum, 
    IsOptional, 
    IsBoolean, 
    Length, 
    Matches 
} from 'class-validator'; // ^0.14.0
import { IUser } from '../interfaces/IUser';
import { UserRole } from '../types/auth.types';

/**
 * DTO for creating new users with enhanced validation.
 * Implements strict input validation and security measures.
 */
export class CreateUserDto implements Pick<IUser, 'email' | 'firstName' | 'lastName' | 'role'> {
    @IsEmail({}, {
        message: 'Please provide a valid email address'
    })
    @Matches(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        {
            message: 'Email format is invalid'
        }
    )
    readonly email: string;

    @IsString()
    @Length(2, 50, {
        message: 'First name must be between 2 and 50 characters'
    })
    @Matches(
        /^[A-Za-z\s\-']+$/,
        {
            message: 'First name can only contain letters, spaces, hyphens, and apostrophes'
        }
    )
    readonly firstName: string;

    @IsString()
    @Length(2, 50, {
        message: 'Last name must be between 2 and 50 characters'
    })
    @Matches(
        /^[A-Za-z\s\-']+$/,
        {
            message: 'Last name can only contain letters, spaces, hyphens, and apostrophes'
        }
    )
    readonly lastName: string;

    @IsEnum(UserRole, {
        message: 'Invalid user role specified'
    })
    readonly role: UserRole;
}

/**
 * DTO for updating existing users with optional fields.
 * Implements partial updates with validation for each field.
 */
export class UpdateUserDto implements Partial<Pick<IUser, 'firstName' | 'lastName' | 'role' | 'isActive'>> {
    @IsOptional()
    @IsString()
    @Length(2, 50, {
        message: 'First name must be between 2 and 50 characters'
    })
    @Matches(
        /^[A-Za-z\s\-']+$/,
        {
            message: 'First name can only contain letters, spaces, hyphens, and apostrophes'
        }
    )
    readonly firstName?: string;

    @IsOptional()
    @IsString()
    @Length(2, 50, {
        message: 'Last name must be between 2 and 50 characters'
    })
    @Matches(
        /^[A-Za-z\s\-']+$/,
        {
            message: 'Last name can only contain letters, spaces, hyphens, and apostrophes'
        }
    )
    readonly lastName?: string;

    @IsOptional()
    @IsEnum(UserRole, {
        message: 'Invalid user role specified'
    })
    readonly role?: UserRole;

    @IsOptional()
    @IsBoolean({
        message: 'isActive must be a boolean value'
    })
    readonly isActive?: boolean;
}

/**
 * DTO for managing user preferences with comprehensive validation.
 * Implements strict validation for theme, language, notifications, and timezone.
 */
export class UpdateUserPreferencesDto {
    @IsOptional()
    @IsString()
    @Matches(
        /^(light|dark|system|high-contrast)$/,
        {
            message: 'Theme must be one of: light, dark, system, high-contrast'
        }
    )
    readonly theme?: string;

    @IsOptional()
    @IsString()
    @Matches(
        /^[a-z]{2}-[A-Z]{2}$/,
        {
            message: 'Language must be in ISO 639-1 format (e.g., en-US)'
        }
    )
    readonly language?: string;

    @IsOptional()
    @IsBoolean({
        message: 'notifications must be a boolean value'
    })
    readonly notifications?: boolean;

    @IsOptional()
    @IsString()
    @Matches(
        /^[A-Za-z_]+\/[A-Za-z_]+$/,
        {
            message: 'Timezone must be a valid IANA timezone identifier (e.g., America/New_York)'
        }
    )
    readonly timezone?: string;
}

/**
 * Type guard to validate CreateUserDto properties
 * @param obj - Object to validate as CreateUserDto
 */
export function isCreateUserDto(obj: any): obj is CreateUserDto {
    return (
        typeof obj === 'object' &&
        typeof obj.email === 'string' &&
        typeof obj.firstName === 'string' &&
        typeof obj.lastName === 'string' &&
        Object.values(UserRole).includes(obj.role)
    );
}

/**
 * Type guard to validate UpdateUserDto properties
 * @param obj - Object to validate as UpdateUserDto
 */
export function isUpdateUserDto(obj: any): obj is UpdateUserDto {
    return (
        typeof obj === 'object' &&
        (obj.firstName === undefined || typeof obj.firstName === 'string') &&
        (obj.lastName === undefined || typeof obj.lastName === 'string') &&
        (obj.role === undefined || Object.values(UserRole).includes(obj.role)) &&
        (obj.isActive === undefined || typeof obj.isActive === 'boolean')
    );
}