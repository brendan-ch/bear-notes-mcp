/**
 * Test Fixtures - Sample Bear Data
 * Mock data for testing Bear MCP Server functionality
 */

import {
  BearNote,
  BearTag,
  NoteWithTags,
  TagWithCount,
  DatabaseStats,
} from '../../src/types/bear.js';
import { CoreDataUtils } from '../../src/utils/database.js';

// Sample Bear Notes
export const mockBearNotes: BearNote[] = [
  {
    Z_PK: 1,
    ZTITLE: 'Test Note 1',
    ZTEXT: '# Test Note 1\n\nThis is a test note with some content.\n\n#test #sample',
    ZCREATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-01T10:00:00Z')),
    ZMODIFICATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-01T10:30:00Z')),
    ZTRASHED: 0,
    ZARCHIVED: 0,
    ZPINNED: 0,
    ZENCRYPTED: 0,
    ZORDER: null,
    ZTRASHEDDATE: null,
    ZARCHIVEDDATE: null,
  },
  {
    Z_PK: 2,
    ZTITLE: 'Archived Note',
    ZTEXT: '# Archived Note\n\nThis note is archived.\n\n#archived #old',
    ZCREATIONDATE: CoreDataUtils.fromDate(new Date('2023-12-01T15:00:00Z')),
    ZMODIFICATIONDATE: CoreDataUtils.fromDate(new Date('2023-12-01T15:15:00Z')),
    ZTRASHED: 0,
    ZARCHIVED: 1,
    ZPINNED: 0,
    ZENCRYPTED: 0,
    ZORDER: null,
    ZTRASHEDDATE: null,
    ZARCHIVEDDATE: CoreDataUtils.fromDate(new Date('2023-12-15T09:00:00Z')),
  },
  {
    Z_PK: 3,
    ZTITLE: 'Trashed Note',
    ZTEXT: '# Trashed Note\n\nThis note is in trash.\n\n#trash',
    ZCREATIONDATE: CoreDataUtils.fromDate(new Date('2023-11-01T12:00:00Z')),
    ZMODIFICATIONDATE: CoreDataUtils.fromDate(new Date('2023-11-01T12:05:00Z')),
    ZTRASHED: 1,
    ZARCHIVED: 0,
    ZPINNED: 0,
    ZENCRYPTED: 0,
    ZORDER: null,
    ZTRASHEDDATE: CoreDataUtils.fromDate(new Date('2023-11-15T14:00:00Z')),
    ZARCHIVEDDATE: null,
  },
  {
    Z_PK: 4,
    ZTITLE: 'Pinned Note',
    ZTEXT:
      '# Pinned Note\n\nThis is a pinned note with important information.\n\n#important #pinned',
    ZCREATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-15T08:00:00Z')),
    ZMODIFICATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-15T08:30:00Z')),
    ZTRASHED: 0,
    ZARCHIVED: 0,
    ZPINNED: 1,
    ZENCRYPTED: 0,
    ZORDER: 1,
    ZTRASHEDDATE: null,
    ZARCHIVEDDATE: null,
  },
  {
    Z_PK: 5,
    ZTITLE: null, // Untitled note
    ZTEXT: 'Quick note without a title\n\n#quick #untitled',
    ZCREATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-20T16:00:00Z')),
    ZMODIFICATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-20T16:05:00Z')),
    ZTRASHED: 0,
    ZARCHIVED: 0,
    ZPINNED: 0,
    ZENCRYPTED: 0,
    ZORDER: null,
    ZTRASHEDDATE: null,
    ZARCHIVEDDATE: null,
  },
];

