/**
 * Comprehensive Error Handling Tests
 * Tests the standardized error hierarchy and error utilities
 */

import {
  BaseError,
  ValidationError,
  RequiredFieldError,
  InvalidTypeError,
  InvalidRangeError,
  DatabaseError,
  ConnectionError,
  QueryError,
  TransactionError,
  BusinessError,
  NoteNotFoundError,
  TagNotFoundError,
  DuplicateNoteError,
  ExternalServiceError,
  BearAppError,
  FileSystemError,
  PerformanceError,
  ResourceExhaustionError,
  ConfigurationError,
  SecurityError,
  UnauthorizedError,
  ErrorUtils,
  ErrorContext,
} from '../../src/types/errors.js';

describe('Error Handling System', () => {
  describe('BaseError', () => {
    class TestError extends BaseError {
      constructor(message: string, context: ErrorContext = {}) {
        super(message, 'TEST_ERROR', 'test', 'medium', true, context);
      }
    }

    it('should create error with proper metadata', () => {
      const context: ErrorContext = {
        operation: 'test_operation',
        service: 'TestService',
        noteId: 123,
      };

      const error = new TestError('Test error message', context);

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.category).toBe('test');
      expect(error.severity).toBe('medium');
      expect(error.recoverable).toBe(true);
      expect(error.context.operation).toBe('test_operation');
      expect(error.context.service).toBe('TestService');
      expect(error.context.noteId).toBe(123);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should serialize to JSON correctly', () => {
      const error = new TestError('Test message');
      const json = error.toJSON();

      expect(json.name).toBe('TestError');
      expect(json.message).toBe('Test message');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.category).toBe('test');
      expect(json.severity).toBe('medium');
      expect(json.recoverable).toBe(true);
      expect(json.timestamp).toBeDefined();
      expect(json.context).toBeDefined();
    });

    it('should provide user-friendly message', () => {
      const error = new TestError('Technical error message');
      expect(error.getUserMessage()).toBe('Technical error message');
    });

    it('should provide recovery actions', () => {
      const error = new TestError('Test message');
      const actions = error.getRecoveryActions();
      
      expect(actions).toContain('Please try again');
      expect(actions).toContain('Contact support if the problem persists');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field context', () => {
      const error = new ValidationError('Invalid email format', 'email', 'invalid-email');

      expect(error.message).toBe('Invalid email format');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.category).toBe('validation');
      expect(error.context.field).toBe('email');
      expect(error.context.value).toBe('invalid-email');
    });

    it('should provide user-friendly validation message', () => {
      const error = new ValidationError('Required field missing');
      expect(error.getUserMessage()).toBe('Invalid input: Required field missing');
    });

    it('should provide validation-specific recovery actions', () => {
      const error = new ValidationError('Invalid format');
      const actions = error.getRecoveryActions();

      expect(actions).toContain('Check your input parameters');
      expect(actions).toContain('Ensure all required fields are provided');
      expect(actions).toContain('Verify data types match expected formats');
    });
  });

  describe('RequiredFieldError', () => {
    it('should create required field error', () => {
      const error = new RequiredFieldError('username');

      expect(error.message).toBe("Required field 'username' is missing or empty");
      expect(error.context.field).toBe('username');
    });
  });

  describe('InvalidTypeError', () => {
    it('should create invalid type error', () => {
      const error = new InvalidTypeError('age', 'number', 'string');

      expect(error.message).toBe("Field 'age' expected number, got string");
      expect(error.context.field).toBe('age');
      expect(error.context.value).toBe('string');
    });
  });

  describe('InvalidRangeError', () => {
    it('should create range error with min and max', () => {
      const error = new InvalidRangeError('age', 150, 0, 120);

      expect(error.message).toBe("Field 'age' value 150 must be between 0 and 120");
    });

    it('should create range error with only min', () => {
      const error = new InvalidRangeError('score', -5, 0);

      expect(error.message).toBe("Field 'score' value -5 must be at least 0");
    });

    it('should create range error with only max', () => {
      const error = new InvalidRangeError('percentage', 150, undefined, 100);

      expect(error.message).toBe("Field 'percentage' value 150 must be at most 100");
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with operation context', () => {
      const error = new DatabaseError('Connection failed', 'connect', 'SELECT * FROM notes');

      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.category).toBe('database');
      expect(error.severity).toBe('high');
      expect(error.context.operation).toBe('connect');
      expect(error.context.sql).toBe('SELECT * FROM notes');
    });

    it('should provide database-specific recovery actions', () => {
      const error = new DatabaseError('Query failed');
      const actions = error.getRecoveryActions();

      expect(actions).toContain('Check your internet connection');
      expect(actions).toContain('Verify Bear app is running');
      expect(actions).toContain('Try again in a few moments');
    });
  });

  describe('ConnectionError', () => {
    it('should create connection error with path', () => {
      const error = new ConnectionError('/path/to/database.db');

      expect(error.message).toBe('Failed to connect to database at /path/to/database.db');
      expect(error.context.operation).toBe('connect');
    });
  });

  describe('QueryError', () => {
    it('should create query error with SQL context', () => {
      const error = new QueryError('SELECT * FROM notes', 'Table does not exist');

      expect(error.message).toBe('Query execution failed: Table does not exist');
      expect(error.context.operation).toBe('query');
      expect(error.context.sql).toBe('SELECT * FROM notes');
    });
  });

  describe('TransactionError', () => {
    it('should create transaction error', () => {
      const error = new TransactionError('commit', 'Constraint violation');

      expect(error.message).toBe('Transaction failed during commit: Constraint violation');
      expect(error.context.operation).toBe('transaction');
    });
  });

  describe('BusinessError', () => {
    it('should create business error with custom code', () => {
      const error = new BusinessError('Invalid operation', 'INVALID_OPERATION');

      expect(error.message).toBe('Invalid operation');
      expect(error.code).toBe('INVALID_OPERATION');
      expect(error.category).toBe('business');
    });
  });

  describe('NoteNotFoundError', () => {
    it('should create note not found error with ID', () => {
      const error = new NoteNotFoundError(123);

      expect(error.message).toBe('Note not found: 123');
      expect(error.code).toBe('NOTE_NOT_FOUND');
      expect(error.context.noteId).toBe(123);
    });

    it('should create note not found error with title', () => {
      const error = new NoteNotFoundError('My Note');

      expect(error.message).toBe('Note not found: My Note');
      expect(error.context.noteId).toBeUndefined();
    });

    it('should provide note-specific recovery actions', () => {
      const error = new NoteNotFoundError(123);
      const actions = error.getRecoveryActions();

      expect(actions).toContain('Check the note ID or title');
      expect(actions).toContain('Verify the note exists in Bear');
      expect(actions).toContain('Try searching for the note');
    });
  });

  describe('TagNotFoundError', () => {
    it('should create tag not found error', () => {
      const error = new TagNotFoundError('work');

      expect(error.message).toBe('Tag not found: work');
      expect(error.code).toBe('TAG_NOT_FOUND');
    });
  });

  describe('DuplicateNoteError', () => {
    it('should create duplicate note error', () => {
      const error = new DuplicateNoteError('Existing Note');

      expect(error.message).toBe("Note with title 'Existing Note' already exists");
      expect(error.code).toBe('DUPLICATE_NOTE');
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error', () => {
      const error = new ExternalServiceError('API Service', 'Rate limit exceeded');

      expect(error.message).toBe('API Service service error: Rate limit exceeded');
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.category).toBe('external');
      expect(error.context.service).toBe('API Service');
    });
  });

  describe('BearAppError', () => {
    it('should create Bear app error', () => {
      const error = new BearAppError('App not responding');

      expect(error.message).toBe('Bear App service error: App not responding');
      expect(error.context.service).toBe('Bear App');
    });

    it('should provide Bear-specific recovery actions', () => {
      const error = new BearAppError('Not running');
      const actions = error.getRecoveryActions();

      expect(actions).toContain('Make sure Bear app is running');
      expect(actions).toContain('Check Bear app permissions');
      expect(actions).toContain('Check macOS accessibility permissions');
    });
  });

  describe('FileSystemError', () => {
    it('should create file system error', () => {
      const error = new FileSystemError('read', '/path/to/file.txt');

      expect(error.message).toBe('File System service error: read failed for path: /path/to/file.txt');
    });
  });

  describe('PerformanceError', () => {
    it('should create performance error with metrics', () => {
      const error = new PerformanceError('database_query', 1000, 2500);

      expect(error.message).toBe('Performance threshold exceeded for database_query: 2500ms > 1000ms');
      expect(error.code).toBe('PERFORMANCE_THRESHOLD_EXCEEDED');
      expect(error.context.operation).toBe('database_query');
      expect(error.context.threshold).toBe(1000);
      expect(error.context.actual).toBe(2500);
    });
  });

  describe('ResourceExhaustionError', () => {
    it('should create resource exhaustion error', () => {
      const error = new ResourceExhaustionError('memory', 1024);

      expect(error.message).toBe('Resource exhaustion: memory limit of 1024 exceeded');
      expect(error.code).toBe('RESOURCE_EXHAUSTION');
      expect(error.recoverable).toBe(false);
      expect(error.context.resource).toBe('memory');
      expect(error.context.limit).toBe(1024);
    });

    it('should provide resource-specific recovery actions', () => {
      const error = new ResourceExhaustionError('memory', 1024);
      const actions = error.getRecoveryActions();

      expect(actions).toContain('Wait a few moments and try again');
      expect(actions).toContain('Close other applications to free up resources');
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new ConfigurationError('database.host', 'Invalid host format');

      expect(error.message).toBe("Configuration error for 'database.host': Invalid host format");
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.recoverable).toBe(false);
      expect(error.context.setting).toBe('database.host');
    });

    it('should provide configuration-specific recovery actions', () => {
      const error = new ConfigurationError('api.key', 'Missing API key');
      const actions = error.getRecoveryActions();

      expect(actions).toContain('Check your environment variables');
      expect(actions).toContain('Verify configuration files');
      expect(actions).toContain('Reset to default configuration');
    });
  });

  describe('SecurityError', () => {
    it('should create security error', () => {
      const error = new SecurityError('Unauthorized access attempt');

      expect(error.message).toBe('Unauthorized access attempt');
      expect(error.code).toBe('SECURITY_ERROR');
      expect(error.category).toBe('security');
      expect(error.severity).toBe('critical');
      expect(error.recoverable).toBe(false);
    });

    it('should provide security-specific recovery actions', () => {
      const error = new SecurityError('Access denied');
      const actions = error.getRecoveryActions();

      expect(actions).toContain('Check your permissions');
      expect(actions).toContain('Contact an administrator');
      expect(actions).toContain('Verify your authentication');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create unauthorized error', () => {
      const error = new UnauthorizedError('delete_note');

      expect(error.message).toBe('Unauthorized access to delete_note');
      expect(error.context.operation).toBe('delete_note');
    });
  });

  describe('ErrorUtils', () => {
    describe('isRecoverable', () => {
      it('should identify recoverable BaseError', () => {
        const error = new ValidationError('Test error');
        expect(ErrorUtils.isRecoverable(error)).toBe(true);
      });

      it('should identify non-recoverable BaseError', () => {
        const error = new SecurityError('Access denied');
        expect(ErrorUtils.isRecoverable(error)).toBe(false);
      });

      it('should assume unknown errors are recoverable', () => {
        const error = new Error('Unknown error');
        expect(ErrorUtils.isRecoverable(error)).toBe(true);
      });
    });

    describe('getSeverity', () => {
      it('should get severity from BaseError', () => {
        const error = new SecurityError('Test');
        expect(ErrorUtils.getSeverity(error)).toBe('critical');
      });

      it('should return medium severity for unknown errors', () => {
        const error = new Error('Unknown error');
        expect(ErrorUtils.getSeverity(error)).toBe('medium');
      });
    });

    describe('normalize', () => {
      it('should return BaseError unchanged', () => {
        const originalError = new ValidationError('Test error');
        const normalized = ErrorUtils.normalize(originalError);
        expect(normalized).toBe(originalError);
      });

      it('should normalize regular Error', () => {
        const originalError = new Error('Regular error');
        const normalized = ErrorUtils.normalize(originalError);

        expect(normalized).toBeInstanceOf(BusinessError);
        expect(normalized.message).toBe('Regular error');
        expect(normalized.code).toBe('UNKNOWN_ERROR');
        expect(normalized.context.originalError).toBe('Error');
      });

      it('should normalize non-Error values', () => {
        const normalized = ErrorUtils.normalize('String error');

        expect(normalized).toBeInstanceOf(BusinessError);
        expect(normalized.message).toBe('String error');
        expect(normalized.code).toBe('UNKNOWN_ERROR');
      });

      it('should include context in normalized error', () => {
        const context: ErrorContext = { operation: 'test_op', service: 'TestService' };
        const normalized = ErrorUtils.normalize(new Error('Test'), context);

        expect(normalized.context.operation).toBe('test_op');
        expect(normalized.context.service).toBe('TestService');
      });
    });

    describe('fromValidation', () => {
      it('should create ValidationError from validation result', () => {
        const error = ErrorUtils.fromValidation('email', 'Invalid format', 'invalid@');

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Invalid format');
        expect(error.context.field).toBe('email');
        expect(error.context.value).toBe('invalid@');
      });
    });

    describe('wrapAsync', () => {
      it('should wrap function and normalize errors', async () => {
        const originalFn = async (shouldThrow: boolean) => {
          if (shouldThrow) {
            throw new Error('Original error');
          }
          return 'success';
        };

        const wrappedFn = ErrorUtils.wrapAsync(originalFn, { operation: 'test' });

        // Should return success normally
        const result = await wrappedFn(false);
        expect(result).toBe('success');

        // Should normalize thrown errors
        try {
          await wrappedFn(true);
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(BusinessError);
          expect((error as BusinessError).message).toBe('Original error');
          expect((error as BusinessError).context.operation).toBe('test');
        }
      });
    });
  });

  describe('Error Context', () => {
    it('should support comprehensive context information', () => {
      const context: ErrorContext = {
        operation: 'create_note',
        service: 'NoteService',
        timestamp: new Date(),
        userId: 'user123',
        noteId: 456,
        parameters: { title: 'Test Note', tags: ['work'] },
        correlationId: 'req-789',
        field: 'title',
        value: 'invalid-title',
        sql: 'INSERT INTO notes...',
        threshold: 1000,
        actual: 2500,
        resource: 'memory',
        limit: 1024,
        setting: 'database.host',
        originalError: 'TypeError',
      };

      const error = new ValidationError('Test error', 'title', 'invalid', context);

      expect(error.context.operation).toBe('create_note');
      expect(error.context.service).toBe('NoteService');
      expect(error.context.userId).toBe('user123');
      expect(error.context.noteId).toBe(456);
      expect(error.context.parameters).toEqual({ title: 'Test Note', tags: ['work'] });
      expect(error.context.correlationId).toBe('req-789');
      expect(error.context.field).toBe('title');
      expect(error.context.sql).toBe('INSERT INTO notes...');
    });
  });
}); 