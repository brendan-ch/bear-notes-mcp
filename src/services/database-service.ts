/**
 * Database Service
 * Handles low-level database operations and connection management
 */

import { BearDatabase } from '../utils/database.js';
import { DatabaseStats } from '../types/bear.js';
import {
  IDatabaseService,
  ICacheService,
  IPerformanceService,
  SERVICE_TOKENS,
} from './interfaces/index.js';
import { config } from '../config/index.js';
import { SqlParameters } from '../types/database.js';
import { CacheService } from './cache-service.js';

export class DatabaseService implements IDatabaseService {
  private database: BearDatabase;
  private _isConnected = false;
  private cacheService?: ICacheService;
  private performanceService?: IPerformanceService;

  constructor(dbPath?: string) {
    this.database = new BearDatabase(dbPath || config.database.bearDbPath);
  }

  /**
   * Initialize services (called after container is set up)
   */
  private initializeServices(): void {
    if (!this.cacheService) {
      try {
        // Use lazy loading to avoid circular dependencies
        const containerModule = require('./container/service-container.js') as {
          globalContainer: { resolve: <T>(token: string) => T };
        };
        this.cacheService = containerModule.globalContainer.resolve<ICacheService>(
          SERVICE_TOKENS.CACHE_SERVICE
        );
        this.performanceService = containerModule.globalContainer.resolve<IPerformanceService>(
          SERVICE_TOKENS.PERFORMANCE_SERVICE
        );
      } catch {
        // Services not available yet, will retry later
      }
    }
  }