// Sample Bear Tags
export const mockBearTags: BearTag[] = [
  {
    Z_PK: 1,
    ZTITLE: 'test',
    ZPARENT: null,
    ZORDER: null,
    ZCREATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-01T10:00:00Z')),
    ZMODIFICATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-01T10:00:00Z')),
  },
  {
    Z_PK: 2,
    ZTITLE: 'sample',
    ZPARENT: null,
    ZORDER: null,
    ZCREATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-01T10:00:00Z')),
    ZMODIFICATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-01T10:00:00Z')),
  },
  {
    Z_PK: 3,
    ZTITLE: 'archived',
    ZPARENT: null,
    ZORDER: null,
    ZCREATIONDATE: CoreDataUtils.fromDate(new Date('2023-12-01T15:00:00Z')),
    ZMODIFICATIONDATE: CoreDataUtils.fromDate(new Date('2023-12-01T15:00:00Z')),
  },
  {
    Z_PK: 4,
    ZTITLE: 'important',
    ZPARENT: null,
    ZORDER: null,
    ZCREATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-15T08:00:00Z')),
    ZMODIFICATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-15T08:00:00Z')),
  },
  {
    Z_PK: 5,
    ZTITLE: 'work/projects',
    ZPARENT: null,
    ZORDER: null,
    ZCREATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-10T09:00:00Z')),
    ZMODIFICATIONDATE: CoreDataUtils.fromDate(new Date('2024-01-10T09:00:00Z')),
  },
];

// Sample Notes with Tags
export const mockNotesWithTags: NoteWithTags[] = mockBearNotes.map((note, index) => ({
  ...note,
  tags:
    index === 0
      ? ['test', 'sample']
      : index === 1
        ? ['archived', 'old']
        : index === 2
          ? ['trash']
          : index === 3
            ? ['important', 'pinned']
            : ['quick', 'untitled'],
  contentLength: note.ZTEXT?.length || 0,
  preview: note.ZTEXT ? note.ZTEXT.substring(0, 200) : 'Empty note',
}));

// Sample Tags with Count
export const mockTagsWithCount: TagWithCount[] = mockBearTags.map((tag, index) => ({
  ...tag,
  noteCount: index + 1, // Varying note counts for testing
}));

// Sample Database Stats
export const mockDatabaseStats: DatabaseStats = {
  totalNotes: 5,
  activeNotes: 3,
  trashedNotes: 1,
  archivedNotes: 1,
  encryptedNotes: 0,
  totalTags: 5,
  totalAttachments: 0,
  databaseSize: 1024 * 1024, // 1MB
  lastModified: new Date('2024-01-20T16:05:00Z'),
};

// Test Database Schema
export const mockDatabaseSchema = [
  {
    name: 'ZSFNOTE',
    sql: `CREATE TABLE ZSFNOTE (
      Z_PK INTEGER PRIMARY KEY,
      ZTITLE TEXT,
      ZTEXT TEXT,
      ZCREATIONDATE REAL,
      ZMODIFICATIONDATE REAL,
      ZTRASHED INTEGER,
      ZARCHIVED INTEGER,
      ZPINNED INTEGER,
      ZENCRYPTED INTEGER
    )`,
  },
  {
    name: 'ZSFNOTETAG',
    sql: `CREATE TABLE ZSFNOTETAG (
      Z_PK INTEGER PRIMARY KEY,
      ZTITLE TEXT,
      ZCREATIONDATE REAL,
      ZMODIFICATIONDATE REAL
    )`,
  },
];

// Helper functions for creating test data
export const createMockNote = (overrides: Partial<BearNote> = {}): BearNote => ({
  Z_PK: Math.floor(Math.random() * 10000),
  ZTITLE: 'Mock Note',
  ZTEXT: '# Mock Note\n\nThis is a mock note for testing.',
  ZCREATIONDATE: CoreDataUtils.now(),
  ZMODIFICATIONDATE: CoreDataUtils.now(),
  ZTRASHED: 0,
  ZARCHIVED: 0,
  ZPINNED: 0,
  ZENCRYPTED: 0,
  ZORDER: null,
  ZTRASHEDDATE: null,
  ZARCHIVEDDATE: null,
  ...overrides,
});

export const createMockTag = (overrides: Partial<BearTag> = {}): BearTag => ({
  Z_PK: Math.floor(Math.random() * 10000),
  ZTITLE: 'mocktag',
  ZPARENT: null,
  ZORDER: null,
  ZCREATIONDATE: CoreDataUtils.now(),
  ZMODIFICATIONDATE: CoreDataUtils.now(),
  ...overrides,
});

export const createMockNoteWithTags = (overrides: Partial<NoteWithTags> = {}): NoteWithTags => ({
  ...createMockNote(),
  tags: ['mock', 'test'],
  contentLength: 50,
  preview: 'Mock note preview...',
  ...overrides,
});
