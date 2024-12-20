// date-fns v2.30.0 - Core date manipulation utilities
import {
  format,
  isAfter,
  isBefore,
  differenceInHours,
  differenceInDays,
  addDays,
  startOfDay,
  endOfDay,
  parseISO,
  isValid
} from 'date-fns';

// date-fns-tz v2.0.0 - Timezone handling utilities
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

/**
 * Custom error class for date-related operations
 */
class DateHelperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateHelperError';
  }
}

/**
 * Input validation decorator
 */
function validateInput(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function(...args: any[]) {
    args.forEach((arg, index) => {
      if (arg instanceof Date && !isValid(arg)) {
        throw new DateHelperError(`Invalid date provided at parameter index ${index}`);
      }
    });
    return originalMethod.apply(this, args);
  };
  return descriptor;
}

/**
 * Timezone validation decorator
 */
function validateTimezone(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function(...args: any[]) {
    const timezone = args.find(arg => typeof arg === 'string');
    if (timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
      } catch (error) {
        throw new DateHelperError(`Invalid timezone: ${timezone}`);
      }
    }
    return originalMethod.apply(this, args);
  };
  return descriptor;
}

/**
 * Memoization decorator for caching frequent calculations
 */
function memoize(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const cache = new Map();
  
  descriptor.value = function(...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = originalMethod.apply(this, args);
    cache.set(key, result);
    return result;
  };
  return descriptor;
}

/**
 * Formats a date into a standardized string representation
 * @param date The date to format
 * @param formatString The desired format string
 * @param locale Optional locale for formatting
 * @returns Formatted date string
 */
@validateInput
@memoize
export function formatDate(date: Date, formatString: string, locale?: string): string {
  try {
    if (!formatString) {
      throw new DateHelperError('Format string is required');
    }
    return format(date, formatString, { locale });
  } catch (error) {
    throw new DateHelperError(`Error formatting date: ${error.message}`);
  }
}

/**
 * Validates if a date is in the future
 * @param date The date to validate
 * @param timezone Optional timezone for comparison
 * @returns Boolean indicating if date is in the future
 */
@validateInput
export function isValidFutureDate(date: Date, timezone?: string): boolean {
  try {
    const now = new Date();
    const compareDate = timezone ? utcToZonedTime(date, timezone) : date;
    const compareNow = timezone ? utcToZonedTime(now, timezone) : now;
    return isAfter(compareDate, compareNow);
  } catch (error) {
    throw new DateHelperError(`Error validating future date: ${error.message}`);
  }
}

/**
 * Calculates duration between two dates in hours
 * @param startDate Start date
 * @param endDate End date
 * @param timezone Optional timezone for calculation
 * @returns Number of hours between dates
 */
@validateInput
@memoize
export function calculateDuration(startDate: Date, endDate: Date, timezone?: string): number {
  try {
    const start = timezone ? utcToZonedTime(startDate, timezone) : startDate;
    const end = timezone ? utcToZonedTime(endDate, timezone) : endDate;
    return Math.abs(differenceInHours(end, start));
  } catch (error) {
    throw new DateHelperError(`Error calculating duration: ${error.message}`);
  }
}

/**
 * Calculates duration between two dates in days
 * @param startDate Start date
 * @param endDate End date
 * @param timezone Optional timezone for calculation
 * @returns Number of days between dates
 */
@validateInput
@memoize
export function calculateDurationInDays(startDate: Date, endDate: Date, timezone?: string): number {
  try {
    const start = timezone ? utcToZonedTime(startDate, timezone) : startDate;
    const end = timezone ? utcToZonedTime(endDate, timezone) : endDate;
    return Math.abs(differenceInDays(end, start));
  } catch (error) {
    throw new DateHelperError(`Error calculating duration in days: ${error.message}`);
  }
}

/**
 * Converts UTC date to user's timezone
 * @param date UTC date to convert
 * @param timezone Target timezone
 * @returns Date in user's timezone
 */
@validateInput
@validateTimezone
export function convertToUserTimezone(date: Date, timezone: string): Date {
  try {
    return utcToZonedTime(date, timezone);
  } catch (error) {
    throw new DateHelperError(`Error converting to user timezone: ${error.message}`);
  }
}

/**
 * Converts date from user's timezone to UTC
 * @param date Date in user's timezone
 * @param timezone Source timezone
 * @returns Date in UTC
 */
@validateInput
@validateTimezone
export function convertToUTC(date: Date, timezone: string): Date {
  try {
    return zonedTimeToUtc(date, timezone);
  } catch (error) {
    throw new DateHelperError(`Error converting to UTC: ${error.message}`);
  }
}

/**
 * Gets start and end of day for a given date
 * @param date The date to get boundaries for
 * @param timezone Optional timezone for calculation
 * @returns Object containing start and end of day
 */
@validateInput
@memoize
export function getDayBoundaries(date: Date, timezone?: string): { startOfDay: Date; endOfDay: Date } {
  try {
    const targetDate = timezone ? utcToZonedTime(date, timezone) : date;
    return {
      startOfDay: timezone ? zonedTimeToUtc(startOfDay(targetDate), timezone) : startOfDay(targetDate),
      endOfDay: timezone ? zonedTimeToUtc(endOfDay(targetDate), timezone) : endOfDay(targetDate)
    };
  } catch (error) {
    throw new DateHelperError(`Error getting day boundaries: ${error.message}`);
  }
}