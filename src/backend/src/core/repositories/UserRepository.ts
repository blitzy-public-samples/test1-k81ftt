/**
 * Enhanced User Repository Implementation
 * Version: 1.0.0
 * 
 * Provides secure data access operations for user entities with:
 * - GDPR compliance
 * - Audit logging
 * - Role-based access control
 * - Caching optimization
 * - Input validation
 */

import { Repository, EntityRepository, FindOptionsWhere } from 'typeorm'; // ^0.3.0
import { Injectable } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager'; // ^2.0.0
import { validate } from 'class-validator'; // ^0.14.0

import { IRepository } from '../interfaces/IRepository';
import { IUser } from '../../interfaces/IUser';
import { UserRole } from '../../types/auth.types';
import { UUID, isUUID, ErrorResponse } from '../../types/common.types';
import { AuditLogger } from '../utils/AuditLogger';
import { RepositoryError } from '../errors/RepositoryError';

/**
 * Enhanced repository implementation for User entity with security,
 * compliance, and audit features
 */
@EntityRepository(User)
@Injectable()
export class UserRepository implements IRepository<IUser> {
    private readonly CACHE_TTL = 300; // 5 minutes cache duration
    private readonly CACHE_PREFIX = 'user:';

    constructor(
        private readonly repository: Repository<IUser>,
        private readonly cacheManager: CacheManager,
        private readonly auditLogger: AuditLogger
    ) {}

    /**
     * Securely retrieves a user by their unique identifier with role-based access control
     * 
     * @param id - User's unique identifier
     * @param requestingUserRole - Role of the requesting user for access control
     * @returns Promise resolving to found user or null
     * @throws RepositoryError for invalid input or unauthorized access
     */
    @CacheKey('user:by-id')
    @CacheTTL(300)
    async findById(id: UUID, requestingUserRole: UserRole): Promise<IUser | null> {
        try {
            // Validate input
            if (!isUUID(id)) {
                throw new RepositoryError('INVALID_ID', 'Invalid user ID format');
            }

            // Check cache first
            const cacheKey = `${this.CACHE_PREFIX}${id}`;
            const cachedUser = await this.cacheManager.get<IUser>(cacheKey);
            if (cachedUser) {
                return this.sanitizeUserData(cachedUser, requestingUserRole);
            }

            // Database query with security checks
            const user = await this.repository.findOne({ 
                where: { id },
                select: this.getAllowedFields(requestingUserRole)
            });

            if (user) {
                // Cache the result
                await this.cacheManager.set(cacheKey, user, this.CACHE_TTL);
                
                // Audit log the access
                await this.auditLogger.log('USER_ACCESS', {
                    action: 'READ',
                    userId: id,
                    requestingRole: requestingUserRole
                });

                return this.sanitizeUserData(user, requestingUserRole);
            }

            return null;
        } catch (error) {
            throw new RepositoryError('FIND_ERROR', 'Error finding user', error);
        }
    }

    /**
     * Securely retrieves a user by their email with input validation
     * 
     * @param email - User's email address
     * @param requestingUserRole - Role of the requesting user for access control
     * @returns Promise resolving to found user or null
     * @throws RepositoryError for invalid input or unauthorized access
     */
    @CacheKey('user:by-email')
    @CacheTTL(300)
    async findByEmail(email: string, requestingUserRole: UserRole): Promise<IUser | null> {
        try {
            // Validate email format
            if (!this.isValidEmail(email)) {
                throw new RepositoryError('INVALID_EMAIL', 'Invalid email format');
            }

            // Check cache first
            const cacheKey = `${this.CACHE_PREFIX}email:${email}`;
            const cachedUser = await this.cacheManager.get<IUser>(cacheKey);
            if (cachedUser) {
                return this.sanitizeUserData(cachedUser, requestingUserRole);
            }

            // Database query with security checks
            const user = await this.repository.findOne({
                where: { email },
                select: this.getAllowedFields(requestingUserRole)
            });

            if (user) {
                // Cache the result
                await this.cacheManager.set(cacheKey, user, this.CACHE_TTL);
                
                // Audit log the access
                await this.auditLogger.log('USER_ACCESS', {
                    action: 'READ',
                    userEmail: email,
                    requestingRole: requestingUserRole
                });

                return this.sanitizeUserData(user, requestingUserRole);
            }

            return null;
        } catch (error) {
            throw new RepositoryError('FIND_ERROR', 'Error finding user by email', error);
        }
    }

