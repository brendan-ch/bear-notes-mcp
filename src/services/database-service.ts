/**
 * Database Service
 * Handles low-level database operations and connection management
 */

import { BearDatabase } from '../utils/database.js';
import { DatabaseStats } from '../types/bear.js';
import { IDatabaseService } from './interfaces/index.js';
import { config } from '../config/index.js';

export class DatabaseService implements IDatabaseService {
  private database: BearDatabase;
  private _isConnected = false;

  constructor(dbPath?: string) {
    this.database = new BearDatabase(dbPath || config.database.bearDbPath);
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
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this._isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.database.query<T>(sql, params);
  }

  /**
   * Execute a query and return a single result
   */
  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    if (!this._isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.database.queryOne<T>(sql, params);
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
   * Dispose of the database service
   */
  async dispose(): Promise<void> {
    if (this._isConnected) {
      await this.disconnect();
    }
  }
} 