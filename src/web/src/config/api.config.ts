/**
 * @fileoverview API Configuration for Task Management System
 * @version 1.0.0
 * 
 * This file centralizes API configuration settings for the frontend application,
 * including base URL, version, timeouts, and request defaults for communicating
 * with backend services. It ensures consistent API communication settings across
 * the application while maintaining security and performance requirements.
 */

import { API_TIMEOUTS } from '../constants/api.constants';

/**
 * Type definitions for API configuration
 */
interface ApiConfigHeaders {
  readonly CONTENT_TYPE: string;
  readonly ACCEPT: string;
  readonly CORS_ENABLED: boolean;
  readonly CREDENTIALS: RequestCredentials;
}

interface RetryConfig {
  readonly MAX_RETRIES: number;
  readonly RETRY_DELAY: number;
  readonly RETRY_STATUS_CODES: readonly number[];
}

interface ApiConfiguration {
  readonly BASE_URL: string;
  readonly API_VERSION: string;
  readonly TIMEOUT: number;
  readonly UPLOAD_TIMEOUT: number;
  readonly DOWNLOAD_TIMEOUT: number;
  readonly HEADERS: ApiConfigHeaders;
  readonly RETRY: RetryConfig;
}

/**
 * Central API configuration object
 * Contains all necessary settings for API communication
 * 
 * @remarks
 * - Uses environment variables for flexible deployment configuration
 * - Implements timeout constraints for performance requirements
 * - Includes security headers for secure communication
 * - Configures retry logic for resilience
 */
export const API_CONFIG: ApiConfiguration = {
  // Base URL configuration with environment variable fallback
  BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
  
  // API version prefix
  API_VERSION: '/api/v1',
  
  // Timeout configurations (in milliseconds)
  TIMEOUT: API_TIMEOUTS.DEFAULT,      // 500ms for standard requests
  UPLOAD_TIMEOUT: API_TIMEOUTS.UPLOAD, // 30s for file uploads
  DOWNLOAD_TIMEOUT: API_TIMEOUTS.DOWNLOAD, // 30s for file downloads
  
  // Standard headers configuration
  HEADERS: {
    CONTENT_TYPE: 'application/json',
    ACCEPT: 'application/json',
    CORS_ENABLED: true,
    CREDENTIALS: 'include' as RequestCredentials
  },
  
  // Retry configuration for failed requests
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
    RETRY_STATUS_CODES: [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504  // Gateway Timeout
    ] as const
  }
} as const;

/**
 * Helper function to construct full API URL
 * @param endpoint - API endpoint path
 * @returns Full API URL including base URL and version
 */
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${endpoint}`;
};

/**
 * Helper function to get request configuration with appropriate timeout
 * @param type - Request type ('default' | 'upload' | 'download')
 * @returns Request configuration object with appropriate timeout
 */
export const getRequestConfig = (type: 'default' | 'upload' | 'download' = 'default'): RequestInit => {
  const timeout = type === 'upload' 
    ? API_CONFIG.UPLOAD_TIMEOUT 
    : type === 'download' 
      ? API_CONFIG.DOWNLOAD_TIMEOUT 
      : API_CONFIG.TIMEOUT;

  return {
    headers: {
      'Content-Type': API_CONFIG.HEADERS.CONTENT_TYPE,
      'Accept': API_CONFIG.HEADERS.ACCEPT
    },
    credentials: API_CONFIG.HEADERS.CREDENTIALS,
    signal: AbortSignal.timeout(timeout)
  };
};

// Type exports for external usage
export type { ApiConfiguration, ApiConfigHeaders, RetryConfig };