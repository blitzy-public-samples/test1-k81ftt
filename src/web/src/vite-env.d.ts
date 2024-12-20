/// <reference types="vite/client" /> // vite/client ^4.5.0

/**
 * Type definitions for Vite environment variables and global types.
 * This file ensures type safety for environment variables and Vite's client types
 * across the React frontend application.
 */

/**
 * Environment variables interface for the Task Management System.
 * Extends ImportMetaEnv to provide type safety for custom environment variables.
 */
interface ImportMetaEnv {
  /**
   * Base URL for the backend API endpoints
   */
  readonly VITE_API_URL: string;

  /**
   * WebSocket server URL for real-time updates
   */
  readonly VITE_WS_URL: string;

  /**
   * Authentication service URL for SSO and user management
   */
  readonly VITE_AUTH_URL: string;

  /**
   * Storage service URL for file uploads and attachments
   */
  readonly VITE_STORAGE_URL: string;

  /**
   * Allow for additional string-based environment variables
   */
  readonly [key: string]: string | undefined;
}

/**
 * Augment the ImportMeta interface to include our custom environment variables.
 * This ensures type safety when accessing import.meta.env throughout the application.
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Export environment variable interface to be used across the application
 * This allows other modules to import and use the type definitions
 */
export type { ImportMetaEnv };