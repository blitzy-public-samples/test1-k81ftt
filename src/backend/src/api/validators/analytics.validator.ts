// @ts-strict
import { IsDate, IsOptional, IsUUID, IsEnum, IsISO8601, ValidateIf } from 'class-validator'; // v0.14.0
import { AnalyticsQueryDto, TimeGranularity } from '../../dto/analytics.dto';
import { ValidationError } from '../errors/validation.error';
import { ErrorResponse } from '../../types/common.types';
import { IAnalyticsQuery } from '../../interfaces/IAnalytics';

/**
 * Maximum allowed date range for analytics queries in days
 */
const MAX_DATE_RANGE_DAYS = 365;

/**
 * Valid grouping options for analytics data
 */
const VALID_GROUP_BY_OPTIONS = Object.values(TimeGranularity);

/**
 * Validation error codes for analytics validation
 */
const VALIDATION_ERROR_CODES = {
  INVALID_DATE_RANGE: 'ANALYTICS_001',
  INVALID_DATE_FORMAT: 'ANALYTICS_002',
  DATE_RANGE_TOO_LARGE: 'ANALYTICS_003',
  INVALID_UUID: 'ANALYTICS_004',
  INVALID_GROUP_BY: 'ANALYTICS_005',
  FUTURE_DATE: 'ANALYTICS_006',
  INTERNAL_ERROR: 'ANALYTICS_999'
} as const;

/**
 * Comprehensive validator class for analytics query parameters
 * Implements robust validation rules with security checks
 */
export class AnalyticsQueryValidator {
  private _lastValidationError: ErrorResponse | null = null;
  private _isValidating = false;

  /**
   * Validates analytics query parameters with comprehensive error handling
   * @param query - Analytics query parameters to validate
   * @returns Promise resolving to boolean indicating validation success
   * @throws ValidationError with detailed context on validation failure
   */
  public async validate(query: AnalyticsQueryDto): Promise<boolean> {
    try {
      this._isValidating = true;
      this._lastValidationError = null;

      // Validate date formats
      if (!this.validateDateFormat(query.startDate) || !this.validateDateFormat(query.endDate)) {
        throw new ValidationError(VALIDATION_ERROR_CODES.INVALID_DATE_FORMAT, 'Invalid date format. Dates must be in ISO8601 format.');
      }

      // Validate date range
      if (!this.validateDateRange(query.startDate, query.endDate)) {
        throw new ValidationError(VALIDATION_ERROR_CODES.INVALID_DATE_RANGE, 'Start date must be before end date.');
      }

      // Validate date range size
      if (!this.validateDateRangeSize(query.startDate, query.endDate)) {
        throw new ValidationError(
          VALIDATION_ERROR_CODES.DATE_RANGE_TOO_LARGE,
          `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days.`
        );
      }

      // Validate future dates
      if (this.isFutureDate(query.startDate) || this.isFutureDate(query.endDate)) {
        throw new ValidationError(VALIDATION_ERROR_CODES.FUTURE_DATE, 'Analytics dates cannot be in the future.');
      }

      // Validate UUIDs if provided
      if (query.projectId && !this.validateUUID(query.projectId)) {
        throw new ValidationError(VALIDATION_ERROR_CODES.INVALID_UUID, 'Invalid project ID format.');
      }

      if (query.userId && !this.validateUUID(query.userId)) {
        throw new ValidationError(VALIDATION_ERROR_CODES.INVALID_UUID, 'Invalid user ID format.');
      }

      // Validate groupBy parameter
      if (query.groupBy && !this.validateGroupBy(query.groupBy)) {
        throw new ValidationError(
          VALIDATION_ERROR_CODES.INVALID_GROUP_BY,
          `Invalid groupBy value. Must be one of: ${VALID_GROUP_BY_OPTIONS.join(', ')}`
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        this._lastValidationError = {
          code: error.code,
          message: error.message,
          details: error.details
        };
        throw error;
      }
      
      // Handle unexpected errors
      this._lastValidationError = {
        code: VALIDATION_ERROR_CODES.INTERNAL_ERROR,
        message: 'Internal validation error occurred.',
        details: { error: error.message }
      };
      throw new ValidationError(VALIDATION_ERROR_CODES.INTERNAL_ERROR, 'Internal validation error occurred.');
    } finally {
      this._isValidating = false;
    }
  }

  /**
   * Validates ISO8601 date format
   * @param date - Date to validate
   */
  private validateDateFormat(date: Date): boolean {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }
    return true;
  }

  /**
   * Validates date range order
   * @param startDate - Start date of range
   * @param endDate - End date of range
   */
  private validateDateRange(startDate: Date, endDate: Date): boolean {
    return startDate < endDate;
  }

  /**
   * Validates date range size against maximum allowed
   * @param startDate - Start date of range
   * @param endDate - End date of range
   */
  private validateDateRangeSize(startDate: Date, endDate: Date): boolean {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= MAX_DATE_RANGE_DAYS;
  }

  /**
   * Checks if date is in the future
   * @param date - Date to check
   */
  private isFutureDate(date: Date): boolean {
    return date > new Date();
  }

  /**
   * Validates UUID format
   * @param uuid - UUID string to validate
   */
  private validateUUID(uuid: string): boolean {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return UUID_REGEX.test(uuid);
  }

  /**
   * Validates groupBy parameter against allowed values
   * @param groupBy - GroupBy value to validate
   */
  private validateGroupBy(groupBy: string): boolean {
    return VALID_GROUP_BY_OPTIONS.includes(groupBy as TimeGranularity);
  }

  /**
   * Gets the last validation error if any
   */
  public getLastValidationError(): ErrorResponse | null {
    return this._lastValidationError;
  }

  /**
   * Checks if validation is currently in progress
   */
  public isValidating(): boolean {
    return this._isValidating;
  }
}

/**
 * High-level validation function for analytics queries
 * Implements comprehensive validation with error handling
 * @param query - Analytics query parameters to validate
 * @returns Promise resolving to boolean indicating validation success
 * @throws ValidationError with detailed context on validation failure
 */
export async function validateAnalyticsQuery(query: AnalyticsQueryDto): Promise<boolean> {
  const validator = new AnalyticsQueryValidator();
  return validator.validate(query);
}