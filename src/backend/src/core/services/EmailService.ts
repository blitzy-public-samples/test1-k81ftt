/**
 * @fileoverview Email Service implementation using SendGrid for secure and reliable email delivery
 * Implements comprehensive retry logic, template management, rate limiting, and detailed logging
 * @version 1.0.0
 */

import * as SendGrid from '@sendgrid/mail'; // v7.7.0
import retry from 'retry'; // v0.13.1
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1

import { IService } from '../interfaces/IService';
import { ILogger } from '../interfaces/ILogger';
import { emailConfig } from '../../config/email.config';
import { INTEGRATION_ERROR_CODES } from '../../constants/error.constants';

/**
 * Interface defining comprehensive email sending options
 */
export interface EmailOptions {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  templateId: string;
  dynamicTemplateData?: Record<string, unknown>;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
    contentId?: string;
  }>;
  categories?: string[];
  customArgs?: Record<string, string>;
  sendAt?: number;
  batchId?: string;
}

/**
 * Interface for security context in email operations
 */
interface SecurityContext {
  userId: string;
  permissions: string[];
  ipAddress: string;
  userAgent: string;
}

/**
 * Interface for compliance flags in email operations
 */
interface ComplianceFlags {
  containsPII: boolean;
  requiresEncryption: boolean;
  dataRetentionPeriod: number;
  regulatoryRequirements: string[];
}

/**
 * Email Service class implementing secure and compliant email operations
 */
export class EmailService implements IService {
  private readonly client: SendGrid.MailService;
  private readonly rateLimiter: RateLimiterRedis;
  private readonly retryOperation: retry.RetryOperation;

  /**
   * Initializes the email service with comprehensive configuration
   * @param logger - Logger instance for operation tracking
   * @param rateLimiter - Rate limiter for controlling email sending
   */
  constructor(
    private readonly logger: ILogger,
    rateLimiter: RateLimiterRedis
  ) {
    // Initialize SendGrid client
    this.client = SendGrid.default;
    this.client.setApiKey(emailConfig.apiKey);

    // Configure rate limiter
    this.rateLimiter = rateLimiter;

    // Configure retry operation
    this.retryOperation = retry.operation(emailConfig.retryOptions);

    // Validate email templates on initialization
    this.validateTemplates();
  }

  /**
   * Validates email templates configuration
   * @private
   * @throws Error if template validation fails
   */
  private async validateTemplates(): Promise<void> {
    try {
      const templates = Object.values(emailConfig.templates);
      for (const templateId of templates) {
        if (!templateId || typeof templateId !== 'string') {
          throw new Error('Invalid template configuration');
        }
      }
    } catch (error) {
      this.logger.error('Template validation failed', {
        error,
        context: { service: 'EmailService', operation: 'validateTemplates' }
      });
      throw error;
    }
  }

  /**
   * Sends an email with comprehensive retry mechanism and rate limiting
   * @param options - Email sending options
   * @returns Promise resolving to send status
   */
  public async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Check rate limits
      await this.rateLimiter.consume('email_sending', 1);

      // Validate email options
      await this.validate(options, 'create');

      // Prepare email data
      const msg: SendGrid.MailDataRequired = {
        to: options.to,
        from: emailConfig.from,
        subject: options.subject,
        templateId: options.templateId,
        dynamicTemplateData: options.dynamicTemplateData,
        attachments: options.attachments,
        categories: options.categories,
        customArgs: options.customArgs,
        sendAt: options.sendAt,
        batchId: options.batchId,
      };

