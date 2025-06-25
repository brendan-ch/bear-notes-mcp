/**
 * Comprehensive Validation Service Tests
 * Tests the validation service with all its schemas and utilities
 */

import {
  ValidationService,
  ValidationRule,
  ValidationSchema,
  ValidationUtils,
  IValidationService,
} from '../../src/services/validation-service.js';

import {
  ValidationError,
  RequiredFieldError,
  InvalidTypeError,
  InvalidRangeError,
} from '../../src/types/errors.js';

describe('ValidationService', () => {
  let validationService: IValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('Basic Validation', () => {
    it('should validate required fields', () => {
      const schema: ValidationSchema = {
        name: { required: true, type: 'string' },
        age: { required: true, type: 'number' },
      };

      const data = { name: 'John' }; // Missing age

      const result = validationService.validate(data, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBeInstanceOf(RequiredFieldError);
      expect(result.errors[0].message).toContain('age');
    });

    it('should validate field types', () => {
      const schema: ValidationSchema = {
        name: { type: 'string' },
        age: { type: 'number' },
        active: { type: 'boolean' },
        tags: { type: 'array' },
        profile: { type: 'object' },
      };

      const data = {
        name: 123, // Should be string
        age: 'thirty', // Should be number
        active: 'yes', // Should be boolean
        tags: 'tag1,tag2', // Should be array
        profile: [], // Should be object
      };

      const result = validationService.validate(data, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(5);
      expect(result.errors.every(e => e instanceof InvalidTypeError)).toBe(true);
    });

    it('should validate string constraints', () => {
      const schema: ValidationSchema = {
        username: {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          pattern: /^[a-zA-Z0-9_]+$/,
        },
      };

      // Test too short
      let result = validationService.validate({ username: 'ab' }, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('at least 3 characters');

      // Test too long
      result = validationService.validate({ username: 'a'.repeat(25) }, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('cannot exceed 20 characters');

      // Test invalid pattern
      result = validationService.validate({ username: 'user@name' }, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('does not match required pattern');

      // Test valid
      result = validationService.validate({ username: 'valid_user123' }, schema);
      expect(result.isValid).toBe(true);
    });

    it('should validate number ranges', () => {
      const schema: ValidationSchema = {
        score: { type: 'number', min: 0, max: 100 },
      };

      // Test below minimum
      let result = validationService.validate({ score: -5 }, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBeInstanceOf(InvalidRangeError);

      // Test above maximum
      result = validationService.validate({ score: 150 }, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBeInstanceOf(InvalidRangeError);

      // Test valid
      result = validationService.validate({ score: 85 }, schema);
      expect(result.isValid).toBe(true);
    });

    it('should validate enum values', () => {
      const schema: ValidationSchema = {
        status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
      };

      // Test invalid enum
      let result = validationService.validate({ status: 'unknown' }, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('must be one of: active, inactive, pending');

      // Test valid enum
      result = validationService.validate({ status: 'active' }, schema);
      expect(result.isValid).toBe(true);
    });

    it('should apply custom validation', () => {
      const schema: ValidationSchema = {
        password: {
          type: 'string',
          custom: (value: unknown) => {
            const str = value as string;
            if (str.length < 8) {
              return 'Password must be at least 8 characters';
            }
            if (!/[A-Z]/.test(str)) {
              return 'Password must contain uppercase letter';
            }
            if (!/[0-9]/.test(str)) {
              return 'Password must contain number';
            }
            return true;
          },
        },
      };

      // Test custom validation failure
      let result = validationService.validate({ password: 'weak' }, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Password must be at least 8 characters');

      result = validationService.validate({ password: 'weakpassword' }, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Password must contain uppercase letter');

      // Test custom validation success
      result = validationService.validate({ password: 'StrongPass123' }, schema);
      expect(result.isValid).toBe(true);
    });

    it('should apply sanitization', () => {
      const schema: ValidationSchema = {
        name: {
          type: 'string',
          sanitize: (value: unknown) =>
            typeof value === 'string' ? value.trim().toLowerCase() : value,
        },
        tags: {
          type: 'array',
          sanitize: (value: unknown) =>
            Array.isArray(value)
              ? value.map(tag => (typeof tag === 'string' ? tag.trim() : tag))
              : value,
        },
      };

      const data = {
        name: '  JOHN DOE  ',
        tags: ['  work  ', '  personal  '],
      };

      const result = validationService.validate(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.name).toBe('john doe');
      expect(result.sanitizedData?.tags).toEqual(['work', 'personal']);
    });

    it('should skip validation for optional missing fields', () => {
      const schema: ValidationSchema = {
        name: { required: true, type: 'string' },
        age: { type: 'number' }, // Optional
      };

      const data = { name: 'John' }; // age is missing but optional

      const result = validationService.validate(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.name).toBe('John');
      expect('age' in result.sanitizedData!).toBe(false);
    });
  });

  describe('MCP Method Validation', () => {
    it('should validate get_notes arguments', () => {
      // Valid arguments
      let result = validationService.validateMcpArgs('get_notes', {
        limit: 50,
        offset: 0,
        include_trashed: false,
        sort_by: 'created',
      });

      expect(result.isValid).toBe(true);

      // Invalid arguments
      result = validationService.validateMcpArgs('get_notes', {
        limit: 0, // Below minimum
        sort_by: 'invalid', // Not in enum
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should validate get_note_by_id arguments', () => {
      // Valid
      let result = validationService.validateMcpArgs('get_note_by_id', {
        note_id: 123,
      });
      expect(result.isValid).toBe(true);

      // Missing required field
      result = validationService.validateMcpArgs('get_note_by_id', {});
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBeInstanceOf(RequiredFieldError);

      // Invalid type
      result = validationService.validateMcpArgs('get_note_by_id', {
        note_id: 'not-a-number',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBeInstanceOf(InvalidTypeError);
    });

    it('should validate search_notes arguments', () => {
      // Valid
      let result = validationService.validateMcpArgs('search_notes', {
        query: 'test search',
        limit: 100,
        case_sensitive: true,
      });
      expect(result.isValid).toBe(true);

      // Missing required query
      result = validationService.validateMcpArgs('search_notes', {
        limit: 50,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBeInstanceOf(RequiredFieldError);

      // Query too long
      result = validationService.validateMcpArgs('search_notes', {
        query: 'x'.repeat(1001),
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('cannot exceed 1000 characters');
    });

    it('should validate create_note arguments', () => {
      // Valid
      let result = validationService.validateMcpArgs('create_note', {
        title: 'New Note',
        text: 'Note content',
        tags: ['work', 'important'],
        open_note: true,
      });
      expect(result.isValid).toBe(true);

      // Missing required title
      result = validationService.validateMcpArgs('create_note', {
        text: 'Content without title',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBeInstanceOf(RequiredFieldError);
    });

    it('should handle unknown MCP method', () => {
      const result = validationService.validateMcpArgs('unknown_method', {});

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Unknown MCP method: unknown_method');
    });
  });

  describe('Note Data Validation', () => {
    it('should validate note data with sanitization', () => {
      const data = {
        title: '  My Note Title  ',
        text: '  Note content with spaces  ',
        tags: ['  work  ', '  PERSONAL  '],
        open_note: true,
      };

      const result = validationService.validateNoteData(data);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.title).toBe('My Note Title');
      expect(result.sanitizedData?.text).toBe('Note content with spaces');
      expect(result.sanitizedData?.tags).toEqual(['work', 'personal']);
    });

    it('should validate note tags array', () => {
      // Invalid tags (not an array)
      let result = validationService.validateNoteData({
        title: 'Test Note',
        tags: 'work,personal',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('expected array, got string');

      // Invalid tags (non-string elements)
      result = validationService.validateNoteData({
        title: 'Test Note',
        tags: ['work', 123, 'personal'],
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('All tags must be strings');

      // Invalid tags (too long)
      result = validationService.validateNoteData({
        title: 'Test Note',
        tags: ['work', 'x'.repeat(101)],
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Tag names cannot exceed 100 characters');
    });

    it('should require title for note data', () => {
      const result = validationService.validateNoteData({
        text: 'Content without title',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBeInstanceOf(RequiredFieldError);
      expect(result.errors[0].message).toContain('title');
    });
  });

  describe('Search Parameters Validation', () => {
    it('should validate search parameters', () => {
      const params = {
        query: '  search term  ',
        limit: 50,
        offset: 10,
        case_sensitive: false,
      };

      const result = validationService.validateSearchParams(params);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.query).toBe('search term');
    });

    it('should require search query', () => {
      const result = validationService.validateSearchParams({
        limit: 50,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toBeInstanceOf(RequiredFieldError);
    });
  });

  describe('Tag Parameters Validation', () => {
    it('should validate and sanitize tag parameters', () => {
      const params = {
        tag: '  WORK-Tag  ',
        limit: 100,
        exact_match: true,
      };

      const result = validationService.validateTagParams(params);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.tag).toBe('work-tag');
    });

    it('should validate tag pattern', () => {
      const result = validationService.validateTagParams({
        tag: 'invalid@tag!',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('does not match required pattern');
    });
  });

  describe('Field Validation', () => {
    it('should validate individual field correctly', () => {
      const rule: ValidationRule = {
        type: 'string',
        minLength: 3,
        maxLength: 10,
      };

      // Valid field
      let error = validationService.validateField('username', 'valid', rule);
      expect(error).toBeNull();

      // Invalid field
      error = validationService.validateField('username', 'ab', rule);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error?.message).toContain('at least 3 characters');
    });

    it('should include field context in validation errors', () => {
      const rule: ValidationRule = { type: 'number', min: 0 };
      const context = { operation: 'test_validation' };

      const error = validationService.validateField('score', -5, rule, context);

      expect(error).toBeInstanceOf(InvalidRangeError);
      expect(error?.context.field).toBe('score');
      expect(error?.context.value).toBe('-5'); // Value is converted to string in context
      expect(error?.context.operation).toBe('test_validation');
    });
  });

  describe('Sanitization', () => {
    it('should sanitize data according to schema', () => {
      const schema: ValidationSchema = {
        name: {
          sanitize: (value: unknown) =>
            typeof value === 'string' ? value.trim().toUpperCase() : value,
        },
        tags: {
          sanitize: (value: unknown) => (Array.isArray(value) ? value.filter(Boolean) : value),
        },
      };

      const data = {
        name: '  john doe  ',
        tags: ['work', '', 'personal', null],
        other: 'unchanged',
      };

      const sanitized = validationService.sanitize(data, schema);

      expect(sanitized.name).toBe('JOHN DOE');
      expect(sanitized.tags).toEqual(['work', 'personal']);
      expect(sanitized.other).toBeUndefined(); // Not in schema
    });
  });
});

describe('ValidationUtils', () => {
  describe('validateAndSanitize', () => {
    it('should validate and return sanitized data', () => {
      const schema: ValidationSchema = {
        name: {
          required: true,
          type: 'string',
          sanitize: (value: unknown) => (typeof value === 'string' ? value.trim() : value),
        },
      };

      const data = { name: '  John  ' };
      const result = ValidationUtils.validateAndSanitize(data, schema);

      expect(result.name).toBe('John');
    });

    it('should throw validation error on invalid data', () => {
      const schema: ValidationSchema = {
        age: { required: true, type: 'number' },
      };

      expect(() => {
        ValidationUtils.validateAndSanitize({}, schema);
      }).toThrow(RequiredFieldError);
    });
  });

  describe('safeConvert', () => {
    describe('toNumber', () => {
      it('should convert valid numbers', () => {
        expect(ValidationUtils.safeConvert.toNumber(42, 'age')).toBe(42);
        expect(ValidationUtils.safeConvert.toNumber('42', 'age')).toBe(42);
        expect(ValidationUtils.safeConvert.toNumber('3.14', 'pi')).toBe(3.14);
      });

      it('should throw InvalidTypeError for invalid numbers', () => {
        expect(() => {
          ValidationUtils.safeConvert.toNumber('not-a-number', 'age');
        }).toThrow(InvalidTypeError);

        expect(() => {
          ValidationUtils.safeConvert.toNumber(null, 'age');
        }).toThrow(InvalidTypeError);
      });
    });

    describe('toString', () => {
      it('should convert values to string', () => {
        expect(ValidationUtils.safeConvert.toString('hello', 'name')).toBe('hello');
        expect(ValidationUtils.safeConvert.toString(42, 'id')).toBe('42');
        expect(ValidationUtils.safeConvert.toString(true, 'flag')).toBe('true');
      });

      it('should throw InvalidTypeError for null/undefined', () => {
        expect(() => {
          ValidationUtils.safeConvert.toString(null, 'name');
        }).toThrow(InvalidTypeError);

        expect(() => {
          ValidationUtils.safeConvert.toString(undefined, 'name');
        }).toThrow(InvalidTypeError);
      });
    });

    describe('toBoolean', () => {
      it('should convert truthy values', () => {
        expect(ValidationUtils.safeConvert.toBoolean(true, 'flag')).toBe(true);
        expect(ValidationUtils.safeConvert.toBoolean('true', 'flag')).toBe(true);
        expect(ValidationUtils.safeConvert.toBoolean('1', 'flag')).toBe(true);
        expect(ValidationUtils.safeConvert.toBoolean(1, 'flag')).toBe(true);
      });

      it('should convert falsy values', () => {
        expect(ValidationUtils.safeConvert.toBoolean(false, 'flag')).toBe(false);
        expect(ValidationUtils.safeConvert.toBoolean('false', 'flag')).toBe(false);
        expect(ValidationUtils.safeConvert.toBoolean('0', 'flag')).toBe(false);
        expect(ValidationUtils.safeConvert.toBoolean(0, 'flag')).toBe(false);
      });

      it('should throw InvalidTypeError for ambiguous values', () => {
        expect(() => {
          ValidationUtils.safeConvert.toBoolean('maybe', 'flag');
        }).toThrow(InvalidTypeError);
      });
    });

    describe('toArray', () => {
      it('should return arrays unchanged', () => {
        const arr = [1, 2, 3];
        expect(ValidationUtils.safeConvert.toArray(arr, 'items')).toBe(arr);
      });

      it('should throw InvalidTypeError for non-arrays', () => {
        expect(() => {
          ValidationUtils.safeConvert.toArray('not-array', 'items');
        }).toThrow(InvalidTypeError);
      });
    });
  });

  describe('patterns', () => {
    it('should provide common validation patterns', () => {
      // Email pattern
      expect(ValidationUtils.patterns.email.test('user@example.com')).toBe(true);
      expect(ValidationUtils.patterns.email.test('invalid-email')).toBe(false);

      // UUID pattern
      expect(ValidationUtils.patterns.uuid.test('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(ValidationUtils.patterns.uuid.test('not-a-uuid')).toBe(false);

      // Slug pattern
      expect(ValidationUtils.patterns.slug.test('valid-slug-123')).toBe(true);
      expect(ValidationUtils.patterns.slug.test('Invalid Slug!')).toBe(false);

      // Tag pattern
      expect(ValidationUtils.patterns.tag.test('valid_tag-123')).toBe(true);
      expect(ValidationUtils.patterns.tag.test('invalid@tag!')).toBe(false);

      // Bear note ID pattern
      expect(ValidationUtils.patterns.bearNoteId.test('12345')).toBe(true);
      expect(ValidationUtils.patterns.bearNoteId.test('abc123')).toBe(false);
    });
  });

  describe('sanitizers', () => {
    it('should provide common sanitization functions', () => {
      expect(ValidationUtils.sanitizers.trim('  hello  ')).toBe('hello');
      expect(ValidationUtils.sanitizers.lowercase('HELLO')).toBe('hello');
      expect(ValidationUtils.sanitizers.uppercase('hello')).toBe('HELLO');
      expect(ValidationUtils.sanitizers.alphanumeric('hello@world!')).toBe('helloworld');
      expect(ValidationUtils.sanitizers.slug('Hello World 123!')).toBe('hello-world-123');
      expect(ValidationUtils.sanitizers.tag('  Work@Tag!  ')).toBe('worktag');
    });
  });
});
