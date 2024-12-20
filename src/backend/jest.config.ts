// @jest/types version: ^29.0.0
import type { Config } from '@jest/types';

/**
 * Comprehensive Jest configuration for backend services
 * Configured for TypeScript-based testing of Node.js microservices architecture
 * Includes coverage reporting, module resolution, and strict testing thresholds
 */
const jestConfig: Config.InitialOptions = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Node.js testing environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],

  // Source and test directories
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Module path aliases for clean imports
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@core/(.*)': '<rootDir>/src/core/$1',
    '@api/(.*)': '<rootDir>/src/api/$1',
    '@interfaces/(.*)': '<rootDir>/src/interfaces/$1',
    '@models/(.*)': '<rootDir>/src/models/$1',
    '@config/(.*)': '<rootDir>/src/config/$1',
    '@utils/(.*)': '<rootDir>/src/utils/$1',
    '@middleware/(.*)': '<rootDir>/src/middleware/$1'
  },

  // TypeScript transformation
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: './coverage',
  coverageReporters: [
    'text',
    'lcov',
    'json'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '.*\\.d\\.ts$'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test setup and execution configuration
  setupFiles: [
    '<rootDir>/tests/setup.ts'
  ],
  testTimeout: 10000,
  verbose: true,

  // Additional settings for enterprise testing environment
  errorOnDeprecated: true,
  maxWorkers: '50%',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Global settings
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      diagnostics: true
    }
  }
};

export default jestConfig;