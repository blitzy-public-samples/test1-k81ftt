/**
 * @fileoverview Centralized image asset management with strict typing and accessibility compliance
 * Supports WCAG 2.1 Level AA requirements and Material Design 3 implementation
 * @version 1.0.0
 */

/**
 * Supported image format types
 */
export enum ImageFormat {
  WEBP = 'webp',
  SVG = 'svg',
  PNG = 'png',
  JPG = 'jpg'
}

/**
 * Type definition for image asset properties ensuring type safety and required metadata
 */
export interface ImageAsset {
  path: string;
  alt: string;
  width: number;
  height: number;
  format: ImageFormat;
  preload: boolean;
}

/**
 * Base path for all image assets
 * @constant
 */
export const ASSET_BASE_PATH = '/assets/images';

/**
 * Supported image formats in order of preference
 * @constant
 */
export const IMAGE_FORMATS: readonly ImageFormat[] = [
  ImageFormat.WEBP,
  ImageFormat.SVG,
  ImageFormat.PNG,
  ImageFormat.JPG
] as const;

/**
 * Standard supported image dimensions for consistency
 * @constant
 */
export const SUPPORTED_DIMENSIONS: readonly { width: number; height: number; }[] = [
  { width: 24, height: 24 },   // Icon size
  { width: 48, height: 48 },   // Avatar size
  { width: 200, height: 200 }, // Illustration size
  { width: 400, height: 100 }  // Logo size
] as const;

/**
 * Constructs the full image path with proper CDN prefix and cache busting
 * @param path - Relative path to the image
 * @param format - Image format
 * @returns Full CDN-ready image path with cache busting
 */
export const getImagePath = (path: string, format: ImageFormat): string => {
  const cdnBase = process.env.REACT_APP_CDN_URL || '';
  const cacheBuster = process.env.REACT_APP_BUILD_ID || Date.now();
  return `${cdnBase}${ASSET_BASE_PATH}${path}.${format}?v=${cacheBuster}`;
};

/**
 * Light theme application logo
 */
export const logoLight: ImageAsset = {
  path: '/logo/logo-light',
  alt: 'Task Management System Logo - Light Theme',
  width: 400,
  height: 100,
  format: ImageFormat.SVG,
  preload: true
};

/**
 * Dark theme application logo
 */
export const logoDark: ImageAsset = {
  path: '/logo/logo-dark',
  alt: 'Task Management System Logo - Dark Theme',
  width: 400,
  height: 100,
  format: ImageFormat.SVG,
  preload: true
};

/**
 * Default user avatar placeholder
 */
export const defaultAvatar: ImageAsset = {
  path: '/avatars/default-avatar',
  alt: 'Default User Avatar',
  width: 48,
  height: 48,
  format: ImageFormat.SVG,
  preload: false
};

/**
 * Task list empty state illustration
 */
export const emptyStateTask: ImageAsset = {
  path: '/illustrations/empty-task',
  alt: 'No tasks found illustration',
  width: 200,
  height: 200,
  format: ImageFormat.SVG,
  preload: false
};

/**
 * Project list empty state illustration
 */
export const emptyStateProject: ImageAsset = {
  path: '/illustrations/empty-project',
  alt: 'No projects found illustration',
  width: 200,
  height: 200,
  format: ImageFormat.SVG,
  preload: false
};

/**
 * Error page illustration
 */
export const errorIllustration: ImageAsset = {
  path: '/illustrations/error',
  alt: 'Error occurred illustration',
  width: 200,
  height: 200,
  format: ImageFormat.SVG,
  preload: false
};

/**
 * 404 page illustration
 */
export const notFoundIllustration: ImageAsset = {
  path: '/illustrations/not-found',
  alt: 'Page not found illustration',
  width: 200,
  height: 200,
  format: ImageFormat.SVG,
  preload: false
};

/**
 * Authentication pages background
 */
export const loginBackground: ImageAsset = {
  path: '/backgrounds/login-bg',
  alt: 'Login page decorative background',
  width: 1920,
  height: 1080,
  format: ImageFormat.WEBP,
  preload: true
};