      // Send email with retry logic
      return new Promise((resolve, reject) => {
        this.retryOperation.attempt(async (currentAttempt) => {
          try {
            await this.client.send(msg);
            
            this.logger.info('Email sent successfully', {
              context: {
                service: 'EmailService',
                operation: 'sendEmail',
                recipients: options.to.length,
                templateId: options.templateId,
                attempt: currentAttempt
              }
            });
            
            resolve(true);
          } catch (error) {
            if (this.retryOperation.retry(error as Error)) {
              return;
            }
            
            this.logger.error('Email sending failed', {
              error,
              context: {
                service: 'EmailService',
                operation: 'sendEmail',
                attempt: currentAttempt
              }
            });
            
            reject(error);
          }
        });
      });
    } catch (error) {
      this.logger.error('Email operation failed', {
        error,
        context: { service: 'EmailService', operation: 'sendEmail' }
      });
      throw error;
    }
  }

  /**
   * Sends task assignment notification email with security checks
   * @param params - Task assignment notification parameters
   * @returns Promise resolving to send status
   */
  public async sendTaskAssignmentEmail(params: {
    taskId: string;
    assigneeEmail: string;
    taskTitle: string;
    projectName: string;
    securityContext: SecurityContext;
  }): Promise<boolean> {
    try {
      const { taskId, assigneeEmail, taskTitle, projectName, securityContext } = params;

      // Validate security context
      if (!this.validateSecurityContext(securityContext)) {
        throw new Error(INTEGRATION_ERROR_CODES.UNAUTHORIZED);
      }

      const emailOptions: EmailOptions = {
        to: [{ email: assigneeEmail }],
        subject: `Task Assignment: ${taskTitle}`,
        templateId: emailConfig.templates.taskAssignment,
        dynamicTemplateData: {
          taskId,
          taskTitle,
          projectName,
          assignedBy: securityContext.userId
        },
        categories: ['task_assignment'],
        customArgs: {
          taskId,
          projectId: projectName
        }
      };

      return this.sendEmail(emailOptions);
    } catch (error) {
      this.logger.error('Task assignment email failed', {
        error,
        context: { service: 'EmailService', operation: 'sendTaskAssignmentEmail' }
      });
      throw error;
    }
  }

  /**
   * Sends task update notification email with compliance checks
   * @param params - Task update notification parameters
   * @returns Promise resolving to send status
   */
  public async sendTaskUpdateEmail(params: {
    taskId: string;
    recipientEmail: string;
    updateType: string;
    taskTitle: string;
    complianceFlags: ComplianceFlags;
  }): Promise<boolean> {
    try {
      const { taskId, recipientEmail, updateType, taskTitle, complianceFlags } = params;

      // Handle compliance requirements
      if (complianceFlags.containsPII || complianceFlags.requiresEncryption) {
        this.logger.info('Processing email with compliance requirements', {
          context: {
            service: 'EmailService',
            operation: 'sendTaskUpdateEmail',
            complianceFlags
          }
        });
      }

      const emailOptions: EmailOptions = {
        to: [{ email: recipientEmail }],
        subject: `Task Update: ${taskTitle}`,
        templateId: emailConfig.templates.taskUpdate,
        dynamicTemplateData: {
          taskId,
          taskTitle,
          updateType,
          timestamp: new Date().toISOString()
        },
        categories: ['task_update'],
        customArgs: {
          taskId,
          updateType
        }
      };

      return this.sendEmail(emailOptions);
    } catch (error) {
      this.logger.error('Task update email failed', {
        error,
        context: { service: 'EmailService', operation: 'sendTaskUpdateEmail' }
      });
      throw error;
    }
  }

  /**
   * Validates security context for email operations
   * @private
   * @param context - Security context to validate
   * @returns boolean indicating if context is valid
   */
  private validateSecurityContext(context: SecurityContext): boolean {
    return !!(
      context &&
      context.userId &&
      context.permissions &&
      context.permissions.length > 0 &&
      context.ipAddress &&
      context.userAgent
    );
  }

  /**
   * Implements IService.validate for email operations
   * @param data - Data to validate
   * @param operation - Operation type
   */
  public async validate(data: unknown, operation: 'create' | 'update'): Promise<void> {
    const options = data as EmailOptions;
    
    if (!options.to || !Array.isArray(options.to) || options.to.length === 0) {
      throw new Error('Invalid recipients');
    }

    if (!options.subject || typeof options.subject !== 'string') {
      throw new Error('Invalid subject');
    }

    if (!options.templateId || typeof options.templateId !== 'string') {
      throw new Error('Invalid template ID');
    }

    // Additional validation as needed
  }
}