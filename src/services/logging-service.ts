/**
 * Logging Service Implementation
 * Provides structured logging with Winston, performance tracking, and monitoring capabilities
 */

import winston from 'winston';
import { ILoggingService } from './interfaces/index.js';

/**
 * Log levels for the logging service
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Configuration options for the logging service
 */
export interface LoggingConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  maxFileSize: number;
  maxFiles: number;
  enableColors: boolean;
  enableTimestamp: boolean;
  enableMetadata: boolean;
  serviceName: string;
  environment: string;
}

/**
 * Default logging configuration
 */
const DEFAULT_CONFIG: LoggingConfig = {
  level: 'info',
  enableConsole: true,
  enableFile: true,
  logDir: './logs',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  enableColors: true,
  enableTimestamp: true,
  enableMetadata: true,
  serviceName: 'bear-mcp-server',
  environment: process.env.NODE_ENV || 'development',
};

/**
 * LoggingService implementation using Winston
 */
export class LoggingService implements ILoggingService {
  private logger: winston.Logger;
  private config: LoggingConfig;
  private childContext: Record<string, unknown> = {};
  private startTime: number = Date.now();

  constructor(config: Partial<LoggingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger with configured transports and formatting
   */
  private createLogger(): winston.Logger {
    const formats: winston.Logform.Format[] = [];

    // Add timestamp if enabled
    if (this.config.enableTimestamp) {
      formats.push(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }));
    }

    // Add metadata if enabled
    if (this.config.enableMetadata) {
      formats.push(winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }));
    }

    // Add service context
    formats.push(
      winston.format.printf((info) => {
        const { timestamp, level, message } = info;
        const metadata = (info as any).metadata || {};
        const context = { ...this.childContext, ...metadata };
        
        let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        
        // Add service name and environment
        logMessage += ` [${this.config.serviceName}:${this.config.environment}]`;
        
        // Add context if present
        if (Object.keys(context).length > 0) {
          logMessage += ` ${JSON.stringify(context)}`;
        }
        
        return logMessage;
      })
    );

    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          level: this.config.level,
          format: this.config.enableColors 
            ? winston.format.combine(winston.format.colorize(), ...formats)
            : winston.format.combine(...formats),
        })
      );
    }

    // File transports
    if (this.config.enableFile) {
      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: `${this.config.logDir}/combined.log`,
          level: this.config.level,
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(...formats),
        })
      );

      // Error log file
      transports.push(
        new winston.transports.File({
          filename: `${this.config.logDir}/error.log`,
          level: 'error',
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(...formats),
        })
      );

      // Performance log file
      transports.push(
        new winston.transports.File({
          filename: `${this.config.logDir}/performance.log`,
          level: 'info',
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(...formats),
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      transports,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true,
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta: Record<string, unknown> = {}): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log info message
   */
  info(message: string, meta: Record<string, unknown> = {}): void {
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta: Record<string, unknown> = {}): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log error message with optional error object
   */
  error(message: string, error?: Error | unknown, meta: Record<string, unknown> = {}): void {
    const errorMeta = { ...meta };
    
    if (error) {
      if (error instanceof Error) {
        errorMeta.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        errorMeta.error = error;
      }
    }
    
    this.logger.error(message, errorMeta);
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, unknown>): ILoggingService {
    const childLogger = new LoggingService(this.config);
    childLogger.childContext = { ...this.childContext, ...context };
    return childLogger;
  }

  /**
   * Start performance timer and return end function
   */
  startTimer(label: string): () => void {
    const startTime = Date.now();
    this.debug(`Timer started: ${label}`);
    
    return () => {
      const duration = Date.now() - startTime;
      this.logPerformance(label, duration);
    };
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, meta: Record<string, unknown> = {}): void {
    const performanceMeta = {
      ...meta,
      operation,
      duration,
      durationMs: `${duration}ms`,
      performance: true,
    };

    if (duration > 1000) {
      this.warn(`Slow operation detected: ${operation}`, performanceMeta);
    } else {
      this.info(`Operation completed: ${operation}`, performanceMeta);
    }
  }

  /**
   * Log health check results
   */
  logHealthCheck(
    service: string,
    status: 'healthy' | 'unhealthy' | 'degraded',
    details: Record<string, unknown> = {}
  ): void {
    const healthMeta = {
      service,
      status,
      ...details,
      healthCheck: true,
    };

    switch (status) {
      case 'healthy':
        this.debug(`Health check passed: ${service}`, healthMeta);
        break;
      case 'degraded':
        this.warn(`Health check degraded: ${service}`, healthMeta);
        break;
      case 'unhealthy':
        this.error(`Health check failed: ${service}`, undefined, healthMeta);
        break;
    }
  }

  /**
   * Log system metrics
   */
  logSystemMetrics(metrics: Record<string, unknown>): void {
    this.info('System metrics', {
      ...metrics,
      systemMetrics: true,
      uptime: Date.now() - this.startTime,
    });
  }

  /**
   * Log service lifecycle events
   */
  logServiceStart(serviceName: string, version?: string): void {
    this.info(`Service started: ${serviceName}`, {
      serviceName,
      version,
      lifecycle: 'start',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log service stop events
   */
  logServiceStop(serviceName: string, reason?: string): void {
    this.info(`Service stopped: ${serviceName}`, {
      serviceName,
      reason,
      lifecycle: 'stop',
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log database operations with performance metrics
   */
  logDatabaseOperation(
    operation: string,
    duration: number,
    rowsAffected?: number,
    error?: Error
  ): void {
    const dbMeta = {
      operation,
      duration,
      durationMs: `${duration}ms`,
      rowsAffected,
      database: true,
    };

    if (error) {
      this.error(`Database operation failed: ${operation}`, error, dbMeta);
    } else if (duration > 1000) {
      this.warn(`Slow database operation: ${operation}`, dbMeta);
    } else {
      this.debug(`Database operation completed: ${operation}`, dbMeta);
    }
  }

  /**
   * Log security events
   */
  logSecurityEvent(event: string, details: Record<string, unknown>): void {
    this.warn(`Security event: ${event}`, {
      event,
      ...details,
      security: true,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log audit events
   */
  logAuditEvent(
    action: string,
    resource: string,
    user?: string,
    details: Record<string, unknown> = {}
  ): void {
    this.info(`Audit: ${action} on ${resource}`, {
      action,
      resource,
      user,
      ...details,
      audit: true,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Set logging level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.logger.level = level;
    this.info(`Log level changed to: ${level}`);
  }

  /**
   * Get current logging level
   */
  getLevel(): string {
    return this.config.level;
  }

  /**
   * Close logger and cleanup resources
   */
  async close(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.logger.close();
      resolve();
    });
  }

  /**
   * Get logger configuration
   */
  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger = this.createLogger();
    this.info('Logger configuration updated', { config: this.config });
  }
}

/**
 * Export types for external use
 */
export type { ILoggingService }; 