/**
 * NoteService Unit Tests
 */

import { MockCoreDataUtils } from '../fixtures/bear-data.js';

// Mock the CoreDataUtils
jest.mock('../../src/utils/database.js', () => ({
  CoreDataUtils: MockCoreDataUtils,
}));

import { NoteService } from '../../src/services/note-service.js';
import { IDatabaseService, SERVICE_TOKENS } from '../../src/services/interfaces/index.js';
import { globalContainer } from '../../src/services/container/service-container.js';
import { BearDatabaseError, BearSafetyError } from '../../src/types/bear.js';

// Mock UUID generation
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

describe('NoteService', () => {
  let noteService: NoteService;
  let mockDatabaseService: jest.Mocked<IDatabaseService>;

  beforeEach(() => {
    // Create mock database service
    mockDatabaseService = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(false),
      query: jest.fn(),
      queryOne: jest.fn(),
      getDatabaseStats: jest.fn(),
      getSchema: jest.fn(),
      checkIntegrity: jest.fn(),
      verifyAccess: jest.fn(),
      createBackup: jest.fn(),
    };

    // Register mock service in container
    globalContainer.registerSingleton(SERVICE_TOKENS.DATABASE_SERVICE, () => mockDatabaseService);

    noteService = new NoteService();
  });

  afterEach(() => {
    // Clean up container
    globalContainer.unregister(SERVICE_TOKENS.DATABASE_SERVICE);
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create NoteService and resolve DatabaseService dependency', () => {
      expect(noteService).toBeInstanceOf(NoteService);
      expect(globalContainer.isRegistered(SERVICE_TOKENS.DATABASE_SERVICE)).toBe(true);
    });
  });

  describe('getNotes', () => {
    const mockNotes = [
      {
        Z_PK: 1,
        ZTITLE: 'Test Note 1',
        ZTEXT: 'Content 1',
        ZCREATIONDATE: MockCoreDataUtils.now(),
        ZMODIFICATIONDATE: MockCoreDataUtils.now(),
        ZTRASHED: 0,
        ZARCHIVED: 0,
        ZPINNED: 0,
        ZENCRYPTED: 0,
        tag_names: 'tag1,tag2',
      },
    ];

    it('should get all notes with default options', async () => {
      mockDatabaseService.query.mockResolvedValue(mockNotes);

      const result = await noteService.getNotes();

      expect(mockDatabaseService.connect).toHaveBeenCalledWith(true);
      expect(mockDatabaseService.disconnect).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle empty tag names', async () => {
      mockDatabaseService.query.mockResolvedValue([
        {
          ...mockNotes[0],
          tag_names: null,
        },
      ]);

      const result = await noteService.getNotes();
      expect(result[0].tags).toEqual([]);
    });

    it('should filter out trashed notes by default', async () => {
      mockDatabaseService.query.mockResolvedValue([]);

      await noteService.getNotes();

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('AND n.ZTRASHED = 0'),
        []
      );
    });

    it('should filter out archived notes by default', async () => {
      mockDatabaseService.query.mockResolvedValue([]);

      await noteService.getNotes();

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('AND n.ZARCHIVED = 0'),
        []
      );
    });

    it('should include trashed notes when specified', async () => {
      mockDatabaseService.query.mockResolvedValue([]);

      await noteService.getNotes({ includeTrashed: true });

      const query = mockDatabaseService.query.mock.calls[0][0];
      expect(query).not.toContain('AND n.ZTRASHED = 0');
    });

    it('should search by query when provided', async () => {
      mockDatabaseService.query.mockResolvedValue([]);

      await noteService.getNotes({ query: 'test search' });

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('AND (n.ZTITLE LIKE ? OR n.ZTEXT LIKE ?)'),
        ['%test search%', '%test search%']
      );
    });

    it('should apply date filters when provided', async () => {
      mockDatabaseService.query.mockResolvedValue([]);
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');

      await noteService.getNotes({ dateFrom, dateTo });

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('AND n.ZCREATIONDATE >= ?'),
        [MockCoreDataUtils.fromDate(dateFrom), MockCoreDataUtils.fromDate(dateTo)]
      );
    });

    it('should apply limit and offset when provided', async () => {
      mockDatabaseService.query.mockResolvedValue([]);

      await noteService.getNotes({ limit: 10, offset: 5 });

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        [10, 5]
      );
    });

    it('should disconnect even if query fails', async () => {
      mockDatabaseService.query.mockRejectedValue(new Error('Query failed'));

      await expect(noteService.getNotes()).rejects.toThrow('Query failed');
      expect(mockDatabaseService.disconnect).toHaveBeenCalled();
    });
  });

  describe('getNoteById', () => {
    const mockNote = {
      Z_PK: 1,
      ZTITLE: 'Test Note',
      ZTEXT: 'Content',
      ZCREATIONDATE: MockCoreDataUtils.now(),
      ZMODIFICATIONDATE: MockCoreDataUtils.now(),
      ZTRASHED: 0,
      ZARCHIVED: 0,
      ZPINNED: 0,
      ZENCRYPTED: 0,
      tag_names: 'tag1,tag2',
    };

    it('should get note by ID', async () => {
      mockDatabaseService.queryOne.mockResolvedValue(mockNote);

      const result = await noteService.getNoteById(1);

      expect(mockDatabaseService.connect).toHaveBeenCalledWith(true);
      expect(mockDatabaseService.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.Z_PK = ?'),
        [1]
      );
      expect(mockDatabaseService.disconnect).toHaveBeenCalled();
      expect(result).toEqual({
        ...mockNote,
        tags: ['tag1', 'tag2'],
      });
    });

    it('should return null if note not found', async () => {
      mockDatabaseService.queryOne.mockResolvedValue(null);

      const result = await noteService.getNoteById(999);

      expect(result).toBeNull();
    });
  });

  describe('getNoteByTitle', () => {
    const mockNote = {
      Z_PK: 1,
      ZTITLE: 'Test Note',
      ZTEXT: 'Content',
      ZCREATIONDATE: MockCoreDataUtils.now(),
      ZMODIFICATIONDATE: MockCoreDataUtils.now(),
      ZTRASHED: 0,
      ZARCHIVED: 0,
      ZPINNED: 0,
      ZENCRYPTED: 0,
      tag_names: 'tag1',
    };

    it('should get note by title', async () => {
      mockDatabaseService.queryOne.mockResolvedValue(mockNote);

      const result = await noteService.getNoteByTitle('Test Note');

      expect(mockDatabaseService.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.ZTITLE = ? AND n.ZTRASHED = 0'),
        ['Test Note']
      );
      expect(result).toEqual({
        ...mockNote,
        tags: ['tag1'],
      });
    });

    it('should return null if note not found', async () => {
      mockDatabaseService.queryOne.mockResolvedValue(null);

      const result = await noteService.getNoteByTitle('Nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getRecentNotes', () => {
    it('should get recent notes with default limit', async () => {
      const spy = jest.spyOn(noteService, 'getNotes').mockResolvedValue([]);

      await noteService.getRecentNotes();

      expect(spy).toHaveBeenCalledWith({
        limit: 10,
        includeTrashed: false,
        includeArchived: false,
      });
    });

    it('should get recent notes with custom limit', async () => {
      const spy = jest.spyOn(noteService, 'getNotes').mockResolvedValue([]);

      await noteService.getRecentNotes(5);

      expect(spy).toHaveBeenCalledWith({
        limit: 5,
        includeTrashed: false,
        includeArchived: false,
      });
    });
  });

  describe('getNoteCountsByStatus', () => {
    it('should get note counts by status', async () => {
      mockDatabaseService.queryOne
        .mockResolvedValueOnce({ count: 100 }) // total
        .mockResolvedValueOnce({ count: 80 }) // active
        .mockResolvedValueOnce({ count: 10 }) // trashed
        .mockResolvedValueOnce({ count: 5 }) // archived
        .mockResolvedValueOnce({ count: 3 }); // encrypted

      const result = await noteService.getNoteCountsByStatus();

      expect(result).toEqual({
        total: 100,
        active: 80,
        trashed: 10,
        archived: 5,
        encrypted: 3,
      });
      expect(mockDatabaseService.queryOne).toHaveBeenCalledTimes(5);
    });

    it('should handle null counts gracefully', async () => {
      mockDatabaseService.queryOne.mockResolvedValue(null);

      const result = await noteService.getNoteCountsByStatus();

      expect(result).toEqual({
        total: 0,
        active: 0,
        trashed: 0,
        archived: 0,
        encrypted: 0,
      });
    });
  });

  describe('createNote', () => {
    it('should create a new note successfully', async () => {
      mockDatabaseService.queryOne.mockResolvedValue({ Z_PK: 1 });

      const result = await noteService.createNote({
        title: 'New Note',
        content: 'Note content',
      });

      expect(mockDatabaseService.connect).toHaveBeenCalledWith(false);
      expect(result.noteId).toBe('MOCK-UUID-1234');
      expect(result.success).toBe(true);
    });

    it('should throw error for empty title', async () => {
      await expect(noteService.createNote({ title: '' })).rejects.toThrow(BearSafetyError);
    });

    it('should handle archived notes', async () => {
      mockDatabaseService.queryOne.mockResolvedValue({ Z_PK: 1 });

      await noteService.createNote({
        title: 'Archived Note',
        isArchived: true,
      });

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ZSFNOTE'),
        expect.arrayContaining([1]) // ZARCHIVED = 1
      );
    });

    it('should handle pinned notes', async () => {
      mockDatabaseService.queryOne.mockResolvedValue({ Z_PK: 1 });

      await noteService.createNote({
        title: 'Pinned Note',
        isPinned: true,
      });

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ZSFNOTE'),
        expect.arrayContaining([1]) // ZPINNED = 1
      );
    });

    it('should validate and sanitize tags', async () => {
      mockDatabaseService.queryOne.mockResolvedValue({ Z_PK: 1 });

      const result = await noteService.createNote({
        title: 'Test Note',
        tags: ['valid-tag', '', 'another@tag!', 'valid-tag'], // Invalid and duplicate tags
      });

      // Should have warnings for invalid/duplicate tags
      expect(result.tagWarnings).toBeDefined();
      expect(result.tagWarnings!.length).toBeGreaterThan(0);
    });

    it('should throw error if note creation fails', async () => {
      mockDatabaseService.query.mockRejectedValue(new Error('Insert failed'));

      await expect(noteService.createNote({ title: 'Test Note' })).rejects.toThrow(
        BearDatabaseError
      );
    });
  });

  describe('updateNote', () => {
    const mockExistingNote = {
      Z_PK: 1,
      ZTITLE: 'Existing Note',
      ZTEXT: 'Existing content',
      ZMODIFICATIONDATE: MockCoreDataUtils.now(),
    };

    it('should update note successfully', async () => {
      mockDatabaseService.queryOne.mockResolvedValue(mockExistingNote);

      const result = await noteService.updateNote(1, {
        title: 'Updated Title',
        content: 'Updated content',
      });

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ZSFNOTE SET'),
        expect.arrayContaining(['Updated Title', 'Updated content'])
      );
      expect(result.success).toBe(true);
    });

    it('should throw error if note not found', async () => {
      mockDatabaseService.queryOne.mockResolvedValue(null);

      await expect(noteService.updateNote(999, { title: 'New Title' })).rejects.toThrow(
        BearDatabaseError
      );
    });

    it('should detect modification conflicts', async () => {
      const oldDate = new Date('2024-01-01');
      const expectedDate = new Date('2024-01-02');

      mockDatabaseService.queryOne.mockResolvedValue({
        ...mockExistingNote,
        ZMODIFICATIONDATE: MockCoreDataUtils.fromDate(oldDate),
      });

      const result = await noteService.updateNote(1, {
        title: 'Updated Title',
        expectedModificationDate: expectedDate,
      });

      expect(result.success).toBe(false);
      expect(result.conflictDetected).toBe(true);
    });

    it('should handle tag updates', async () => {
      mockDatabaseService.queryOne.mockResolvedValue(mockExistingNote);

      await noteService.updateNote(1, {
        tags: ['new-tag1', 'new-tag2'],
      });

      // Should delete existing tags and create new ones
      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        'DELETE FROM Z_5TAGS WHERE Z_5NOTES = ?',
        [1]
      );
    });
  });

  describe('duplicateNote', () => {
    const mockOriginalNote = {
      Z_PK: 1,
      ZTITLE: 'Original Note',
      ZTEXT: 'Original content',
      ZARCHIVED: 0,
      ZPINNED: 1,
    };

    it('should duplicate note successfully', async () => {
      mockDatabaseService.queryOne
        .mockResolvedValueOnce(mockOriginalNote) // Get original note
        .mockResolvedValueOnce({ Z_PK: 2 }); // New note ID

      const createNoteSpy = jest.spyOn(noteService, 'createNote').mockResolvedValue({
        noteId: 'new-uuid',
        success: true,
      });

      const result = await noteService.duplicateNote(1);

      expect(createNoteSpy).toHaveBeenCalledWith({
        title: 'Original Note Copy',
        content: 'Original content',
        tags: undefined,
        isArchived: false,
        isPinned: true,
      });
      expect(result).toEqual({
        newNoteId: 'new-uuid',
        success: true,
      });
    });

    it('should copy tags when specified', async () => {
      mockDatabaseService.queryOne.mockResolvedValueOnce(mockOriginalNote);
      mockDatabaseService.query.mockResolvedValue([{ ZTITLE: 'tag1' }, { ZTITLE: 'tag2' }]);

      const createNoteSpy = jest.spyOn(noteService, 'createNote').mockResolvedValue({
        noteId: 'new-uuid',
        success: true,
      });

      await noteService.duplicateNote(1, { copyTags: true });

      expect(createNoteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['tag1', 'tag2'],
        })
      );
    });

    it('should use custom title suffix', async () => {
      mockDatabaseService.queryOne.mockResolvedValueOnce(mockOriginalNote);

      const createNoteSpy = jest.spyOn(noteService, 'createNote').mockResolvedValue({
        noteId: 'new-uuid',
        success: true,
      });

      await noteService.duplicateNote(1, { titleSuffix: ' - Backup' });

      expect(createNoteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Original Note - Backup',
        })
      );
    });

    it('should throw error if original note not found', async () => {
      mockDatabaseService.queryOne.mockResolvedValue(null);

      await expect(noteService.duplicateNote(999)).rejects.toThrow(BearDatabaseError);
    });
  });

  describe('archiveNote', () => {
    it('should archive note successfully', async () => {
      const result = await noteService.archiveNote(1, true);

      expect(mockDatabaseService.query).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should unarchive note successfully', async () => {
      const result = await noteService.archiveNote(1, false);

      expect(mockDatabaseService.query).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      mockDatabaseService.query.mockRejectedValue(new Error('Update failed'));

      await expect(noteService.archiveNote(1, true)).rejects.toThrow(BearDatabaseError);
    });
  });

  describe('Private Methods', () => {
    it('should generate UUID in uppercase', () => {
      const noteServiceAny = noteService as any;
      const uuid = noteServiceAny.generateUUID();

      expect(uuid).toBe('MOCK-UUID-1234');
    });

    it('should validate and sanitize tags correctly', () => {
      const noteServiceAny = noteService as any;
      const result = noteServiceAny.validateAndSanitizeTags([
        'valid-tag',
        '',
        'another@tag!',
        'valid-tag',
        'a'.repeat(101), // Too long
      ]);

      expect(result.sanitized).toContain('valid-tag');
      expect(result.sanitized).toContain('anothertag');
      expect(result.warnings).toContain('Duplicate tag: valid-tag');
      expect(result.warnings.some((w: string) => w.includes('too long'))).toBe(true);
    });

    it('should sanitize tag names correctly', () => {
      const noteServiceAny = noteService as any;

      expect(noteServiceAny.sanitizeTagName('tag@name!')).toBe('tagname');
      expect(noteServiceAny.sanitizeTagName('  spaced  tag  ')).toBe('spaced tag');
      expect(noteServiceAny.sanitizeTagName('tag-with_underscores')).toBe('tag-with_underscores');
    });
  });
});
