/**
 * Comprehensive Error Types for Bear Notes MCP
 *
 * This module defines a standardized error hierarchy for the entire application,
 * providing consistent error handling, context, and recovery strategies.
 */

export interface ErrorContext {
  operation?: string;
  service?: string;
  timestamp?: Date;
  userId?: string;
  noteId?: number;
  parameters?: Record<string, unknown>;
  stackTrace?: string;
  correlationId?: string;
  field?: string;
  value?: unknown;
  sql?: string;
  threshold?: number;
  actual?: number;
  resource?: string;
  limit?: number;
  setting?: string;
  originalError?: string;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Base error class with enhanced context and metadata
 */
export abstract class BaseError extends Error {
  public readonly timestamp: Date;
  public readonly context: ErrorContext;
  public readonly code: string;
  public readonly category: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    category: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    recoverable: boolean = true,
    context: ErrorContext = {}
  ) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.recoverable = recoverable;
    this.timestamp = new Date();
    this.context = {
      ...context,
      timestamp: this.timestamp,
      stackTrace: this.stack,
    };

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging and reporting
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Get suggested recovery actions
   */
  getRecoveryActions(): string[] {
    return ['Please try again', 'Contact support if the problem persists'];
  }
}

/**
 * Validation and Input Errors
 */
export class ValidationError extends BaseError {
  constructor(message: string, field?: string, value?: unknown, context: ErrorContext = {}) {
    super(message, 'VALIDATION_ERROR', 'validation', 'medium', true, {
      ...context,
      field,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    });
  }

  getUserMessage(): string {
    return `Invalid input: ${this.message}`;
  }

  getRecoveryActions(): string[] {
    return [
      'Check your input parameters',
      'Ensure all required fields are provided',
      'Verify data types match expected formats',
    ];
  }
}

export class RequiredFieldError extends ValidationError {
  constructor(field: string, context: ErrorContext = {}) {
    super(`Required field '${field}' is missing or empty`, field, undefined, context);
  }
}

export class InvalidTypeError extends ValidationError {
  constructor(field: string, expectedType: string, actualType: string, context: ErrorContext = {}) {
    super(
      `Field '${field}' expected ${expectedType}, got ${actualType}`,
      field,
      actualType,
      context
    );
  }
}

export class InvalidRangeError extends ValidationError {
  constructor(
    field: string,
    value: number,
    min?: number,
    max?: number,
    context: ErrorContext = {}
  ) {
    const range =
      min !== undefined && max !== undefined
        ? `between ${min} and ${max}`
        : min !== undefined
          ? `at least ${min}`
          : max !== undefined
            ? `at most ${max}`
            : 'within valid range';

    super(`Field '${field}' value ${value} must be ${range}`, field, value, context);
  }
}

/**
 * Database and Data Access Errors
 */
export class DatabaseError extends BaseError {
  constructor(message: string, operation?: string, sql?: string, context: ErrorContext = {}) {
    super(message, 'DATABASE_ERROR', 'database', 'high', true, {
      ...context,
      operation,
      sql,
    });
  }

  getUserMessage(): string {
    return 'A database error occurred. Please try again.';
  }

  getRecoveryActions(): string[] {
    return [
      'Check your internet connection',
      'Verify Bear app is running',
      'Try again in a few moments',
      'Restart Bear app if the problem persists',
    ];
  }
}

export class ConnectionError extends DatabaseError {
  constructor(dbPath: string, context: ErrorContext = {}) {
    super(`Failed to connect to database at ${dbPath}`, 'connect', undefined, context);
  }
}

export class QueryError extends DatabaseError {
  constructor(sql: string, originalError: string, context: ErrorContext = {}) {
    super(`Query execution failed: ${originalError}`, 'query', sql, context);
  }
}

export class TransactionError extends DatabaseError {
  constructor(operation: string, originalError: string, context: ErrorContext = {}) {
    super(
      `Transaction failed during ${operation}: ${originalError}`,
      'transaction',
      undefined,
      context
    );
  }
}

/**
 * Business Logic and Service Errors
 */
export class BusinessError extends BaseError {
  constructor(message: string, code: string, context: ErrorContext = {}) {
    super(message, code, 'business', 'medium', true, context);
  }
}

export class NoteNotFoundError extends BusinessError {
  constructor(identifier: string | number, context: ErrorContext = {}) {
    super(`Note not found: ${identifier}`, 'NOTE_NOT_FOUND', {
      ...context,
      noteId: typeof identifier === 'number' ? identifier : undefined,
    });
  }

  getUserMessage(): string {
    return 'The requested note could not be found.';
  }

  getRecoveryActions(): string[] {
    return [
      'Check the note ID or title',
      'Verify the note exists in Bear',
      'Try searching for the note',
    ];
  }
}

export class TagNotFoundError extends BusinessError {
  constructor(tagName: string, context: ErrorContext = {}) {
    super(`Tag not found: ${tagName}`, 'TAG_NOT_FOUND', context);
  }
}

