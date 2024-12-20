/**
 * @fileoverview Generic service interface that defines standard business logic operations
 * and service layer abstractions. Implements the service layer pattern with enhanced
 * type safety, validation, and error handling support.
 * @version 1.0.0
 */

import { BaseEntity, UUID } from '../../types/common.types';

/**
 * Options for query operations including pagination, sorting, filtering and relations
 */
export interface QueryOptions {
  pagination?: {
    page: number;
    limit: number;
  };
  sort?: Array<{
    field: string;
    order: 'ASC' | 'DESC';
  }>;
  filters?: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
    value: unknown;
  }>;
  includes?: string[];
}

/**
 * Options for write operations (create, update, delete)
 */
export interface WriteOptions {
  emitEvents?: boolean;
  skipValidation?: boolean;
}

/**
 * Bulk operation result interface
 */
export interface BulkOperationResult<T, E> {
  successful: T[];
  failed: Array<{
    data: E;
    error: Error;
  }>;
}

/**
 * Generic service interface that defines standard business logic operations
 * @template T - Entity type that extends BaseEntity
 * @template CreateDTO - Data transfer object type for create operations
 * @template UpdateDTO - Data transfer object type for update operations
 */
export interface IService<T extends BaseEntity, CreateDTO, UpdateDTO> {
  /**
   * Retrieves a single entity by its unique identifier
   * @param id - Entity unique identifier
   * @param includes - Optional relations to include
   * @throws EntityNotFoundError if entity doesn't exist
   * @throws ValidationError if id is invalid
   */
  findById(id: UUID, includes?: string[]): Promise<T>;

  /**
   * Retrieves all entities with support for pagination, sorting, and filtering
   * @param options - Query options for pagination, sorting, filtering and relations
   * @returns Paginated result with total count and hasMore flag
   * @throws ValidationError if query options are invalid
   */
  findAll(options?: QueryOptions): Promise<{
    data: T[];
    total: number;
    hasMore: boolean;
  }>;

  /**
   * Creates a new entity with validation and business rules
   * @param data - Data transfer object for entity creation
   * @param options - Optional write operation settings
   * @throws ValidationError if data is invalid
   * @throws BusinessRuleError if business rules are violated
   */
  create(data: CreateDTO, options?: WriteOptions): Promise<T>;

  /**
   * Updates an existing entity with optimistic locking
   * @param id - Entity unique identifier
   * @param data - Data transfer object for entity update
   * @param version - Entity version for optimistic locking
   * @param options - Optional write operation settings
   * @throws EntityNotFoundError if entity doesn't exist
   * @throws ValidationError if data is invalid
   * @throws VersionConflictError if version mismatch
   */
  update(id: UUID, data: UpdateDTO, version: number, options?: WriteOptions): Promise<T>;

  /**
   * Permanently deletes an entity
   * @param id - Entity unique identifier
   * @param options - Optional write operation settings
   * @throws EntityNotFoundError if entity doesn't exist
   * @throws BusinessRuleError if deletion is not allowed
   */
  delete(id: UUID, options?: WriteOptions): Promise<boolean>;

  /**
   * Validates entity data against business rules
   * @param data - Data to validate
   * @param operation - Operation type for context-specific validation
   * @throws ValidationError with detailed error messages
   */
  validate(data: CreateDTO | UpdateDTO, operation: 'create' | 'update'): Promise<void>;

  /**
   * Creates multiple entities in a single transaction
   * @param data - Array of create DTOs
   * @param options - Optional write operation settings
   * @returns Object containing successful and failed operations
   */
  bulkCreate(
    data: CreateDTO[],
    options?: WriteOptions
  ): Promise<BulkOperationResult<T, CreateDTO>>;

  /**
   * Updates multiple entities in a single transaction
   * @param updates - Array of update operations with id, data and version
   * @param options - Optional write operation settings
   * @returns Object containing successful and failed operations
   */
  bulkUpdate(
    updates: Array<{ id: UUID; data: UpdateDTO; version: number }>,
    options?: WriteOptions
  ): Promise<BulkOperationResult<T, { id: UUID; data: UpdateDTO }>>;

  /**
   * Marks an entity as deleted without removing it
   * @param id - Entity unique identifier
   * @param options - Optional write operation settings
   * @throws EntityNotFoundError if entity doesn't exist
   */
  softDelete(id: UUID, options?: WriteOptions): Promise<boolean>;
}