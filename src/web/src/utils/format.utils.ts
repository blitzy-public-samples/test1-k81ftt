/**
 * @fileoverview Enterprise-grade utility functions for consistent data formatting
 * Provides internationalization support, file size formatting, and status/priority display
 * @version 1.0.0
 */

import { formatNumber as intlFormatNumber, formatCurrency as intlFormatCurrency } from 'intl-number-format'; // v2.0.0
import { memoize } from 'lodash'; // v4.17.21
import { Status, Priority } from '../types/common.types';

// Constants for formatting configuration
const DEFAULT_LOCALE = 'en-US';
const DEFAULT_CURRENCY = 'USD';
const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
const DECIMAL_SEPARATOR = '.';
const THOUSAND_SEPARATOR = ',';
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
const MEMOIZE_MAX_SIZE = 1000;

/**
 * Formats a number with locale-specific formatting and proper error handling
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param locale - Locale string (default: DEFAULT_LOCALE)
 * @returns Formatted number string
 */
export const formatNumber = memoize((
  value: number,
  decimals: number = 2,
  locale: string = DEFAULT_LOCALE
): string => {
  try {
    if (value === null || value === undefined) {
      return '-';
    }

    if (!Number.isFinite(value) || Math.abs(value) > MAX_SAFE_INTEGER) {
      throw new Error('Invalid number value');
    }

    return intlFormatNumber(value, {
      locale,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true
    });
  } catch (error) {
    console.error('Error formatting number:', error);
    return '-';
  }
}, {
  maxSize: MEMOIZE_MAX_SIZE
});

/**
 * Formats currency with proper symbol placement and RTL support
 * @param value - The currency amount
 * @param currencyCode - ISO 4217 currency code (default: DEFAULT_CURRENCY)
 * @param locale - Locale string (default: DEFAULT_LOCALE)
 * @returns Formatted currency string
 */
export const formatCurrency = memoize((
  value: number,
  currencyCode: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string => {
  try {
    if (value === null || value === undefined) {
      return '-';
    }

    if (!Number.isFinite(value) || Math.abs(value) > MAX_SAFE_INTEGER) {
      throw new Error('Invalid currency value');
    }

    return intlFormatCurrency(value, {
      currency: currencyCode,
      locale,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '-';
  }
}, {
  maxSize: MEMOIZE_MAX_SIZE
});

/**
 * Formats percentage values with configurable precision
 * @param value - The decimal value (0.15 for 15%)
 * @param decimals - Number of decimal places (default: 1)
 * @param locale - Locale string (default: DEFAULT_LOCALE)
 * @returns Formatted percentage string
 */
export const formatPercentage = memoize((
  value: number,
  decimals: number = 1,
  locale: string = DEFAULT_LOCALE
): string => {
  try {
    if (value === null || value === undefined) {
      return '-';
    }

    if (!Number.isFinite(value)) {
      throw new Error('Invalid percentage value');
    }

    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return '-';
  }
}, {
  maxSize: MEMOIZE_MAX_SIZE
});

/**
 * Formats file size with automatic unit selection and localization
 * @param bytes - File size in bytes
 * @param locale - Locale string (default: DEFAULT_LOCALE)
 * @returns Formatted file size string
 */
export const formatFileSize = memoize((
  bytes: number,
  locale: string = DEFAULT_LOCALE
): string => {
  try {
    if (bytes === null || bytes === undefined || bytes < 0) {
      return '-';
    }

    if (!Number.isFinite(bytes)) {
      throw new Error('Invalid file size value');
    }

    const base = 1024;
    const unitIndex = bytes === 0 
      ? 0 
      : Math.floor(Math.log(bytes) / Math.log(base));
    
    const unit = FILE_SIZE_UNITS[Math.min(unitIndex, FILE_SIZE_UNITS.length - 1)];
    const value = bytes / Math.pow(base, unitIndex);

    return `${formatNumber(value, unitIndex === 0 ? 0 : 2, locale)} ${unit}`;
  } catch (error) {
    console.error('Error formatting file size:', error);
    return '-';
  }
}, {
  maxSize: MEMOIZE_MAX_SIZE
});

/**
 * Formats task status with internationalization support
 * @param status - Status enum value
 * @param locale - Locale string (default: DEFAULT_LOCALE)
 * @returns Formatted status string
 */
export const formatStatus = memoize((
  status: Status,
  locale: string = DEFAULT_LOCALE
): string => {
  try {
    if (!status || !Object.values(Status).includes(status)) {
      throw new Error('Invalid status value');
    }

    // TODO: Replace with proper i18n implementation
    const statusMessages: Record<Status, string> = {
      [Status.ACTIVE]: 'Active',
      [Status.INACTIVE]: 'Inactive',
      [Status.PENDING]: 'Pending',
      [Status.COMPLETED]: 'Completed',
      [Status.ARCHIVED]: 'Archived'
    };

    return statusMessages[status] || status;
  } catch (error) {
    console.error('Error formatting status:', error);
    return '-';
  }
}, {
  maxSize: MEMOIZE_MAX_SIZE
});

/**
 * Formats task priority with internationalization support
 * @param priority - Priority enum value
 * @param locale - Locale string (default: DEFAULT_LOCALE)
 * @returns Formatted priority string
 */
export const formatPriority = memoize((
  priority: Priority,
  locale: string = DEFAULT_LOCALE
): string => {
  try {
    if (!priority || !Object.values(Priority).includes(priority)) {
      throw new Error('Invalid priority value');
    }

    // TODO: Replace with proper i18n implementation
    const priorityMessages: Record<Priority, string> = {
      [Priority.LOW]: 'Low',
      [Priority.MEDIUM]: 'Medium',
      [Priority.HIGH]: 'High',
      [Priority.URGENT]: 'Urgent'
    };

    return priorityMessages[priority] || priority;
  } catch (error) {
    console.error('Error formatting priority:', error);
    return '-';
  }
}, {
  maxSize: MEMOIZE_MAX_SIZE
});

// Type definitions for function parameters
export interface FormatOptions {
  locale?: string;
  decimals?: number;
  currency?: string;
}

// Error handling types
export type FormatError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};