export class DuplicateNoteError extends BusinessError {
  constructor(title: string, context: ErrorContext = {}) {
    super(`Note with title '${title}' already exists`, 'DUPLICATE_NOTE', context);
  }
}

/**
 * External Service and Integration Errors
 */
export class ExternalServiceError extends BaseError {
  constructor(service: string, message: string, context: ErrorContext = {}) {
    super(
      `${service} service error: ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      'external',
      'high',
      true,
      {
        ...context,
        service,
      }
    );
  }
}

export class BearAppError extends ExternalServiceError {
  constructor(message: string, context: ErrorContext = {}) {
    super('Bear App', message, context);
  }

  getUserMessage(): string {
    return 'Bear app is not responding. Please check if Bear is running.';
  }

  getRecoveryActions(): string[] {
    return [
      'Make sure Bear app is running',
      'Check Bear app permissions',
      'Restart Bear app',
      'Check macOS accessibility permissions',
    ];
  }
}

export class FileSystemError extends ExternalServiceError {
  constructor(operation: string, path: string, context: ErrorContext = {}) {
    super('File System', `${operation} failed for path: ${path}`, context);
  }
}

/**
 * Performance and Resource Errors
 */
export class PerformanceError extends BaseError {
  constructor(operation: string, threshold: number, actual: number, context: ErrorContext = {}) {
    super(
      `Performance threshold exceeded for ${operation}: ${actual}ms > ${threshold}ms`,
      'PERFORMANCE_THRESHOLD_EXCEEDED',
      'performance',
      'medium',
      true,
      {
        ...context,
        operation,
        threshold,
        actual,
      }
    );
  }
}

export class ResourceExhaustionError extends BaseError {
  constructor(resource: string, limit: number, context: ErrorContext = {}) {
    super(
      `Resource exhaustion: ${resource} limit of ${limit} exceeded`,
      'RESOURCE_EXHAUSTION',
      'resource',
      'high',
      false,
      {
        ...context,
        resource,
        limit,
      }
    );
  }

  getUserMessage(): string {
    return 'System resources are temporarily unavailable. Please try again later.';
  }

  getRecoveryActions(): string[] {
    return [
      'Wait a few moments and try again',
      'Close other applications to free up resources',
      'Restart the application if needed',
    ];
  }
}

/**
 * Configuration and Environment Errors
 */
export class ConfigurationError extends BaseError {
  constructor(setting: string, message: string, context: ErrorContext = {}) {
    super(
      `Configuration error for '${setting}': ${message}`,
      'CONFIGURATION_ERROR',
      'configuration',
      'high',
      false,
      {
        ...context,
        setting,
      }
    );
  }

  getUserMessage(): string {
    return 'Application configuration error. Please check your settings.';
  }

  getRecoveryActions(): string[] {
    return [
      'Check your environment variables',
      'Verify configuration files',
      'Reset to default configuration',
      'Contact administrator',
    ];
  }
}

/**
 * Security and Authorization Errors
 */
export class SecurityError extends BaseError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'SECURITY_ERROR', 'security', 'critical', false, context);
  }

  getUserMessage(): string {
    return 'Access denied. You do not have permission to perform this action.';
  }

  getRecoveryActions(): string[] {
    return ['Check your permissions', 'Contact an administrator', 'Verify your authentication'];
  }
}

export class UnauthorizedError extends SecurityError {
  constructor(operation: string, context: ErrorContext = {}) {
    super(`Unauthorized access to ${operation}`, {
      ...context,
      operation,
    });
  }
}

/**
 * Utility functions for error handling
 */
export class ErrorUtils {
  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: Error): boolean {
    if (error instanceof BaseError) {
      return error.recoverable;
    }
    return true; // Assume unknown errors are recoverable
  }

  /**
   * Get error severity
   */
  static getSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (error instanceof BaseError) {
      return error.severity;
    }
    return 'medium'; // Default severity for unknown errors
  }

  /**
   * Convert any error to BaseError
   */
  static normalize(error: unknown, context: ErrorContext = {}): BaseError {
    if (error instanceof BaseError) {
      return error;
    }

    if (error instanceof Error) {
      return new BusinessError(error.message, 'UNKNOWN_ERROR', {
        ...context,
        originalError: error.name,
        stackTrace: error.stack,
      });
    }

    return new BusinessError(String(error), 'UNKNOWN_ERROR', context);
  }

  /**
   * Create error from validation result
   */
  static fromValidation(
    field: string,
    message: string,
    value?: unknown,
    context: ErrorContext = {}
  ): ValidationError {
    return new ValidationError(message, field, value, context);
  }

  /**
   * Wrap function with error normalization
   */
  static wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: ErrorContext = {}
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        throw ErrorUtils.normalize(error, context);
      }
    }) as T;
  }
}
