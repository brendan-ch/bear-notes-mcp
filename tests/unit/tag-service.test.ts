import { TagService } from '../../src/services/tag-service.js';
import {
  MockBearDatabase,
  createMockTagWithCount,
  createMockNoteWithTags,
} from '../utils/test-helpers.js';
import { globalContainer } from '../../src/services/container/service-container.js';
import { SERVICE_TOKENS } from '../../src/services/interfaces/index.js';
import { TagWithCount, NoteWithTags } from '../../src/types/bear.js';

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

// Mock util
jest.mock('util', () => ({
  promisify: jest.fn(() => jest.fn()),
}));

describe('TagService', () => {
  let tagService: TagService;
  let mockDatabase: MockBearDatabase;

  beforeEach(() => {
    // Reset container and mocks
    jest.clearAllMocks();
    globalContainer.dispose();

    // Create fresh mock database
    mockDatabase = new MockBearDatabase();

    // Register mock database service
    globalContainer.registerSingleton(SERVICE_TOKENS.DATABASE_SERVICE, () => mockDatabase);

    // Create TagService instance
    tagService = new TagService();
  });

  afterEach(async () => {
    await globalContainer.dispose();
  });

  describe('constructor', () => {
    it('should initialize with database service from container', () => {
      expect(tagService).toBeInstanceOf(TagService);
      // Database service should be injected via constructor
    });
  });

  describe('getTags', () => {
    it('should return all tags with note counts', async () => {
      const expectedTags: TagWithCount[] = [
        createMockTagWithCount({ ZTITLE: 'work', noteCount: 5 }),
        createMockTagWithCount({ ZTITLE: 'personal', noteCount: 3 }),
        createMockTagWithCount({ ZTITLE: 'project', noteCount: 1 }),
      ];

      mockDatabase.setQueryResult(expectedTags);

      const result = await tagService.getTags();

      expect(result).toEqual(expectedTags);
      expect(mockDatabase.connect).toHaveBeenCalledWith(true);
      expect(mockDatabase.disconnect).toHaveBeenCalled();
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT t.*, COUNT(nt.Z_5NOTES) as noteCount')
      );
    });

    it('should return empty array when no tags exist', async () => {
      mockDatabase.setQueryResult([]);

      const result = await tagService.getTags();

      expect(result).toEqual([]);
      expect(mockDatabase.connect).toHaveBeenCalledWith(true);
      expect(mockDatabase.disconnect).toHaveBeenCalled();
    });

    it('should disconnect database even if query fails', async () => {
      mockDatabase.setQueryResult(new Error('Database error'));

      await expect(tagService.getTags()).rejects.toThrow('Database error');
      expect(mockDatabase.disconnect).toHaveBeenCalled();
    });
  });

  describe('getNotesByTag', () => {
    it('should return notes filtered by tag name', async () => {
      const mockRows = [
        { ...createMockNoteWithTags({ ZTITLE: 'Note 1' }), tag_names: 'work,important' },
        { ...createMockNoteWithTags({ ZTITLE: 'Note 2' }), tag_names: 'work,project' },
      ];

      mockDatabase.setQueryResult(mockRows);

      const result = await tagService.getNotesByTag('work');

      expect(result).toHaveLength(2);
      expect(result[0].tags).toEqual(['work', 'important']);
      expect(result[1].tags).toEqual(['work', 'project']);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.ZTITLE = ? AND n.ZTRASHED = 0'),
        ['work']
      );
    });

    it('should handle notes with no tags', async () => {
      const mockRows = [
        { ...createMockNoteWithTags({ ZTITLE: 'Note 1' }), tag_names: null },
        { ...createMockNoteWithTags({ ZTITLE: 'Note 2' }), tag_names: '' },
      ];

      mockDatabase.setQueryResult(mockRows);

      const result = await tagService.getNotesByTag('work');

      expect(result).toHaveLength(2);
      expect(result[0].tags).toEqual([]);
      expect(result[1].tags).toEqual([]);
    });

    it('should return empty array when tag has no notes', async () => {
      mockDatabase.setQueryResult([]);

      const result = await tagService.getNotesByTag('nonexistent');

      expect(result).toEqual([]);
    });

    it('should disconnect database even if query fails', async () => {
      mockDatabase.setQueryResult(new Error('Database error'));

      await expect(tagService.getNotesByTag('work')).rejects.toThrow('Database error');
      expect(mockDatabase.disconnect).toHaveBeenCalled();
    });
  });

  describe('validateAndSanitizeTags', () => {
    it('should sanitize tags according to Bear rules', () => {
      const inputTags = [
        'Work-Project',
        'Personal Notes',
        'project/mobile',
        'TEST-CASE',
        'under_score',
        'comma,separated',
      ];

      const result = tagService.validateAndSanitizeTags(inputTags);

      expect(result.sanitized).toEqual([
        'workproject',
        'personalnotes',
        'project/mobile',
        'testcase',
        'under_score',
        'commaseparated',
      ]);
      expect(result.warnings).toHaveLength(4); // All except under_score and project/mobile should have warnings
    });

    it('should handle empty and whitespace-only tags', () => {
      const inputTags = ['', '   ', 'valid', '\t\n'];

      const result = tagService.validateAndSanitizeTags(inputTags);

      expect(result.sanitized).toEqual(['valid']);
      expect(result.warnings).toContain('Empty tag ignored');
    });

    it('should clean up multiple slashes and remove leading/trailing slashes', () => {
      const inputTags = [
        '/leading-slash',
        'trailing-slash/',
        '//multiple//slashes//',
        'normal/path/tag',
      ];

      const result = tagService.validateAndSanitizeTags(inputTags);

      expect(result.sanitized).toEqual([
        'leadingslash',
        'trailingslash',
        'multiple/slashes',
        'normal/path/tag',
      ]);
    });

    it('should handle tags that become empty after sanitization', () => {
      const inputTags = ['---', '   ', ',,,', '///'];

      const result = tagService.validateAndSanitizeTags(inputTags);

      expect(result.sanitized).toEqual([]);
      expect(result.warnings).toHaveLength(4);
      expect(result.warnings).toContain(
        'Tag "---" became empty after sanitization and was ignored'
      );
    });

    it('should preserve underscores as they are allowed in Bear', () => {
      const inputTags = ['under_score_tag', 'multiple_under_scores'];

      const result = tagService.validateAndSanitizeTags(inputTags);

      expect(result.sanitized).toEqual(['under_score_tag', 'multiple_under_scores']);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('sanitizeTagName', () => {
    it('should sanitize single tag name (deprecated method)', () => {
      const result = tagService.sanitizeTagName('Work-Project');
      expect(result).toBe('workproject');
    });

    it('should return empty string for invalid tag', () => {
      const result = tagService.sanitizeTagName('---');
      expect(result).toBe('');
    });

    it('should handle empty input', () => {
      const result = tagService.sanitizeTagName('');
      expect(result).toBe('');
    });
  });

  describe('triggerHashtagParsing', () => {
    beforeEach(() => {
      // Mock Bear running
      mockDatabase.isBearRunning = jest.fn().mockResolvedValue(true);
    });

    it('should trigger hashtag parsing for note by ID', async () => {
      const mockNote = {
        Z_PK: 1,
        ZUNIQUEIDENTIFIER: 'note-uuid-123',
        ZTITLE: 'Test Note',
        ZTEXT: 'Content with #hashtag',
      };

      mockDatabase.setQueryOneResult(mockNote);

      const result = await tagService.triggerHashtagParsing('note-uuid-123');

      expect(result).toContain('Hashtag parsing triggered for note: note-uuid-123');
      expect(mockDatabase.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ZUNIQUEIDENTIFIER = ?'),
        ['note-uuid-123']
      );
    });

    it('should trigger hashtag parsing for note by title', async () => {
      const mockNote = {
        Z_PK: 1,
        ZUNIQUEIDENTIFIER: 'note-uuid-123',
        ZTITLE: 'Test Note',
        ZTEXT: 'Content with #hashtag',
      };

      mockDatabase.setQueryOneResult(mockNote);

      const result = await tagService.triggerHashtagParsing(undefined, 'Test Note');

      expect(result).toContain('Hashtag parsing triggered for note: Test Note');
      expect(mockDatabase.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ZTITLE = ?'),
        ['Test Note']
      );
    });

    it('should return warning when Bear is not running', async () => {
      mockDatabase.isBearRunning = jest.fn().mockResolvedValue(false);

      const result = await tagService.triggerHashtagParsing('note-uuid-123');

      expect(result).toContain('Bear is not running');
    });

    it('should throw error when neither noteId nor noteTitle provided', async () => {
      await expect(tagService.triggerHashtagParsing()).rejects.toThrow(
        'Either noteId or noteTitle is required'
      );
    });

    it('should throw error when note not found', async () => {
      mockDatabase.setQueryOneResult(null);

      await expect(tagService.triggerHashtagParsing('nonexistent')).rejects.toThrow(
        'Note not found: nonexistent'
      );
    });

    it('should disconnect database even if parsing fails', async () => {
      mockDatabase.setQueryOneResult(new Error('Database error'));

      await expect(tagService.triggerHashtagParsing('note-id')).rejects.toThrow();
      expect(mockDatabase.disconnect).toHaveBeenCalled();
    });
  });

  describe('batchTriggerHashtagParsing', () => {
    beforeEach(() => {
      // Mock successful note queries
      const mockNotes = [
        { Z_PK: 1, ZUNIQUEIDENTIFIER: 'uuid-1', ZTITLE: 'Note 1' },
        { Z_PK: 2, ZUNIQUEIDENTIFIER: 'uuid-2', ZTITLE: 'Note 2' },
      ];
      mockDatabase.setQueryResult(mockNotes);

      // Mock individual note content queries
      mockDatabase.setQueryOneResult({ ZTEXT: 'Note content with #hashtags' });
    });

    it('should process multiple notes with default options', async () => {
      const result = await tagService.batchTriggerHashtagParsing({});

      expect(result).toContain('Triggered hashtag parsing for 2/2 notes');
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT Z_PK, ZUNIQUEIDENTIFIER, ZTITLE FROM ZSFNOTE WHERE ZTRASHED = 0'
        ),
        []
      );
    });

    it('should apply title pattern filter', async () => {
      const result = await tagService.batchTriggerHashtagParsing({
        title_pattern: 'Project',
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('AND ZTITLE LIKE ?'),
        ['%Project%']
      );
    });

    it('should apply created_after filter', async () => {
      const result = await tagService.batchTriggerHashtagParsing({
        created_after: '2023-01-01T00:00:00.000Z',
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('AND ZCREATIONDATE > ?'),
        expect.arrayContaining([expect.any(Number)])
      );
    });

    it('should apply limit', async () => {
      const result = await tagService.batchTriggerHashtagParsing({
        limit: 10,
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT ?'), [10]);
    });

    it('should handle no notes found', async () => {
      // Override the default mock setup for this test
      mockDatabase.query = jest.fn().mockResolvedValueOnce([]);

      const result = await tagService.batchTriggerHashtagParsing({});

      expect(result).toBe('No notes found matching the criteria');
    });

    it('should handle notes without content gracefully', async () => {
      // First call returns notes, subsequent calls return null content
      mockDatabase.queryOne = jest
        .fn()
        .mockResolvedValueOnce({ ZTEXT: null }) // First note has no content
        .mockResolvedValueOnce({ ZTEXT: null }); // Second note has no content

      const result = await tagService.batchTriggerHashtagParsing({});

      expect(result).toContain('Triggered hashtag parsing for 0/2 notes');
    });

    it('should disconnect database even if batch processing fails', async () => {
      // Make the initial query fail
      mockDatabase.query = jest.fn().mockRejectedValueOnce(new Error('Database error'));

      await expect(tagService.batchTriggerHashtagParsing({})).rejects.toThrow();
      expect(mockDatabase.disconnect).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should dispose cleanly without errors', async () => {
      await expect(tagService.dispose()).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle database connection failures', async () => {
      mockDatabase.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));

      await expect(tagService.getTags()).rejects.toThrow('Connection failed');
    });

    it('should handle query failures', async () => {
      mockDatabase.query = jest.fn().mockRejectedValue(new Error('Query failed'));

      await expect(tagService.getTags()).rejects.toThrow('Query failed');
      expect(mockDatabase.disconnect).toHaveBeenCalled();
    });
  });

  describe('service lifecycle', () => {
    it('should maintain database connection state correctly', async () => {
      await tagService.getTags();

      expect(mockDatabase.connect).toHaveBeenCalledWith(true);
      expect(mockDatabase.disconnect).toHaveBeenCalled();
    });

    it('should handle multiple concurrent operations', async () => {
      const promises = [
        tagService.getTags(),
        tagService.getNotesByTag('work'),
        tagService.getTags(),
      ];

      await Promise.all(promises);

      expect(mockDatabase.connect).toHaveBeenCalledTimes(3);
      expect(mockDatabase.disconnect).toHaveBeenCalledTimes(3);
    });
  });
});
