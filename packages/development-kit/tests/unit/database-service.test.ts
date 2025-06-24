/**
 * Unit tests for DatabaseService
 */

import { DatabaseService } from '../../src/services/database-service.js';
import { MockBearDatabase } from '../utils/test-helpers.js';

// Mock fs/promises
const mockStat = jest.fn().mockResolvedValue({
  size: 1024 * 1024,
  mtime: new Date('2024-01-20T16:05:00Z'),
});

const mockMkdir = jest.fn().mockResolvedValue(undefined);
const mockCopyFile = jest.fn().mockResolvedValue(undefined);

jest.mock('fs/promises', () => ({
  stat: mockStat,
  mkdir: mockMkdir,
  copyFile: mockCopyFile,
}));

// Mock the BearDatabase and CoreDataUtils
jest.mock('../../src/utils/database.js', () => ({
  BearDatabase: jest.fn().mockImplementation(() => new MockBearDatabase()),
  CoreDataUtils: {
    toDate: jest.fn((timestamp: number) => new Date(timestamp * 1000 + Date.parse('2001-01-01T00:00:00Z'))),
    fromDate: jest.fn((date: Date) => (date.getTime() - Date.parse('2001-01-01T00:00:00Z')) / 1000),
    now: jest.fn(() => (Date.now() - Date.parse('2001-01-01T00:00:00Z')) / 1000),
  },
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  let mockDatabase: MockBearDatabase;

  beforeEach(() => {
    databaseService = new DatabaseService();
    // Get the mock instance
    mockDatabase = (databaseService as any).database;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should connect to database', async () => {
      await databaseService.connect();
      
      expect(mockDatabase.connect).toHaveBeenCalledWith(true);
      expect(databaseService.isConnected()).toBe(true);
    });

    it('should connect in read-write mode when specified', async () => {
      await databaseService.connect(false);
      
      expect(mockDatabase.connect).toHaveBeenCalledWith(false);
      expect(databaseService.isConnected()).toBe(true);
    });

    it('should disconnect from database', async () => {
      await databaseService.connect();
      await databaseService.disconnect();
      
      expect(mockDatabase.disconnect).toHaveBeenCalled();
      expect(databaseService.isConnected()).toBe(false);
    });

    it('should start with disconnected state', () => {
      expect(databaseService.isConnected()).toBe(false);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await databaseService.connect();
    });

    afterEach(async () => {
      await databaseService.disconnect();
    });

    it('should execute query and return results', async () => {
      const sql = 'SELECT * FROM ZSFNOTE';
      const results = await databaseService.query(sql);
      
      expect(mockDatabase.query).toHaveBeenCalledWith(sql, undefined);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should execute query with parameters', async () => {
      const sql = 'SELECT * FROM ZSFNOTE WHERE Z_PK = ?';
      const params = [1];
      
      await databaseService.query(sql, params);
      
      expect(mockDatabase.query).toHaveBeenCalledWith(sql, params);
    });

    it('should execute queryOne and return single result', async () => {
      const sql = 'SELECT * FROM ZSFNOTE WHERE Z_PK = ?';
      const params = [1];
      
      const result = await databaseService.queryOne(sql, params);
      
      expect(mockDatabase.queryOne).toHaveBeenCalledWith(sql, params);
      expect(result).toBeDefined();
    });

    it('should throw error when querying without connection', async () => {
      await databaseService.disconnect();
      
      await expect(databaseService.query('SELECT 1')).rejects.toThrow(
        'Database not connected. Call connect() first.'
      );
    });

    it('should throw error when queryOne without connection', async () => {
      await databaseService.disconnect();
      
      await expect(databaseService.queryOne('SELECT 1')).rejects.toThrow(
        'Database not connected. Call connect() first.'
      );
    });
  });

  describe('Database Statistics', () => {
    it('should get database statistics', async () => {
      const stats = await databaseService.getDatabaseStats();
      
      expect(stats).toHaveProperty('totalNotes');
      expect(stats).toHaveProperty('activeNotes');
      expect(stats).toHaveProperty('trashedNotes');
      expect(stats).toHaveProperty('archivedNotes');
      expect(stats).toHaveProperty('encryptedNotes');
      expect(stats).toHaveProperty('totalTags');
      expect(stats).toHaveProperty('totalAttachments');
      expect(stats).toHaveProperty('databaseSize');
      expect(stats).toHaveProperty('lastModified');
      
      expect(typeof stats.totalNotes).toBe('number');
      expect(typeof stats.activeNotes).toBe('number');
    });

    it('should handle database connection automatically for stats', async () => {
      expect(databaseService.isConnected()).toBe(false);
      
      await databaseService.getDatabaseStats();
      
      // Should auto-connect and disconnect
      expect(databaseService.isConnected()).toBe(false);
    });
  });

  describe('Database Schema', () => {
    it('should get database schema', async () => {
      const schema = await databaseService.getSchema();
      
      expect(Array.isArray(schema)).toBe(true);
      if (schema.length > 0) {
        expect(schema[0]).toHaveProperty('name');
        expect(schema[0]).toHaveProperty('sql');
      }
    });

    it('should handle connection automatically for schema', async () => {
      expect(databaseService.isConnected()).toBe(false);
      
      await databaseService.getSchema();
      
      expect(databaseService.isConnected()).toBe(false);
    });
  });

  describe('Database Integrity', () => {
    it('should check database integrity', async () => {
      const isIntact = await databaseService.checkIntegrity();
      
      expect(typeof isIntact).toBe('boolean');
    });

    it('should handle connection automatically for integrity check', async () => {
      expect(databaseService.isConnected()).toBe(false);
      
      await databaseService.checkIntegrity();
      
      expect(databaseService.isConnected()).toBe(false);
    });
  });

  describe('Database Access Verification', () => {
    it('should verify database access', async () => {
      await expect(databaseService.verifyAccess()).resolves.not.toThrow();
    });

    it('should handle connection automatically for access verification', async () => {
      expect(databaseService.isConnected()).toBe(false);
      
      await databaseService.verifyAccess();
      
      expect(databaseService.isConnected()).toBe(false);
    });
  });

  describe('Database Backup', () => {
    it('should create database backup', async () => {
      const backupPath = await databaseService.createBackup();
      
      expect(typeof backupPath).toBe('string');
      expect(backupPath).toContain('.backup.');
      expect(mockMkdir).toHaveBeenCalled();
      expect(mockCopyFile).toHaveBeenCalled();
    });
  });

  describe('Transaction Support', () => {
    beforeEach(async () => {
      await databaseService.connect();
    });

    afterEach(async () => {
      await databaseService.disconnect();
    });

    it('should execute transaction successfully', async () => {
      const callback = jest.fn().mockResolvedValue('success');
      
      const result = await databaseService.transaction(callback);
      
      expect(result).toBe('success');
      expect(callback).toHaveBeenCalled();
      expect(mockDatabase.query).toHaveBeenCalledWith('BEGIN TRANSACTION', undefined);
      expect(mockDatabase.query).toHaveBeenCalledWith('COMMIT', undefined);
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Transaction failed');
      const callback = jest.fn().mockRejectedValue(error);
      
      await expect(databaseService.transaction(callback)).rejects.toThrow('Transaction failed');
      
      expect(mockDatabase.query).toHaveBeenCalledWith('BEGIN TRANSACTION', undefined);
      expect(mockDatabase.query).toHaveBeenCalledWith('ROLLBACK', undefined);
    });

    it('should throw error when transaction called without connection', async () => {
      await databaseService.disconnect();
      
      const callback = jest.fn();
      
      await expect(databaseService.transaction(callback)).rejects.toThrow(
        'Database not connected. Call connect() first.'
      );
    });
  });

  describe('Service Lifecycle', () => {
    it('should dispose service properly', async () => {
      await databaseService.connect();
      expect(databaseService.isConnected()).toBe(true);
      
      await databaseService.dispose();
      
      expect(databaseService.isConnected()).toBe(false);
      expect(mockDatabase.disconnect).toHaveBeenCalled();
    });

    it('should handle dispose when not connected', async () => {
      expect(databaseService.isConnected()).toBe(false);
      
      await expect(databaseService.dispose()).resolves.not.toThrow();
    });

    it('should provide database path', () => {
      const path = databaseService.getDatabasePath();
      
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe('Connection State Management', () => {
    it('should maintain connection state correctly', async () => {
      expect(databaseService.isConnected()).toBe(false);
      
      await databaseService.connect();
      expect(databaseService.isConnected()).toBe(true);
      
      await databaseService.disconnect();
      expect(databaseService.isConnected()).toBe(false);
    });

    it('should not disconnect when already connected for auto-connect operations', async () => {
      await databaseService.connect();
      const initialConnectionState = databaseService.isConnected();
      
      await databaseService.getDatabaseStats();
      
      expect(databaseService.isConnected()).toBe(initialConnectionState);
    });
  });
}); 