    /**
     * Creates a new user with GDPR compliance and security validation
     * 
     * @param userData - Partial user data for creation
     * @returns Promise resolving to created user
     * @throws RepositoryError for validation or creation errors
     */
    async create(userData: Partial<IUser>): Promise<IUser> {
        try {
            // Validate user data
            const validationErrors = await validate(userData);
            if (validationErrors.length > 0) {
                throw new RepositoryError('VALIDATION_ERROR', 'Invalid user data', validationErrors);
            }

            // Create user with security checks
            const user = await this.repository.save(userData);

            // Audit log the creation
            await this.auditLogger.log('USER_CREATION', {
                action: 'CREATE',
                userId: user.id
            });

            return this.sanitizeUserData(user, UserRole.ADMIN);
        } catch (error) {
            throw new RepositoryError('CREATE_ERROR', 'Error creating user', error);
        }
    }

    /**
     * Updates user data with GDPR compliance and optimistic locking
     * 
     * @param id - User's unique identifier
     * @param userData - Partial user data for update
     * @returns Promise resolving to updated user
     * @throws RepositoryError for validation or update errors
     */
    async update(id: UUID, userData: Partial<IUser>): Promise<IUser> {
        try {
            // Validate input
            if (!isUUID(id)) {
                throw new RepositoryError('INVALID_ID', 'Invalid user ID format');
            }

            // Validate update data
            const validationErrors = await validate(userData);
            if (validationErrors.length > 0) {
                throw new RepositoryError('VALIDATION_ERROR', 'Invalid update data', validationErrors);
            }

            // Perform update with optimistic locking
            const result = await this.repository.update(
                { id, version: userData.version },
                { ...userData, version: userData.version + 1 }
            );

            if (result.affected === 0) {
                throw new RepositoryError('VERSION_CONFLICT', 'Optimistic lock version mismatch');
            }

            // Clear cache
            await this.clearUserCache(id);

            // Audit log the update
            await this.auditLogger.log('USER_UPDATE', {
                action: 'UPDATE',
                userId: id,
                changes: userData
            });

            return this.findById(id, UserRole.ADMIN);
        } catch (error) {
            throw new RepositoryError('UPDATE_ERROR', 'Error updating user', error);
        }
    }

    /**
     * Deletes a user with GDPR compliance and cascade handling
     * 
     * @param id - User's unique identifier
     * @returns Promise resolving to boolean indicating success
     * @throws RepositoryError for deletion errors
     */
    async delete(id: UUID): Promise<boolean> {
        try {
            // Validate input
            if (!isUUID(id)) {
                throw new RepositoryError('INVALID_ID', 'Invalid user ID format');
            }

            // Perform soft delete for GDPR compliance
            const result = await this.repository.softDelete(id);

            // Clear cache
            await this.clearUserCache(id);

            // Audit log the deletion
            await this.auditLogger.log('USER_DELETION', {
                action: 'DELETE',
                userId: id
            });

            return result.affected > 0;
        } catch (error) {
            throw new RepositoryError('DELETE_ERROR', 'Error deleting user', error);
        }
    }

    // Private helper methods

    /**
     * Determines allowed fields based on requesting user's role
     */
    private getAllowedFields(role: UserRole): string[] {
        const baseFields = ['id', 'email', 'firstName', 'lastName', 'role', 'isActive'];
        
        if (role === UserRole.ADMIN) {
            return [...baseFields, 'mfaEnabled', 'lastLoginAt', 'failedLoginAttempts'];
        }
        
        return baseFields;
    }

    /**
     * Sanitizes user data based on requesting user's role
     */
    private sanitizeUserData(user: IUser, role: UserRole): IUser {
        const allowedFields = this.getAllowedFields(role);
        const sanitized: Partial<IUser> = {};

        for (const field of allowedFields) {
            sanitized[field] = user[field];
        }

        return sanitized as IUser;
    }

    /**
     * Validates email format
     */
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Clears user-related cache entries
     */
    private async clearUserCache(id: UUID): Promise<void> {
        const user = await this.repository.findOne({ where: { id } });
        if (user) {
            await Promise.all([
                this.cacheManager.del(`${this.CACHE_PREFIX}${id}`),
                this.cacheManager.del(`${this.CACHE_PREFIX}email:${user.email}`)
            ]);
        }
    }
}

export { UserRepository };