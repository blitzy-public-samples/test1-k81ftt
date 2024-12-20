/**
 * @fileoverview Enterprise-grade date utility functions for the Task Management System
 * Provides consistent date handling with timezone, locale, and accessibility support
 * @version 1.0.0
 */

import {
  format,
  isValid,
  parseISO,
  isFuture,
  isAfter,
  isBefore,
  differenceInDays,
  addDays,
  subDays,
} from 'date-fns';
import { DateRange } from '../types/common.types';

// Constants
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const DATE_RANGE_CACHE_SIZE = 100;
export const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'fr', 'de', 'es'];

// Types
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface DateRangeCacheEntry {
  range: DateRange;
  timestamp: number;
}

// Cache for date range calculations
const dateRangeCache = new Map<string, DateRangeCacheEntry>();

/**
 * Formats a date to YYYY-MM-DD format with locale support
 * @param date - Date object or ISO string to format
 * @param locale - Optional locale string (e.g., 'en-US')
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (date: Date | string, locale?: string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided');
    }

    return format(dateObj, DATE_FORMAT, {
      locale: locale && SUPPORTED_LOCALES.includes(locale) ? require(`date-fns/locale/${locale}`) : undefined
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
};

/**
 * Formats a date with time and timezone support
 * @param date - Date object or ISO string to format
 * @param timezone - Optional timezone identifier
 * @returns Formatted datetime string with timezone
 */
export const formatDateTime = (date: Date | string, timezone?: string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided');
    }

    const formattedDate = format(dateObj, DATETIME_FORMAT);
    return timezone ? `${formattedDate} ${timezone}` : formattedDate;
  } catch (error) {
    console.error('DateTime formatting error:', error);
    return '';
  }
};

/**
 * Validates a date string with enhanced error reporting
 * @param dateString - Date string to validate
 * @returns Validation result with detailed error message if invalid
 */
export const isValidDate = (dateString: string): ValidationResult => {
  if (!dateString) {
    return {
      isValid: false,
      error: 'Date is required'
    };
  }

  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateFormatRegex.test(dateString)) {
    return {
      isValid: false,
      error: 'Date must be in YYYY-MM-DD format'
    };
  }

  const parsedDate = parseISO(dateString);
  if (!isValid(parsedDate)) {
    return {
      isValid: false,
      error: 'Invalid date value'
    };
  }

  return { isValid: true };
};

/**
 * Checks if a date is in the future with timezone support
 * @param date - Date to check
 * @param timezone - Optional timezone identifier
 * @returns Validation result with error message if not future date
 */
export const isFutureDate = (date: Date | string, timezone?: string): ValidationResult => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return {
        isValid: false,
        error: 'Invalid date provided'
      };
    }

    // Add timezone offset if provided
    const adjustedDate = timezone
      ? new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }))
      : dateObj;

    if (!isFuture(adjustedDate)) {
      return {
        isValid: false,
        error: 'Date must be in the future'
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Error processing date'
    };
  }
};

/**
 * Calculates date range with timezone support and memoization
 * @param rangeType - Type of range to calculate
 * @param timezone - Optional timezone identifier
 * @returns DateRange object with start and end dates
 */
export const calculateDateRange = (
  rangeType: 'day' | 'week' | 'month' | 'year',
  timezone?: string
): DateRange => {
  const cacheKey = `${rangeType}-${timezone || 'default'}`;
  const now = new Date();
  const currentTimestamp = now.getTime();

  // Check cache first
  const cachedEntry = dateRangeCache.get(cacheKey);
  if (cachedEntry && (currentTimestamp - cachedEntry.timestamp) < 300000) { // 5 minutes cache
    return cachedEntry.range;
  }

  // Calculate new date range
  let startDate: Date;
  const endDate = timezone
    ? new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    : now;

  switch (rangeType) {
    case 'day':
      startDate = subDays(endDate, 1);
      break;
    case 'week':
      startDate = subDays(endDate, 7);
      break;
    case 'month':
      startDate = subDays(endDate, 30);
      break;
    case 'year':
      startDate = subDays(endDate, 365);
      break;
    default:
      throw new Error('Invalid range type');
  }

  // Manage cache size
  if (dateRangeCache.size >= DATE_RANGE_CACHE_SIZE) {
    const oldestKey = Array.from(dateRangeCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
    dateRangeCache.delete(oldestKey);
  }

  const range: DateRange = {
    startDate,
    endDate,
    timezone: timezone || 'UTC'
  };

  // Update cache
  dateRangeCache.set(cacheKey, {
    range,
    timestamp: currentTimestamp
  });

  return range;
};