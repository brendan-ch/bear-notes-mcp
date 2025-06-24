/**
 * Integration Tests - BearService
 * Tests for the main BearService functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BearService } from '../../src/services/bear-service.js';
import { createMockBearService, setupTestEnvironment } from '../utils/test-helpers.js';
import { mockDatabaseStats } from '../fixtures/bear-data.js';

describe('BearService Integration Tests', () => {
  let bearService: BearService;
  let restoreEnv: () => void;

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
    bearService = createMockBearService();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('Database Statistics', () => {
    it('should get database statistics successfully', async () => {
      const stats = await bearService.getDatabaseStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalNotes).toBe('number');
      expect(typeof stats.activeNotes).toBe('number');
      expect(typeof stats.trashedNotes).toBe('number');
      expect(typeof stats.archivedNotes).toBe('number');
      expect(typeof stats.encryptedNotes).toBe('number');
      expect(typeof stats.totalTags).toBe('number');
      expect(typeof stats.totalAttachments).toBe('number');
      expect(typeof stats.databaseSize).toBe('number');
      expect(stats.lastModified).toBeInstanceOf(Date);
    });

    it('should return reasonable statistics values', async () => {
      const stats = await bearService.getDatabaseStats();

      expect(stats.totalNotes).toBeGreaterThanOrEqual(0);
      expect(stats.activeNotes).toBeGreaterThanOrEqual(0);
      expect(stats.activeNotes).toBeLessThanOrEqual(stats.totalNotes);
      expect(stats.trashedNotes).toBeGreaterThanOrEqual(0);
      expect(stats.archivedNotes).toBeGreaterThanOrEqual(0);
      expect(stats.databaseSize).toBeGreaterThan(0);
    });
  });

  describe('Database Schema', () => {
    it('should get database schema successfully', async () => {
      const schema = await bearService.getSchema();

      expect(Array.isArray(schema)).toBe(true);
      expect(schema.length).toBeGreaterThan(0);

      schema.forEach(table => {
        expect(table).toHaveProperty('name');
        expect(table).toHaveProperty('sql');
        expect(typeof table.name).toBe('string');
        expect(typeof table.sql).toBe('string');
      });
    });

    it('should include expected Bear tables', async () => {
      const schema = await bearService.getSchema();
      const tableNames = schema.map(table => table.name);

      expect(tableNames).toContain('ZSFNOTE');
      expect(tableNames).toContain('ZSFNOTETAG');
    });
  });

  describe('Database Access', () => {
    it('should verify database access without errors', async () => {
      await expect(bearService.verifyDatabaseAccess()).resolves.not.toThrow();
    });

    it('should check Bear running status', async () => {
      const isRunning = await bearService.isBearRunning();
      expect(typeof isRunning).toBe('boolean');
      // In tests, Bear should not be running
      expect(isRunning).toBe(false);
    });

    it('should check database integrity', async () => {
      const isIntact = await bearService.checkIntegrity();
      expect(typeof isIntact).toBe('boolean');
      expect(isIntact).toBe(true);
    });
  });

  describe('Notes Retrieval', () => {
    it('should get recent notes successfully', async () => {
      const notes = await bearService.getRecentNotes(5);

      expect(Array.isArray(notes)).toBe(true);
      expect(notes.length).toBeLessThanOrEqual(5);

      notes.forEach(note => {
        expect(note).toHaveProperty('Z_PK');
        expect(note).toHaveProperty('ZCREATIONDATE');
        expect(note).toHaveProperty('ZMODIFICATIONDATE');
        expect(Array.isArray(note.tags)).toBe(true);
      });
    });

    it('should get notes with default limit', async () => {
      const notes = await bearService.getRecentNotes();

      expect(Array.isArray(notes)).toBe(true);
      expect(notes.length).toBeLessThanOrEqual(10); // Default limit
    });

    it('should get note by ID', async () => {
      const note = await bearService.getNoteById(1);

      if (note) {
        expect(note).toHaveProperty('Z_PK');
        expect(note).toHaveProperty('ZCREATIONDATE');
        expect(Array.isArray(note.tags)).toBe(true);
        expect(note.Z_PK).toBe(1);
      }
    });

    it('should return null for non-existent note ID', async () => {
      const note = await bearService.getNoteById(99999);
      expect(note).toBeNull();
    });

    it('should get note by title', async () => {
      const note = await bearService.getNoteByTitle('Test Note 1');

      if (note) {
        expect(note).toHaveProperty('Z_PK');
        expect(note).toHaveProperty('ZCREATIONDATE');
        expect(note.ZTITLE).toBe('Test Note 1');
        expect(Array.isArray(note.tags)).toBe(true);
      }
    });
  });

  describe('Tags Operations', () => {
    it('should get all tags successfully', async () => {
      const tags = await bearService.getTags();

      expect(Array.isArray(tags)).toBe(true);

      tags.forEach(tag => {
        expect(tag).toHaveProperty('Z_PK');
        expect(tag).toHaveProperty('ZTITLE');
        expect(typeof tag.noteCount).toBe('number');
        expect(tag.noteCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should get notes by tag', async () => {
      const notes = await bearService.getNotesByTag('test');

      expect(Array.isArray(notes)).toBe(true);

      notes.forEach(note => {
        expect(note).toHaveProperty('Z_PK');
        expect(note).toHaveProperty('ZCREATIONDATE');
        expect(Array.isArray(note.tags)).toBe(true);
        expect(note.tags).toContain('test');
      });
    });
  });

  describe('Search Operations', () => {
    it('should search notes by query', async () => {
      const notes = await bearService.searchNotes('test');

      expect(Array.isArray(notes)).toBe(true);

      notes.forEach(note => {
        expect(note).toHaveProperty('Z_PK');
        expect(note).toHaveProperty('ZCREATIONDATE');
        expect(Array.isArray(note.tags)).toBe(true);

        // Note should contain the search term in title or content
        const containsQuery =
          (note.ZTITLE && note.ZTITLE.toLowerCase().includes('test')) ||
          (note.ZTEXT && note.ZTEXT.toLowerCase().includes('test'));
        expect(containsQuery).toBe(true);
      });
    });

    it('should handle empty search results', async () => {
      const notes = await bearService.searchNotes('nonexistentquery123');

      expect(Array.isArray(notes)).toBe(true);
      expect(notes.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Create a service with a broken database mock
      const brokenService = new BearService();
      (brokenService as any).database = {
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };

      await expect(brokenService.getDatabaseStats()).rejects.toThrow('Connection failed');
    });
  });
});
