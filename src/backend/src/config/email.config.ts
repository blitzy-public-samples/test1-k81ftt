/**
 * @file Email Configuration Module
 * @description Comprehensive configuration for SendGrid email service integration
 * @version 1.0.0
 * @module config/email
 */

import { config } from 'dotenv'; // ^16.0.0

// Initialize environment variables
config();

/**
 * Interface defining email address structure with validation requirements
 */
export interface EmailAddress {
  email: string;
  name: string;
}

/**
 * Interface defining comprehensive email template IDs for all notification types
 */
export interface EmailTemplates {
  taskAssignment: string;
  taskUpdate: string;
  projectUpdate: string;
  commentNotification: string;
  taskDueReminder: string;
  projectMilestone: string;
}

/**
 * Main email configuration interface with comprehensive settings for SendGrid integration
 */
export interface EmailConfig {
  apiKey: string;
  from: EmailAddress;
  templates: EmailTemplates;
  retryOptions: {
    retries: number;
    factor: number;
    minTimeout: number;
    maxTimeout: number;
  };
  enableTracking: boolean;
  rateLimits: {
    maxPerSecond: number;
    maxBurstSize: number;
  };
}

/**
 * Default retry options for email sending attempts
 */
const DEFAULT_RETRY_OPTIONS = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 5000,
};

/**
 * Regular expression for validating email addresses
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Default rate limits for email sending
 */
const DEFAULT_RATE_LIMITS = {
  maxPerSecond: 100,
  maxBurstSize: 150,
};

/**
 * Validates email configuration settings with detailed error reporting
 * @param config - Email configuration object to validate
 * @throws {ValidationError} Detailed error message if validation fails
 */
export function validateEmailConfig(config: EmailConfig): boolean {
  // Validate API key
  if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.length < 50) {
    throw new Error('Invalid SendGrid API key format or length');
  }

  // Validate sender email
  if (!config.from || !config.from.email || !EMAIL_REGEX.test(config.from.email)) {
    throw new Error('Invalid sender email address format');
  }

  // Validate sender name
  if (!config.from.name || config.from.name.length < 2 || config.from.name.length > 100) {
    throw new Error('Sender name must be between 2 and 100 characters');
  }

  // Validate templates
  const requiredTemplates: (keyof EmailTemplates)[] = [
    'taskAssignment',
    'taskUpdate',
    'projectUpdate',
    'commentNotification',
    'taskDueReminder',
    'projectMilestone',
  ];

  for (const template of requiredTemplates) {
    if (!config.templates[template] || typeof config.templates[template] !== 'string') {
      throw new Error(`Missing or invalid template ID for ${template}`);
    }
  }

  // Validate retry options
  if (config.retryOptions) {
    const { retries, factor, minTimeout, maxTimeout } = config.retryOptions;
    if (
      retries < 0 || retries > 10 ||
      factor < 1 || factor > 5 ||
      minTimeout < 100 || minTimeout > 10000 ||
      maxTimeout < minTimeout || maxTimeout > 30000
    ) {
      throw new Error('Invalid retry options configuration');
    }
  }

  // Validate rate limits
  if (config.rateLimits) {
    const { maxPerSecond, maxBurstSize } = config.rateLimits;
    if (
      maxPerSecond < 1 || maxPerSecond > 1000 ||
      maxBurstSize < maxPerSecond || maxBurstSize > 2000
    ) {
      throw new Error('Invalid rate limits configuration');
    }
  }

  return true;
}

/**
 * Loads and validates email configuration from environment variables
 * @returns {EmailConfig} Validated email configuration object
 * @throws {Error} If required environment variables are missing or invalid
 */
export function loadEmailConfig(): EmailConfig {
  const emailConfig: EmailConfig = {
    apiKey: process.env.SENDGRID_API_KEY || '',
    from: {
      email: process.env.SENDER_EMAIL || '',
      name: process.env.SENDER_NAME || '',
    },
    templates: {
      taskAssignment: process.env.TEMPLATE_TASK_ASSIGNMENT || '',
      taskUpdate: process.env.TEMPLATE_TASK_UPDATE || '',
      projectUpdate: process.env.TEMPLATE_PROJECT_UPDATE || '',
      commentNotification: process.env.TEMPLATE_COMMENT_NOTIFICATION || '',
      taskDueReminder: process.env.TEMPLATE_TASK_DUE_REMINDER || '',
      projectMilestone: process.env.TEMPLATE_PROJECT_MILESTONE || '',
    },
    retryOptions: {
      ...DEFAULT_RETRY_OPTIONS,
      ...(process.env.EMAIL_RETRY_OPTIONS ? JSON.parse(process.env.EMAIL_RETRY_OPTIONS) : {}),
    },
    enableTracking: process.env.EMAIL_TRACKING_ENABLED === 'true',
    rateLimits: {
      ...DEFAULT_RATE_LIMITS,
      maxPerSecond: parseInt(process.env.EMAIL_RATE_LIMIT_PER_SECOND || '100', 10),
      maxBurstSize: parseInt(process.env.EMAIL_RATE_LIMIT_BURST_SIZE || '150', 10),
    },
  };

  // Validate the configuration
  validateEmailConfig(emailConfig);

  return emailConfig;
}

/**
 * Exported email configuration instance
 * @constant
 * @type {EmailConfig}
 */
export const emailConfig: EmailConfig = loadEmailConfig();

/**
 * Default export for the email configuration
 */
export default emailConfig;