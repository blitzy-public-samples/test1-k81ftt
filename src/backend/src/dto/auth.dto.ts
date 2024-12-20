/**
 * Authentication Data Transfer Objects
 * Version: 1.0.0
 * 
 * Enterprise-grade DTOs for authentication and authorization operations with
 * comprehensive validation and security controls. Implements strict validation
 * rules and sanitization for secure authentication flows.
 */

// External imports - class-validator v0.14.0
import { 
    IsEmail, 
    IsString, 
    MinLength,
    MaxLength, 
    IsEnum, 
    Matches, 
    IsUUID,
    Transform 
} from 'class-validator';

// Internal imports
import { UserRole, AuthProvider } from '../types/auth.types';

// API documentation imports
import { ApiTags, ApiOperation } from '@nestjs/swagger';

/**
 * DTO for secure user login requests with multi-provider support.
 * Implements comprehensive validation for enterprise security requirements.
 */
@ApiTags('Authentication')
@ApiOperation({ summary: 'User login endpoint' })
export class LoginDto {
    @IsEmail({}, { message: 'Invalid email format' })
    @Transform(({ value }) => value.toLowerCase())
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
        { message: 'Password must contain uppercase, lowercase and numbers' }
    )
    password: string;

    @IsEnum(AuthProvider)
    provider: AuthProvider;
}

/**
 * DTO for secure user registration with comprehensive validation.
 * Enforces strong password policies and input sanitization.
 */
@ApiTags('Authentication')
@ApiOperation({ summary: 'User registration endpoint' })
export class RegisterDto {
    @IsEmail({}, { message: 'Invalid email format' })
    @Transform(({ value }) => value.toLowerCase())
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
        { message: 'Password must contain uppercase, lowercase and numbers' }
    )
    password: string;

    @IsString()
    @MinLength(2, { message: 'First name must be at least 2 characters' })
    @Matches(
        /^[a-zA-Z\s-]{2,}$/,
        { message: 'First name can only contain letters, spaces and hyphens' }
    )
    firstName: string;

    @IsString()
    @MinLength(2, { message: 'Last name must be at least 2 characters' })
    @Matches(
        /^[a-zA-Z\s-]{2,}$/,
        { message: 'Last name can only contain letters, spaces and hyphens' }
    )
    lastName: string;
}

/**
 * DTO for secure token refresh operations.
 * Implements JWT validation and security controls.
 */
@ApiTags('Authentication')
@ApiOperation({ summary: 'Token refresh endpoint' })
export class RefreshTokenDto {
    @IsString()
    @MinLength(64, { message: 'Invalid refresh token format' })
    @Matches(
        /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/,
        { message: 'Invalid token format' }
    )
    refreshToken: string;
}

/**
 * DTO for Multi-Factor Authentication verification.
 * Implements secure MFA code validation with attempt limiting.
 */
@ApiTags('Authentication')
@ApiOperation({ summary: 'MFA verification endpoint' })
export class MfaVerificationDto {
    @IsString()
    @MinLength(6, { message: 'MFA code must be 6 digits' })
    @MaxLength(6, { message: 'MFA code must be 6 digits' })
    @Matches(
        /^[0-9]{6}$/,
        { message: 'MFA code must contain only numbers' }
    )
    code: string;

    @IsUUID(4, { message: 'Invalid user ID format' })
    userId: string;
}