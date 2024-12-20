// @ts-strict
import { IsInt, IsUUID, Min, Max, IsBoolean, IsDate, IsEnum } from 'class-validator'; // v0.14.0

/**
 * Branded type for UUID to ensure type safety and validation
 * Follows RFC 4122 UUID v4 format
 */
export type UUID = string & { readonly brand: unique symbol };

/**
 * Utility type to make all properties in an object deeply readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Utility type to remove null and undefined from type T
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Base interface for all entities in the system
 * Provides immutable common fields with strict typing
 */
export interface BaseEntity {
  readonly id: UUID;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
}

/**
 * Interface for standardized pagination with validation constraints
 */
export class Pagination {
  @IsInt()
  @Min(1)
  page: number;

  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;

  @IsInt()
  @Min(0)
  total: number;

  @IsBoolean()
  hasMore: boolean;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.hasMore = total > page * limit;
  }
}

/**
 * Enumeration for sort order directions
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

/**
 * Type guard function to validate UUID format at runtime
 * @param value - String to validate as UUID
 * @returns boolean indicating if the value is a valid UUID
 */
export function isUUID(value: string): value is UUID {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Class decorator for entities requiring UUID validation
 */
export function ValidateUUID() {
  return function (target: any, propertyKey: string) {
    IsUUID('4')(target, propertyKey);
  };
}

/**
 * Class decorator for entities requiring timestamp validation
 */
export function ValidateTimestamp() {
  return function (target: any, propertyKey: string) {
    IsDate()(target, propertyKey);
  };
}

/**
 * Type guard for SortOrder enum validation
 * @param value - Value to check against SortOrder enum
 */
export function isSortOrder(value: any): value is SortOrder {
  return Object.values(SortOrder).includes(value);
}

/**
 * Base class for implementing entities with validation
 */
export abstract class ValidatedBaseEntity implements BaseEntity {
  @ValidateUUID()
  readonly id: UUID;

  @ValidateTimestamp()
  readonly createdAt: Date;

  @ValidateTimestamp()
  readonly updatedAt: Date;

  @IsInt()
  @Min(1)
  readonly version: number;

  constructor(id: UUID, createdAt: Date = new Date(), updatedAt: Date = new Date(), version: number = 1) {
    this.id = id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }
}

/**
 * Type for generic error response
 */
export interface ErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Type for successful response with pagination
 */
export interface PaginatedResponse<T> {
  readonly data: T[];
  readonly pagination: Pagination;
}