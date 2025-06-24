/**
 * Comprehensive Validation Service for Bear Notes MCP
 *
 * This service provides type-safe validation for all input parameters,
 * data sanitization, and consistent error reporting across the application.
 */

import {
  ValidationError,
  RequiredFieldError,
  InvalidTypeError,
  InvalidRangeError,
  ErrorContext,
} from '../types/errors.js';

export interface ValidationRule<T = unknown> {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: readonly T[];
  custom?: (value: unknown) => boolean | string;
  sanitize?: (value: unknown) => unknown;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData?: Record<string, unknown>;
}

export interface IValidationService {
  /**
   * Validate data against a schema
   */
  validate(
    data: Record<string, unknown>,
    schema: ValidationSchema,
    context?: ErrorContext
  ): ValidationResult;

  /**
   * Validate a single field
   */
  validateField(
    name: string,
    value: unknown,
    rule: ValidationRule,
    context?: ErrorContext
  ): ValidationError | null;

  /**
   * Sanitize input data
   */
  sanitize(data: Record<string, unknown>, schema: ValidationSchema): Record<string, unknown>;

  /**
   * Validate MCP method arguments
   */
  validateMcpArgs(method: string, args: Record<string, unknown>): ValidationResult;

  /**
   * Validate note data
   */
  validateNoteData(data: Record<string, unknown>): ValidationResult;

  /**
   * Validate search parameters
   */
  validateSearchParams(params: Record<string, unknown>): ValidationResult;

  /**
   * Validate tag parameters
   */
  validateTagParams(params: Record<string, unknown>): ValidationResult;
}

/**
 * Validation Service Implementation
 */
export class ValidationService implements IValidationService {
  private readonly mcpSchemas: Record<string, ValidationSchema> = {
    get_notes: {
      limit: { type: 'number', min: 1, max: 1000 },
      offset: { type: 'number', min: 0 },
      include_trashed: { type: 'boolean' },
      sort_by: { type: 'string', enum: ['created', 'modified', 'title'] as const },
    },

    get_note_by_id: {
      note_id: { required: true, type: 'number', min: 1 },
    },

    get_note_by_title: {
      title: { required: true, type: 'string', minLength: 1, maxLength: 1000 },
      exact_match: { type: 'boolean' },
    },

    get_recent_notes: {
      days: { type: 'number', min: 1, max: 365 },
      limit: { type: 'number', min: 1, max: 1000 },
    },

    search_notes: {
      query: { required: true, type: 'string', minLength: 1, maxLength: 1000 },
      limit: { type: 'number', min: 1, max: 1000 },
      include_archived: { type: 'boolean' },
      case_sensitive: { type: 'boolean' },
    },

    search_notes_full_text: {
      query: { required: true, type: 'string', minLength: 1, maxLength: 1000 },
      limit: { type: 'number', min: 1, max: 1000 },
      highlight: { type: 'boolean' },
    },

    get_notes_by_tag: {
      tag: { required: true, type: 'string', minLength: 1, maxLength: 100 },
      limit: { type: 'number', min: 1, max: 1000 },
      exact_match: { type: 'boolean' },
    },

    create_note: {
      title: { required: true, type: 'string', minLength: 1, maxLength: 1000 },
      text: { type: 'string', maxLength: 1000000 },
      tags: { type: 'array' },
      open_note: { type: 'boolean' },
    },

    update_note: {
      note_id: { required: true, type: 'number', min: 1 },
      title: { type: 'string', minLength: 1, maxLength: 1000 },
      text: { type: 'string', maxLength: 1000000 },
      tags: { type: 'array' },
    },

    duplicate_note: {
      note_id: { required: true, type: 'number', min: 1 },
      new_title: { type: 'string', minLength: 1, maxLength: 1000 },
      open_note: { type: 'boolean' },
    },

    archive_note: {
      note_id: { required: true, type: 'number', min: 1 },
      archived: { required: true, type: 'boolean' },
    },
  };