  /**
   * Connect to the database
   */
  async connect(readOnly: boolean = true): Promise<void> {
    await this.database.connect(readOnly);
    this._isConnected = true;
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    await this.database.disconnect();
    this._isConnected = false;
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Execute a query and return multiple results
   */
  async query<T = unknown>(sql: string, params?: SqlParameters): Promise<T[]> {
    if (!this._isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }

    this.initializeServices();

    const startTime = Date.now();
    let cacheHit = false;
    let result: T[];

    // Try cache first for SELECT queries
    if (this.cacheService && sql.trim().toLowerCase().startsWith('select')) {
      const cacheKey = CacheService.generateQueryKey(sql, params || []);
      const cachedResult = await this.cacheService.get<T[]>(cacheKey);

      if (cachedResult) {
        cacheHit = true;
        result = cachedResult;
      } else {
        result = await this.database.query<T>(sql, params);
        // Cache the result for 5 minutes for SELECT queries
        await this.cacheService.set(cacheKey, result, { ttl: 5 * 60 * 1000 });
      }
    } else {
      result = await this.database.query<T>(sql, params);
    }

    // Record performance metrics
    if (this.performanceService) {
      const executionTime = Date.now() - startTime;
      await this.performanceService.recordQuery({
        sql,
        executionTime,
        timestamp: new Date(),
        resultCount: result.length,
        cacheHit,
        parameters: params,
      });
    }

    return result;
  }

  /**
   * Execute a query and return a single result
   */
  async queryOne<T = unknown>(sql: string, params?: SqlParameters): Promise<T | null> {
    if (!this._isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }

    this.initializeServices();

    const startTime = Date.now();
    let cacheHit = false;
    let result: T | null;

    // Try cache first for SELECT queries
    if (this.cacheService && sql.trim().toLowerCase().startsWith('select')) {
      const cacheKey = CacheService.generateQueryKey(`${sql}_ONE`, params || []);
      const cachedResult = await this.cacheService.get<T | null>(cacheKey);

      if (cachedResult !== null) {
        cacheHit = true;
        result = cachedResult;
      } else {
        result = await this.database.queryOne<T>(sql, params);
        // Cache the result for 5 minutes for SELECT queries
        await this.cacheService.set(cacheKey, result, { ttl: 5 * 60 * 1000 });
      }
    } else {
      result = await this.database.queryOne<T>(sql, params);
    }

    // Record performance metrics
    if (this.performanceService) {
      const executionTime = Date.now() - startTime;
      await this.performanceService.recordQuery({
        sql,
        executionTime,
        timestamp: new Date(),
        resultCount: result ? 1 : 0,
        cacheHit,
        parameters: params,
      });
    }

    return result;
  }

  /**
   * Get comprehensive database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    const wasConnected = this._isConnected;

    if (!wasConnected) {
      await this.connect(true); // Read-only connection
    }

    try {
      const [
        totalNotes,
        activeNotes,
        trashedNotes,
        archivedNotes,
        encryptedNotes,
        totalTags,
        totalAttachments,
      ] = await Promise.all([
        this.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM ZSFNOTE'),
        this.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM ZSFNOTE WHERE ZTRASHED = 0'
        ),
        this.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM ZSFNOTE WHERE ZTRASHED = 1'
        ),
        this.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM ZSFNOTE WHERE ZARCHIVED = 1'
        ),
        this.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM ZSFNOTE WHERE ZENCRYPTED = 1'
        ),
        this.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM ZSFNOTETAG'),
        this.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM ZSFNOTEFILE'),
      ]);

      // Get database file size and last modified date
      const fs = await import('fs/promises');
      const stats = await fs.stat(this.database['dbPath']);

      return {
        totalNotes: totalNotes?.count || 0,
        activeNotes: activeNotes?.count || 0,
        trashedNotes: trashedNotes?.count || 0,
        archivedNotes: archivedNotes?.count || 0,
        encryptedNotes: encryptedNotes?.count || 0,
        totalTags: totalTags?.count || 0,
        totalAttachments: totalAttachments?.count || 0,
        databaseSize: stats.size,
        lastModified: stats.mtime,
      };
    } finally {
      if (!wasConnected) {
        await this.disconnect();
      }
    }
  }

  /**
   * Get database schema information
   */
  async getSchema(): Promise<{ name: string; sql: string }[]> {
    const wasConnected = this._isConnected;

    if (!wasConnected) {
      await this.connect(true); // Read-only connection
    }

    try {
      const schema = await this.query<{ name: string; sql: string }>(
        "SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name"
      );
      return schema.filter(table => table.sql); // Filter out system tables
    } finally {
      if (!wasConnected) {
        await this.disconnect();
      }
    }
  }

  /**
   * Check database integrity
   */
  async checkIntegrity(): Promise<boolean> {
    const wasConnected = this._isConnected;

    if (!wasConnected) {
      await this.connect(true); // Read-only connection
    }

    try {
      const result = await this.queryOne<{ integrity_check: string }>('PRAGMA integrity_check');
      return result?.integrity_check === 'ok';
    } finally {
      if (!wasConnected) {
        await this.disconnect();
      }
    }
  }

  /**
   * Verify database access
   */
  async verifyAccess(): Promise<void> {
    const wasConnected = this._isConnected;

    if (!wasConnected) {
      await this.connect(true); // Read-only connection
    }

    try {
      // Try to query a basic table to verify access
      await this.queryOne('SELECT COUNT(*) as count FROM ZSFNOTE LIMIT 1');
    } finally {
      if (!wasConnected) {
        await this.disconnect();
      }
    }
  }

  /**
   * Create a backup of the database
   */
  async createBackup(): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = config.database.backupDir;
    const dbPath = this.database['dbPath'];
    const dbName = path.basename(dbPath);
    const backupPath = path.join(backupDir, `${dbName}.backup.${timestamp}`);

    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    // Copy database file
    await fs.copyFile(dbPath, backupPath);

    return backupPath;
  }

  /**
   * Get the database file path
   */
  getDatabasePath(): string {
    return this.database['dbPath'];
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this._isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }

    await this.query('BEGIN TRANSACTION');

    try {
      const result = await callback();
      await this.query('COMMIT');
      return result;
    } catch (error) {
      await this.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Check if Bear app is currently running
   */
  async isBearRunning(): Promise<boolean> {
    return this.database.isBearRunning();
  }

  /**
   * Dispose of the database service
   */
  async dispose(): Promise<void> {
    if (this._isConnected) {
      await this.disconnect();
    }
  }
}
