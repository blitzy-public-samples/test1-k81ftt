/**
 * @fileoverview Enterprise-grade logging configuration using Winston
 * Supports structured logging, ELK stack integration, log rotation,
 * correlation IDs, and enhanced business metrics tracking.
 * @version 1.0.0
 */

import winston from 'winston'; // ^3.11.0
import DailyRotateFile from 'winston-daily-rotate-file'; // ^4.7.1
import { LogLevel } from '../core/interfaces/ILogger';
import { AsyncLocalStorage } from 'async_hooks';
import path from 'path';

// Optional ELK stack integration
let ElasticsearchTransport;
try {
    ({ ElasticsearchTransport } = require('winston-elasticsearch'));
} catch (error) {
    // ElasticsearchTransport will remain undefined if module is not available
}

// Global constants
const LOG_MAX_SIZE = '10m';
const LOG_MAX_FILES = '7d';
const LOG_DIRECTORY = 'logs';
const LOG_ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL;
const LOG_ENVIRONMENT = process.env.NODE_ENV || 'development';

// AsyncLocalStorage for correlation ID tracking
const asyncLocalStorage = new AsyncLocalStorage<{ correlationId: string }>();

/**
 * Creates Winston format configuration with enhanced features
 * @param environment - Current deployment environment
 * @returns Combined format configuration
 */
const createLogFormat = (environment: string): winston.Logform.Format => {
    const formatters = [
        winston.format.timestamp({
            format: 'ISO'
        }),
        winston.format((info) => {
            const store = asyncLocalStorage.getStore();
            if (store?.correlationId) {
                info.correlationId = store.correlationId;
            }
            return info;
        })(),
        winston.format.errors({ stack: true }),
        winston.format((info) => {
            // Sanitize sensitive data
            if (info.password) info.password = '[REDACTED]';
            if (info.token) info.token = '[REDACTED]';
            return info;
        })()
    ];

    // Add source location in development
    if (environment === 'development') {
        formatters.push(winston.format((info) => {
            const error = new Error();
            const stack = error.stack?.split('\n')[3];
            info.source = stack?.match(/\((.+?)\)/)?.[1] || 'unknown';
            return info;
        })());
    }

    // Add business metrics context if present
    formatters.push(winston.format((info) => {
        if (info.metrics) {
            info.businessMetrics = {
                ...info.metrics,
                timestamp: new Date().toISOString()
            };
        }
        return info;
    })());

    // Final formatters
    formatters.push(
        winston.format.json({
            replacer: (key, value) => {
                if (value instanceof Error) {
                    return {
                        message: value.message,
                        stack: value.stack,
                        ...value
                    };
                }
                return value;
            }
        })
    );

    return winston.format.combine(...formatters);
};

/**
 * Creates environment-specific Winston transports configuration
 * @param environment - Current deployment environment
 * @returns Array of configured transports
 */
const createTransports = (environment: string): winston.transport[] => {
    const transports: winston.transport[] = [];

    // Console transport with color coding
    transports.push(new winston.transports.Console({
        level: environment === 'production' ? 'info' : 'debug',
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));

    // File rotation transport for all logs
    transports.push(new DailyRotateFile({
        dirname: LOG_DIRECTORY,
        filename: 'application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: LOG_MAX_SIZE,
        maxFiles: LOG_MAX_FILES,
        format: winston.format.json()
    }));

    // Separate error log file
    transports.push(new DailyRotateFile({
        dirname: LOG_DIRECTORY,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: LOG_MAX_SIZE,
        maxFiles: LOG_MAX_FILES,
        level: 'error',
        format: winston.format.json()
    }));

    // Elasticsearch transport for production
    if (environment === 'production' && ElasticsearchTransport && LOG_ELASTICSEARCH_URL) {
        transports.push(new ElasticsearchTransport({
            level: 'info',
            clientOpts: {
                node: LOG_ELASTICSEARCH_URL,
                maxRetries: 5,
                requestTimeout: 10000
            },
            indexPrefix: 'logs-task-management',
            indexSuffixPattern: 'YYYY.MM.DD',
            mappingTemplate: {
                index_patterns: ['logs-*'],
                settings: {
                    number_of_shards: 2,
                    number_of_replicas: 1
                }
            }
        }));
    }

    return transports;
};

/**
 * Comprehensive Winston logger configuration
 * Implements structured logging with ELK stack integration
 */
export const loggerConfig = {
    level: LOG_ENVIRONMENT === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
    format: createLogFormat(LOG_ENVIRONMENT),
    transports: createTransports(LOG_ENVIRONMENT),
    // Handle uncaught exceptions
    exceptionHandlers: [
        new DailyRotateFile({
            dirname: LOG_DIRECTORY,
            filename: 'exceptions-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: LOG_MAX_SIZE,
            maxFiles: LOG_MAX_FILES
        })
    ],
    // Handle unhandled promise rejections
    rejectionHandlers: [
        new DailyRotateFile({
            dirname: LOG_DIRECTORY,
            filename: 'rejections-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: LOG_MAX_SIZE,
            maxFiles: LOG_MAX_FILES
        })
    ],
    // Prevent exit on error
    exitOnError: false
};