  private readonly noteSchema: ValidationSchema = {
    title: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 1000,
      sanitize: (value: unknown) => (typeof value === 'string' ? value.trim() : value),
    },
    text: {
      type: 'string',
      maxLength: 1000000,
      sanitize: (value: unknown) => (typeof value === 'string' ? value.trim() : value),
    },
    tags: {
      type: 'array',
      custom: (value: unknown) => {
        if (!Array.isArray(value)) {
          return 'Tags must be an array';
        }
        if (value.some(tag => typeof tag !== 'string')) {
          return 'All tags must be strings';
        }
        if (value.some((tag: unknown) => typeof tag === 'string' && tag.length > 100)) {
          return 'Tag names cannot exceed 100 characters';
        }
        return true;
      },
      sanitize: (value: unknown) =>
        Array.isArray(value)
          ? value.map(tag => (typeof tag === 'string' ? tag.trim().toLowerCase() : tag))
          : value,
    },
    open_note: { type: 'boolean' },
  };

  private readonly searchSchema: ValidationSchema = {
    query: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 1000,
      sanitize: (value: unknown) => (typeof value === 'string' ? value.trim() : value),
    },
    limit: {
      type: 'number',
      min: 1,
      max: 1000,
    },
    offset: {
      type: 'number',
      min: 0,
    },
    case_sensitive: { type: 'boolean' },
    include_archived: { type: 'boolean' },
    highlight: { type: 'boolean' },
  };

  private readonly tagSchema: ValidationSchema = {
    tag: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_\-\s]+$/,
      sanitize: (value: unknown) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
    },
    limit: {
      type: 'number',
      min: 1,
      max: 1000,
    },
    exact_match: { type: 'boolean' },
  };

  /**
   * Validate data against a schema
   */
  validate(
    data: Record<string, unknown>,
    schema: ValidationSchema,
    context: ErrorContext = {}
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitizedData: Record<string, unknown> = {};

    // Check for required fields
    for (const [fieldName, rule] of Object.entries(schema)) {
      if (rule.required && (!(fieldName in data) || data[fieldName] == null)) {
        errors.push(new RequiredFieldError(fieldName, { ...context, field: fieldName }));
        continue;
      }

      // Skip validation if field is not present and not required
      if (!(fieldName in data)) {
        continue;
      }

      const value = data[fieldName];
      const error = this.validateField(fieldName, value, rule, context);
      if (error) {
        errors.push(error);
      } else {
        // Apply sanitization if validation passed
        sanitizedData[fieldName] = rule.sanitize ? rule.sanitize(value) : value;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }

  /**
   * Validate a single field
   */
  validateField(
    name: string,
    value: unknown,
    rule: ValidationRule,
    context: ErrorContext = {}
  ): ValidationError | null {
    const fieldContext = { ...context, field: name, value };

    // Type validation
    if (rule.type && !this.isValidType(value, rule.type)) {
      return new InvalidTypeError(name, rule.type, typeof value, fieldContext);
    }

    // String validations
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return new ValidationError(
          `Field '${name}' must be at least ${rule.minLength} characters long`,
          name,
          value,
          fieldContext
        );
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return new ValidationError(
          `Field '${name}' cannot exceed ${rule.maxLength} characters`,
          name,
          value,
          fieldContext
        );
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        return new ValidationError(
          `Field '${name}' does not match required pattern`,
          name,
          value,
          fieldContext
        );
      }
    }

    // Number validations
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return new InvalidRangeError(name, value, rule.min, undefined, fieldContext);
      }

      if (rule.max !== undefined && value > rule.max) {
        return new InvalidRangeError(name, value, undefined, rule.max, fieldContext);
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value as never)) {
      return new ValidationError(
        `Field '${name}' must be one of: ${rule.enum.join(', ')}`,
        name,
        value,
        fieldContext
      );
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        return new ValidationError(
          typeof customResult === 'string'
            ? customResult
            : `Field '${name}' failed custom validation`,
          name,
          value,
          fieldContext
        );
      }
    }

    return null;
  }

  /**
   * Sanitize input data
   */
  sanitize(data: Record<string, unknown>, schema: ValidationSchema): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [fieldName, rule] of Object.entries(schema)) {
      if (fieldName in data && data[fieldName] != null) {
        const value = data[fieldName];
        sanitized[fieldName] = rule.sanitize ? rule.sanitize(value) : value;
      }
    }

    return sanitized;
  }

  /**
   * Validate MCP method arguments
   */
  validateMcpArgs(method: string, args: Record<string, unknown>): ValidationResult {
    const schema = this.mcpSchemas[method];
    if (!schema) {
      return {
        isValid: false,
        errors: [
          new ValidationError(`Unknown MCP method: ${method}`, 'method', method, {
            operation: 'validateMcpArgs',
            method,
          }),
        ],
      };
    }

    return this.validate(args, schema, { operation: 'validateMcpArgs', method });
  }

  /**
   * Validate note data
   */
  validateNoteData(data: Record<string, unknown>): ValidationResult {
    return this.validate(data, this.noteSchema, { operation: 'validateNoteData' });
  }

  /**
   * Validate search parameters
   */
  validateSearchParams(params: Record<string, unknown>): ValidationResult {
    return this.validate(params, this.searchSchema, { operation: 'validateSearchParams' });
  }

  /**
   * Validate tag parameters
   */
  validateTagParams(params: Record<string, unknown>): ValidationResult {
    return this.validate(params, this.tagSchema, { operation: 'validateTagParams' });
  }

  /**
   * Check if value matches expected type
   */
  private isValidType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }
}

