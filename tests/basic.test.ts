/**
 * Basic Tests for Bear MCP Server
 * Simple smoke tests to ensure core functionality works
 */

import { DatabaseService } from '../src/services/database-service.js';
import { config } from '../src/config/index.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Bear MCP Server - Basic Tests', () => {
  const bearDbPath = path.join(
    os.homedir(),
    'Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite'
  );

  describe('Environment Check', () => {
    test('should have Bear database file', () => {
      expect(fs.existsSync(bearDbPath)).toBe(true);
    });

    test('should be able to read database file', () => {
      const stats = fs.statSync(bearDbPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Database Service', () => {
    let dbService: DatabaseService;

    beforeEach(() => {
      dbService = new DatabaseService(bearDbPath);
    });

    afterEach(async () => {
      if (dbService) {
        await dbService.disconnect();
      }
    });

    test('should connect to database', async () => {
      await expect(dbService.connect()).resolves.not.toThrow();
    });

    test('should get database statistics', async () => {
      await dbService.connect();
      const stats = await dbService.getDatabaseStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalNotes).toBe('number');
      expect(typeof stats.totalTags).toBe('number');
      expect(stats.totalNotes).toBeGreaterThanOrEqual(0);
    });

    test('should verify database integrity', async () => {
      await dbService.connect();
      const integrity = await dbService.checkIntegrity();
      expect(integrity).toBe(true);
    });
  });

  describe('Configuration', () => {
    test('should have valid config', () => {
      expect(config).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.database.bearDbPath).toBeDefined();
    });
  });
});