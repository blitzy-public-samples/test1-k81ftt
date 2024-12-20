/**
 * Enterprise-grade User Model
 * Version: 1.0.0
 * 
 * Implements comprehensive user management with enhanced security features,
 * GDPR compliance, audit logging, and role-based access control.
 * 
 * @package TaskManagement
 * @subpackage Models
 */

import { 
    Column, 
    Entity, 
    PrimaryGeneratedColumn, 
    Index 
} from 'typeorm'; // ^0.3.0

import { 
    Exclude, 
    Transform 
} from 'class-transformer'; // ^0.5.0

import { 
    IsEmail, 
    Length, 
    IsEnum 
} from 'class-validator'; // ^0.14.0

import { IUser, IUserPreferences } from '../interfaces/IUser';
import { UserRole } from '../types/auth.types';
import { BaseEntity } from '../types/common.types';

/**
 * User entity implementing enterprise security features and GDPR compliance
 */
@Entity('users')
@Index(['email'], { unique: true })
@Index(['lastLoginAt'])
export class User implements IUser, BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @IsEmail()
    email: string;

    @Column()
    @Length(1, 100)
    firstName: string;

    @Column()
    @Length(1, 100)
    lastName: string;

    @Column()
    @Exclude()
    passwordHash: string | null;

    @Column({ nullable: true })
    @Exclude()
    mfaSecret: string | null;

    @Column({ type: 'enum', enum: UserRole })
    @IsEnum(UserRole)
    role: UserRole;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    lastLoginAt: Date;

    @Column({ nullable: true })
    lastLoginIp: string;

    @Column({ default: 0 })
    failedLoginAttempts: number;

    @Column({ nullable: true })
    accountLockoutUntil: Date;

    @Column({ default: false })
    mfaEnabled: boolean;

    @Column({ nullable: true })
    @Transform(({ value }) => value ? '**encrypted**' : null)
    encryptedRecoveryKey: string | null;

    @Column({ type: 'jsonb' })
    preferences: IUserPreferences;

    @Column({ default: false })
    gdprConsentGiven: boolean;

    @Column({ nullable: true })
    gdprConsentDate: Date;

    @Column()
    createdAt: Date;

    @Column()
    updatedAt: Date;

    @Column({ nullable: true })
    deletedAt: Date;

    /**
     * Creates a new User instance with required fields and security defaults
     * 
     * @param email - User's email address
     * @param firstName - User's first name
     * @param lastName - User's last name
     * @param role - User's role for RBAC
     */
    constructor(
        email: string,
        firstName: string,
        lastName: string,
        role: UserRole = UserRole.MEMBER
    ) {
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.role = role;
        this.isActive = true;
        this.failedLoginAttempts = 0;
        this.mfaEnabled = false;
        this.gdprConsentGiven = false;
        
        // Initialize default preferences with accessibility options
        this.preferences = {
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
        };

        // Set timestamps
        const now = new Date();
        this.createdAt = now;
        this.updatedAt = now;
    }

    /**
     * Returns the user's full name
     * @returns {string} Concatenated first and last name
     */
    getFullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    /**
     * Updates login-related security information
     * @param ipAddress - IP address of the login attempt
     */
    updateLastLogin(ipAddress: string): void {
        const now = new Date();
        this.lastLoginAt = now;
        this.lastLoginIp = ipAddress;
        this.failedLoginAttempts = 0;
        this.accountLockoutUntil = null;
        this.updatedAt = now;
    }

    /**
     * Records failed login attempt and manages account lockout
     * @returns {boolean} Whether account is now locked
     */
    recordFailedLogin(): boolean {
        const MAX_FAILED_ATTEMPTS = 5;
        const LOCKOUT_DURATION_MINUTES = 30;

        this.failedLoginAttempts += 1;
        this.updatedAt = new Date();

        if (this.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
            this.accountLockoutUntil = new Date(
                Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
            );
            return true;
        }

        return false;
    }

    /**
     * Records user's GDPR consent with timestamp
     * @param consentGiven - Whether consent was given
     */
    setGDPRConsent(consentGiven: boolean): void {
        this.gdprConsentGiven = consentGiven;
        this.gdprConsentDate = consentGiven ? new Date() : null;
        this.updatedAt = new Date();
    }

    /**
     * Soft deletes the user account for GDPR compliance
     */
    markAsDeleted(): void {
        this.isActive = false;
        this.deletedAt = new Date();
        this.email = `deleted_${this.id}@redacted.local`;
        this.firstName = 'REDACTED';
        this.lastName = 'REDACTED';
        this.passwordHash = null;
        this.mfaSecret = null;
        this.lastLoginIp = null;
        this.encryptedRecoveryKey = null;
        this.updatedAt = new Date();
    }

    /**
     * Checks if the account is currently locked
     * @returns {boolean} Whether the account is locked
     */
    isAccountLocked(): boolean {
        if (!this.accountLockoutUntil) {
            return false;
        }
        return this.accountLockoutUntil > new Date();
    }
}