/**
 * Validation decorators and utilities
 */
export class ValidationUtils {
  /**
   * Create a method decorator for automatic validation
   */
  static validateArgs(schema: ValidationSchema) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const validationService = new ValidationService();
        const argsObject = args[0] || {};

        const result = validationService.validate(argsObject, schema, {
          operation: propertyKey,
          service: target.constructor.name,
        });

        if (!result.isValid) {
          throw result.errors[0]; // Throw the first validation error
        }

        // Replace args with sanitized data
        args[0] = result.sanitizedData;
        return originalMethod.apply(this, args);
      };
    };
  }

  /**
   * Validate and sanitize input parameters
   */
  static validateAndSanitize<T extends Record<string, unknown>>(
    data: T,
    schema: ValidationSchema,
    context: ErrorContext = {}
  ): T {
    const validationService = new ValidationService();
    const result = validationService.validate(data, schema, context);

    if (!result.isValid) {
      throw result.errors[0];
    }

    return result.sanitizedData as T;
  }

  /**
   * Safe type conversion with validation
   */
  static safeConvert = {
    toNumber: (value: unknown, fieldName: string): number => {
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        const num = Number(value);
        if (!isNaN(num)) {
          return num;
        }
      }
      throw new InvalidTypeError(fieldName, 'number', typeof value);
    },

    toString: (value: unknown, fieldName: string): string => {
      if (typeof value === 'string') {
        return value;
      }
      if (value != null) {
        return String(value);
      }
      throw new InvalidTypeError(fieldName, 'string', typeof value);
    },

    toBoolean: (value: unknown, fieldName: string): boolean => {
      if (typeof value === 'boolean') {
        return value;
      }
      if (value === 'true' || value === '1' || value === 1) {
        return true;
      }
      if (value === 'false' || value === '0' || value === 0) {
        return false;
      }
      throw new InvalidTypeError(fieldName, 'boolean', typeof value);
    },

    toArray: <T>(value: unknown, fieldName: string): T[] => {
      if (Array.isArray(value)) {
        return value as T[];
      }
      throw new InvalidTypeError(fieldName, 'array', typeof value);
    },
  };

  /**
   * Common validation patterns
   */
  static patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    tag: /^[a-zA-Z0-9_\-\s]+$/,
    bearNoteId: /^\d+$/,
  };

  /**
   * Common sanitizers
   */
  static sanitizers = {
    trim: (value: string): string => value.trim(),
    lowercase: (value: string): string => value.toLowerCase(),
    uppercase: (value: string): string => value.toUpperCase(),
    alphanumeric: (value: string): string => value.replace(/[^a-zA-Z0-9]/g, ''),
    slug: (value: string): string =>
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-'),
    tag: (value: string): string =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_\-\s]/g, ''),
  };
}
