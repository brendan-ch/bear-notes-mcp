/**
 * Test Utilities and Helpers
 * Common utilities for testing Bear MCP Server
 */

import { jest } from '@jest/globals';
import { BearService } from '../../src/services/bear-service.js';
import { mockBearNotes, mockBearTags, mockDatabaseSchema } from '../fixtures/bear-data.js';

// Mock fs/promises for testing
const mockFSStat = {
  size: 1024 * 1024, // 1MB
  mtime: new Date('2024-01-20T16:05:00Z')
};

/**
 * Mock BearDatabase class for testing
 */
export class MockBearDatabase {
  private connected = false;
  private readOnly = true;
  public dbPath = '/tmp/test_database.sqlite'; // Add mock dbPath

  async connect(readOnly: boolean = true): Promise<void> {
    this.connected = true;
    this.readOnly = readOnly;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    // Handle getTags query specifically (it starts with SELECT t.*, COUNT)
    if (sql.includes('SELECT t.*, COUNT(nt.Z_5NOTES) as noteCount') || 
        (sql.includes('ZSFNOTETAG t') && sql.includes('COUNT') && sql.includes('GROUP BY'))) {
      // Return tags with note counts for getTags method
      const tagsWithCounts = mockBearTags.map((tag, index) => ({
        ...tag,
        noteCount: index + 1
      }));
      return tagsWithCounts as T[];
    }

    // Mock responses based on SQL patterns
    if (sql.includes('ZSFNOTE') && sql.includes('COUNT')) {
      return [{ count: mockBearNotes.length }] as T[];
    }

    if (sql.includes('ZSFNOTE') && !sql.includes('COUNT')) {
      // Handle note searches and filters
      let filteredNotes = [...mockBearNotes];
      
      // Handle WHERE conditions in SQL
      if (sql.includes('Z_PK = ?') && params.length > 0) {
        const id = params[0];
        filteredNotes = filteredNotes.filter(note => note.Z_PK === id);
      }
      
      if (sql.includes('ZTITLE = ?') && params.length > 0) {
        const title = params[0];
        filteredNotes = filteredNotes.filter(note => note.ZTITLE === title);
      }
      
      if (sql.includes('ZTITLE LIKE ?') || sql.includes('ZTEXT LIKE ?')) {
        if (params.length > 0) {
          const searchTerm = params[0].replace(/%/g, '').toLowerCase();
          filteredNotes = filteredNotes.filter(note => {
            const titleMatch = note.ZTITLE?.toLowerCase().includes(searchTerm);
            const textMatch = note.ZTEXT?.toLowerCase().includes(searchTerm);
            return titleMatch || textMatch;
          });
        }
      }
      
      // Add tags to notes
      const notesWithTags = filteredNotes.map(note => ({
        ...note,
        tag_names: note.Z_PK === 1 ? 'test,sample' : 
                   note.Z_PK === 2 ? 'archived,old' :
                   note.Z_PK === 3 ? 'trash' :
                   note.Z_PK === 4 ? 'important,pinned' :
                   'quick,untitled'
      }));
      
      return notesWithTags as T[];
    }

    if (sql.includes('ZSFNOTETAG') && sql.includes('COUNT')) {
      return [{ count: mockBearTags.length }] as T[];
    }

    if (sql.includes('ZSFNOTETAG')) {
      // Check if this is the getTags query with COUNT and GROUP BY
      if (sql.includes('COUNT(') && sql.includes('GROUP BY')) {
        // Return tags with note counts
        const tagsWithCounts = mockBearTags.map((tag, index) => ({
          ...tag,
          noteCount: index + 1
        }));
        return tagsWithCounts as T[];
      }
      // Return count for simple COUNT queries
      if (sql.includes('COUNT')) {
        return [{ count: mockBearTags.length }] as T[];
      }
      // Regular tag query
      return mockBearTags as T[];
    }

    if (sql.includes('sqlite_master')) {
      return mockDatabaseSchema as T[];
    }

    // Handle tag-based note queries
    if (sql.includes('Z_5TAGS') && params.length > 0) {
      const tagName = params[0];
      const filteredNotes = mockBearNotes.filter(note => {
        // Mock tag associations
        const noteTags = note.Z_PK === 1 ? ['test', 'sample'] : 
                        note.Z_PK === 2 ? ['archived', 'old'] :
                        note.Z_PK === 3 ? ['trash'] :
                        note.Z_PK === 4 ? ['important', 'pinned'] :
                        ['quick', 'untitled'];
        return noteTags.includes(tagName);
      });
      
      const notesWithTags = filteredNotes.map(note => ({
        ...note,
        tag_names: note.Z_PK === 1 ? 'test,sample' : 
                   note.Z_PK === 2 ? 'archived,old' :
                   note.Z_PK === 3 ? 'trash' :
                   note.Z_PK === 4 ? 'important,pinned' :
                   'quick,untitled'
      }));
      
      return notesWithTags as T[];
    }

    return [] as T[];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastID: number }> {
    if (!this.connected || this.readOnly) {
      throw new Error('Database not writable');
    }
    return { changes: 1, lastID: 1 };
  }

