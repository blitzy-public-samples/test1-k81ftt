/**
 * @fileoverview Generic repository interface implementing the repository pattern
 * with enhanced support for complex querying, audit logging, and type safety.
 * Version: 1.0.0
 */

import { BaseEntity, UUID } from '../../types/common.types';

/**
 * Interface for pagination parameters in query options
 */
interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Interface for sorting parameters in query options
 */
interface SortParams {
  field: string;
  direction: 'ASC' | 'DESC';
}

/**
 * Interface for filtering parameters in query options
 */
interface FilterParams {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
  value: unknown;
}

/**
 * Interface for query options supporting complex operations
 */
interface QueryOptions {
  pagination?: PaginationParams;
  sort?: SortParams[];
  filters?: FilterParams[];
  includes?: string[];
  select?: string[];
}

/**
 * Generic repository interface that defines standard data access operations
 * with enhanced support for complex querying, audit logging, and type safety.
 * 
 * @template T - Entity type that extends BaseEntity
 */
export interface IRepository<T extends BaseEntity> {
  /**
   * Retrieves a single entity by its unique identifier
   * 
   * @param id - Unique identifier of the entity
   * @returns Promise resolving to the entity or null if not found
   * @throws RepositoryError if database operation fails
   */
  findById(id: UUID): Promise<T | null>;

  /**
   * Retrieves all entities matching the specified criteria with pagination
   * 
   * @param options - Query options for filtering, sorting, and pagination
   * @returns Promise resolving to paginated result with metadata
   * @throws RepositoryError if database operation fails
   */
  findAll(options?: QueryOptions): Promise<{
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;

  /**
   * Creates a new entity with automatic timestamp handling
   * 
   * @param data - Partial entity data for creation
   * @returns Promise resolving to the created entity
   * @throws RepositoryError if validation fails or database operation fails
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Updates an existing entity with optimistic locking
   * 
   * @param id - Unique identifier of the entity to update
   * @param data - Partial entity data for update
   * @returns Promise resolving to the updated entity
   * @throws RepositoryError if entity not found, version conflict, or database operation fails
   */
  update(id: UUID, data: Partial<T>): Promise<T>;

  /**
   * Deletes an entity with cascading options
   * 
   * @param id - Unique identifier of the entity to delete
   * @returns Promise resolving to boolean indicating success
   * @throws RepositoryError if entity not found or database operation fails
   */
  delete(id: UUID): Promise<boolean>;

  /**
   * Counts total number of entities matching the specified criteria
   * 
   * @param filters - Optional filter criteria
   * @returns Promise resolving to the total count
   * @throws RepositoryError if database operation fails
   */
  count(filters?: FilterParams[]): Promise<number>;

  /**
   * Performs a transaction with multiple operations
   * 
   * @param operations - Function containing repository operations to execute in transaction
   * @returns Promise resolving to the transaction result
   * @throws RepositoryError if transaction fails
   */
  transaction<R>(operations: () => Promise<R>): Promise<R>;

  /**
   * Checks if an entity exists by its identifier
   * 
   * @param id - Unique identifier to check
   * @returns Promise resolving to boolean indicating existence
   * @throws RepositoryError if database operation fails
   */
  exists(id: UUID): Promise<boolean>;
}