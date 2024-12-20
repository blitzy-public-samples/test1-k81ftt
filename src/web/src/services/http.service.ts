/**
 * @fileoverview Enhanced HTTP Service for Task Management System
 * @version 1.0.0
 * 
 * Provides a centralized, type-safe wrapper around Axios for making HTTP requests
 * with built-in security features, error handling, performance monitoring,
 * and circuit breaker pattern implementation.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'; // ^1.6.0
import axiosRetry from 'axios-retry'; // ^3.8.0
import { API_CONFIG } from '../config/api.config';
import { handleApiError } from '../utils/error.utils';
import { ApiResponse } from '../types/common.types';

// Constants for HTTP service configuration
const CORRELATION_ID_HEADER = 'X-Correlation-ID';
const REQUEST_TIMEOUT = 500; // 500ms default timeout per requirements

/**
 * Circuit breaker states for fault tolerance
 */
enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

/**
 * Interface for tracking request performance metrics
 */
interface RequestMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  endpoint: string;
}

/**
 * Enhanced HTTP Service with security and monitoring features
 */
class HttpService {
  private readonly axiosInstance: AxiosInstance;
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private readonly failureThreshold: number = 5;
  private readonly resetTimeout: number = 60000; // 1 minute
  private lastFailureTime: number = 0;
  private readonly metrics: RequestMetrics[] = [];

  constructor() {
    // Initialize axios instance with enhanced configuration
    this.axiosInstance = axios.create({
      baseURL: `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}`,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Version': process.env.VITE_APP_VERSION || '1.0.0'
      },
      withCredentials: true // Enable credentials for CORS
    });

    // Configure retry mechanism with exponential backoff
    axiosRetry(this.axiosInstance, {
      retries: API_CONFIG.RETRY.MAX_RETRIES,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          API_CONFIG.RETRY.RETRY_STATUS_CODES.includes(error.response?.status || 0);
      }
    });

    this.setupInterceptors();
  }

  /**
   * Configure request and response interceptors for security and monitoring
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add correlation ID for request tracing
        config.headers[CORRELATION_ID_HEADER] = this.generateCorrelationId();

        // Add security headers
        config.headers['X-CSRF-Token'] = this.getCSRFToken();
        
        // Start performance monitoring
        const requestMetric: RequestMetrics = {
          startTime: performance.now(),
          endTime: 0,
          duration: 0,
          success: false,
          endpoint: config.url || 'unknown'
        };
        this.metrics.push(requestMetric);

        return config;
      },
      (error) => {
        return Promise.reject(handleApiError(error));
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Update metrics for successful request
        this.updateMetrics(response.config.url || 'unknown', true);
        
        // Reset circuit breaker on success
        this.onRequestSuccess();

        return response;
      },
      (error) => {
        // Update metrics for failed request
        this.updateMetrics(error.config?.url || 'unknown', false);
        
        // Handle circuit breaker logic
        this.onRequestFailure();

        return Promise.reject(handleApiError(error));
      }
    );
  }

  /**
   * Makes a type-safe GET request with circuit breaker protection
   */
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    if (this.isCircuitOpen()) {
      throw new Error('Circuit breaker is open. Request rejected.');
    }

    try {
      const response = await this.axiosInstance.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Makes a type-safe POST request with circuit breaker protection
   */
  public async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    if (this.isCircuitOpen()) {
      throw new Error('Circuit breaker is open. Request rejected.');
    }

    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Makes a type-safe PUT request with circuit breaker protection
   */
  public async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    if (this.isCircuitOpen()) {
      throw new Error('Circuit breaker is open. Request rejected.');
    }

    try {
      const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Makes a type-safe DELETE request with circuit breaker protection
   */
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    if (this.isCircuitOpen()) {
      throw new Error('Circuit breaker is open. Request rejected.');
    }

    try {
      const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw handleApiError(error as Error);
    }
  }

  /**
   * Generates a unique correlation ID for request tracing
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Retrieves CSRF token from meta tag
   */
  private getCSRFToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  }

  /**
   * Updates request metrics for performance monitoring
   */
  private updateMetrics(endpoint: string, success: boolean): void {
    const metric = this.metrics[this.metrics.length - 1];
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      metric.endpoint = endpoint;

      // Log if request exceeds timeout threshold
      if (metric.duration > REQUEST_TIMEOUT) {
        console.warn(`Request to ${endpoint} exceeded timeout threshold: ${metric.duration}ms`);
      }
    }
  }

  /**
   * Circuit breaker: Checks if circuit is open
   */
  private isCircuitOpen(): boolean {
    if (this.circuitState === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeout) {
        this.circuitState = CircuitState.HALF_OPEN;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Circuit breaker: Handles successful request
   */
  private onRequestSuccess(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.circuitState = CircuitState.CLOSED;
      this.failureCount = 0;
    }
  }

  /**
   * Circuit breaker: Handles failed request
   */
  private onRequestFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.circuitState = CircuitState.OPEN;
      this.lastFailureTime = Date.now();
    }
  }
}

// Export singleton instance
export const httpService = new HttpService();