  async isBearRunning(): Promise<boolean> {
    return false; // Always return false in tests
  }

  async verifyDatabaseAccess(): Promise<void> {
    // Always pass in tests
  }

  async createBackup(): Promise<string> {
    return '/tmp/test_backup.sqlite';
  }

  async getSchema(): Promise<{ name: string; sql: string }[]> {
    return mockDatabaseSchema;
  }

  async checkIntegrity(): Promise<boolean> {
    return true;
  }
}

/**
 * Create a mocked BearService for testing
 */
export function createMockBearService(): BearService {
  const service = new BearService();
  
  // Mock the database property
  (service as any).database = new MockBearDatabase();
  
  // Override getDatabaseStats to avoid filesystem calls
  const mockStats = {
    totalNotes: mockBearNotes.length,
    activeNotes: mockBearNotes.filter(n => n.ZTRASHED === 0).length,
    trashedNotes: mockBearNotes.filter(n => n.ZTRASHED === 1).length,
    archivedNotes: mockBearNotes.filter(n => n.ZARCHIVED === 1).length,
    encryptedNotes: mockBearNotes.filter(n => n.ZENCRYPTED === 1).length,
    totalTags: mockBearTags.length,
    totalAttachments: 0,
    databaseSize: mockFSStat.size,
    lastModified: mockFSStat.mtime
  };
  service.getDatabaseStats = jest.fn(() => Promise.resolve(mockStats)) as any;
  
  return service;
}

/**
 * Setup test environment variables
 */
export function setupTestEnvironment() {
  const originalEnv = process.env;
  
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    JEST_VERBOSE: 'false'
  };

  return () => {
    process.env = originalEnv;
  };
}

/**
 * Wait for async operations in tests
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert that a function throws a specific error
 */
export async function expectToThrow(
  fn: () => Promise<any> | any,
  expectedError: string | RegExp | Error
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (typeof expectedError === 'string') {
      expect(error).toHaveProperty('message', expectedError);
    } else if (expectedError instanceof RegExp) {
      expect(error).toHaveProperty('message');
      expect((error as Error).message).toMatch(expectedError);
    } else if (expectedError instanceof Error) {
      expect(error).toEqual(expectedError);
    }
  }
}

/**
 * Create a test MCP tool request
 */
export function createMCPToolRequest(toolName: string, args: any = {}) {
  return {
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  };
}

/**
 * Validate MCP tool response format
 */
export function validateMCPResponse(response: any) {
  expect(response).toHaveProperty('content');
  expect(Array.isArray(response.content)).toBe(true);
  
  if (response.content.length > 0) {
    expect(response.content[0]).toHaveProperty('type');
    expect(response.content[0]).toHaveProperty('text');
  }
}

/**
 * Generate random test data
 */
export const testDataGenerators = {
  randomString: (length: number = 10): string => {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  randomInt: (min: number = 0, max: number = 100): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randomDate: (start: Date = new Date(2020, 0, 1), end: Date = new Date()): Date => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  },

  randomTag: (): string => {
    const tags = ['work', 'personal', 'project', 'idea', 'todo', 'meeting', 'research'];
    return tags[Math.floor(Math.random() * tags.length)];
  }
}; 