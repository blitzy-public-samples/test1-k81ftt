/**
 * @fileoverview Test suite for validation utilities
 * @version 1.0.0
 */

import { describe, it, expect } from '@jest/globals'; // v29.0.0
import {
  validateEmail,
  validatePassword,
  validateLength,
  validateRequired,
  validateFutureDate
} from '../../src/utils/validation.utils';
import {
  USER_VALIDATION,
  TASK_VALIDATION,
  PROJECT_VALIDATION,
  VALIDATION_MESSAGES
} from '../../src/constants/validation.constants';

describe('validateEmail', () => {
  const validEmails = [
    'user@example.com',
    'test.user@domain.co.uk',
    'user+label@domain.com',
    'first.last@subdomain.domain.com',
    'user@domain-with-hyphen.com',
    '_valid@domain.com',
    '1234567890@domain.com',
    'email@domain.name',
    'email@domain.co.jp'
  ];

  const invalidEmails = [
    '',
    ' ',
    null,
    undefined,
    'invalid@email',
    '@domain.com',
    'user@.com',
    'user@domain@com',
    'user name@domain.com',
    'user@domain..com',
    '.user@domain.com',
    'user.@domain.com',
    'user..name@domain.com',
    'a'.repeat(255) + '@domain.com', // Exceeds max length
    'user@' + 'a'.repeat(255) + '.com', // Domain exceeds max length
    '<script>alert("xss")</script>@domain.com', // XSS attempt
    'user@domain.com\'--', // SQL injection attempt
  ];

  it.each(validEmails)('should validate correct email format: %s', (email) => {
    expect(validateEmail(email)).toBe(true);
  });

  it.each(invalidEmails)('should reject invalid email format: %s', (email) => {
    expect(validateEmail(email as string)).toBe(false);
  });
});

describe('validatePassword', () => {
  const validPasswords = [
    'Test123!@',
    'Password123$',
    'Complex1!Password',
    'Str0ng#Pass2023',
    'V3ryC0mpl3x!',
    'P@ssw0rd123',
    '!Abcd1234',
    'Test@9876'
  ];

  const invalidPasswords = [
    '',
    ' ',
    null,
    undefined,
    'password',
    '12345678',
    'NoSpecial1',
    'nouppercasechar1!',
    'NOLOWERCASECHAR1!',
    'NoNumber!',
    'Short1!',
    'a'.repeat(129), // Excessive length
    '<script>alert(1)</script>', // XSS attempt
    'password\'; DROP TABLE users;--' // SQL injection attempt
  ];

  it.each(validPasswords)('should validate correct password format: %s', (password) => {
    expect(validatePassword(password)).toBe(true);
  });

  it.each(invalidPasswords)('should reject invalid password format: %s', (password) => {
    expect(validatePassword(password as string)).toBe(false);
  });
});

describe('validateLength', () => {
  const testCases = [
    // [value, minLength, maxLength, expected]
    ['Valid string', 3, 100, true],
    ['A', 3, 100, false], // Too short
    ['a'.repeat(101), 3, 100, false], // Too long
    ['Hello世界', 3, 10, true], // Unicode characters
    ['\uD83D\uDE00Hello', 3, 10, true], // Emoji
    ['Valid-_123', 3, 10, true], // Special characters
    ['', 0, 100, true], // Empty string with min length 0
    ['   ', 1, 10, false], // Whitespace only (trims)
    [null, 0, 10, false], // Null
    [undefined, 0, 10, false], // Undefined
    ['a'.repeat(10001), 0, 100, false], // DoS prevention
    ['Hello\x00World', 3, 100, true], // Null byte
    ['Hello\nWorld', 3, 100, true] // Newline
  ];

  it.each(testCases)('should validate string length correctly for: %s', (value, min, max, expected) => {
    expect(validateLength(value as string, min, max)).toBe(expected);
  });
});

describe('validateRequired', () => {
  const testCases = [
    // [value, expected]
    ['text', true],
    ['   text   ', true],
    ['', false],
    ['   ', false],
    [0, true],
    [1, true],
    [true, true],
    [false, true],
    [{}, false],
    [{ key: 'value' }, true],
    [[], false],
    [['item'], true],
    [null, false],
    [undefined, false],
    [new Date(), true],
    [NaN, false]
  ];

  it.each(testCases)('should validate required value correctly for: %s', (value, expected) => {
    expect(validateRequired(value)).toBe(expected);
  });
});

describe('validateFutureDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const testCases = [
    // [date, expected]
    ['2024-12-31', true], // Future date
    ['2023-12-31', false], // Past date
    ['2024-01-01', false], // Current date
    ['2024-02-29', true], // Leap year
    ['2024-13-01', false], // Invalid month
    ['2024-04-31', false], // Invalid day
    ['invalid-date', false], // Invalid format
    ['', false], // Empty string
    [null, false], // Null
    [undefined, false], // Undefined
    ['2024-01-01T00:00:00.000Z', false], // Current date ISO format
    ['2024-12-31T23:59:59.999Z', true] // Future date ISO format
  ];

  it.each(testCases)('should validate future date correctly for: %s', (date, expected) => {
    expect(validateFutureDate(date as string)).toBe(expected);
  });

  it('should handle timezone differences correctly', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(validateFutureDate(tomorrow)).toBe(true);
  });

  it('should handle DST transitions correctly', () => {
    // Test dates around DST transitions
    expect(validateFutureDate('2024-03-10')).toBe(true); // US DST start
    expect(validateFutureDate('2024-11-03')).toBe(true); // US DST end
  });
});