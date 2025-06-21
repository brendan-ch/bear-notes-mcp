import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { access, constants, copyFile, stat, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import { BearDatabaseError, BearSafetyError } from '../types/bear.js';

const execAsync = promisify(exec);

/**
 * Database connection and safety utilities for Bear SQLite integration
 */
export class BearDatabase {
  private db: sqlite3.Database | null = null;
  private readonly dbPath: string;
  private readonly backupDir: string;

  constructor(dbPath?: string) {
    // Default to standard Bear database location on macOS
    this.dbPath = dbPath || path.join(
      os.homedir(),
      'Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite'
    );
    // Use user's Documents directory for backups - much more accessible
    this.backupDir = path.join(os.homedir(), 'Documents', 'Bear MCP Backups');
  }

  /**
   * Check if Bear app is currently running
   * Critical safety check to prevent database corruption
   */
  async isBearRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('ps aux | grep -i bear | grep -v grep');
      // Look for Bear processes (excluding this script)
      const bearProcesses = stdout
        .split('\n')
        .filter(line => line.includes('Bear') && !line.includes('node') && !line.includes('bear-mcp-server'))
        .filter(line => line.trim().length > 0);
      
      return bearProcesses.length > 0;
    } catch (error) {
      // If ps command fails, assume Bear might be running (safer approach)
      // Could not check Bear process status, assuming it might be running
      return true;
    }
  }

  /**
   * Verify database file exists and is accessible
   */
  async verifyDatabaseAccess(): Promise<void> {
    try {
      await access(this.dbPath, constants.R_OK | constants.W_OK);
      const stats = await stat(this.dbPath);
      
      if (stats.size === 0) {
        throw new BearDatabaseError('Database file is empty');
      }
      
      // Database verified successfully
    } catch (error) {
      throw new BearDatabaseError(
        `Cannot access Bear database at ${this.dbPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a timestamped backup of the database
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `bear_backup_${timestamp}.sqlite`);
    
    try {
      // Ensure backup directory exists
      await mkdir(this.backupDir, { recursive: true });
      
      // Copy database file
      await copyFile(this.dbPath, backupPath);
      
      const stats = await stat(backupPath);
      // Backup created successfully
      
      return backupPath;
    } catch (error) {
      throw new BearDatabaseError(
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Perform comprehensive safety checks before database operations
   */
  async performSafetyChecks(requireWriteAccess: boolean = false): Promise<void> {
    // Check if Bear is running
    if (await this.isBearRunning()) {
      throw new BearSafetyError(
        'Bear app is currently running. Please close Bear before performing database operations to prevent corruption.'
      );
    }

    // Verify database access
    await this.verifyDatabaseAccess();

    // Create backup for write operations
    if (requireWriteAccess) {
      await this.createBackup();
      // Safety checks passed for write operation
    } else {
      // Safety checks passed for read-only operation
    }
  }

  /**
   * Connect to the database with safety checks
   */
  async connect(readOnly: boolean = true): Promise<void> {
    if (this.db) {
      return; // Already connected
    }

    await this.performSafetyChecks(!readOnly);

    return new Promise((resolve, reject) => {
      const mode = readOnly ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE;
      
      this.db = new sqlite3.Database(this.dbPath, mode, (err) => {
        if (err) {
          reject(new BearDatabaseError(`Failed to connect to database: ${err.message}`));
        } else {
          // Connected to Bear database
          resolve();
        }
      });
    });
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(new BearDatabaseError(`Failed to close database: ${err.message}`));
        } else {
          // Disconnected from Bear database
          this.db = null;
          resolve();
        }
      });
    });
  }

  /**
   * Execute a SELECT query
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      throw new BearDatabaseError('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) {
          reject(new BearDatabaseError(`Query failed: ${err.message}\nSQL: ${sql}`));
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  /**
   * Execute a single SELECT query that returns one row
   */
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    if (!this.db) {
      throw new BearDatabaseError('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) {
          reject(new BearDatabaseError(`Query failed: ${err.message}\nSQL: ${sql}`));
        } else {
          resolve(row as T || null);
        }
      });
    });
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE query
   */
  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastID: number }> {
    if (!this.db) {
      throw new BearDatabaseError('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function(err) {
        if (err) {
          reject(new BearDatabaseError(`Execute failed: ${err.message}\nSQL: ${sql}`));
        } else {
          resolve({ changes: this.changes, lastID: this.lastID });
        }
      });
    });
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    await this.execute('BEGIN TRANSACTION');
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(): Promise<void> {
    await this.execute('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(): Promise<void> {
    await this.execute('ROLLBACK');
  }

  /**
   * Execute multiple operations in a transaction
   */
  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    await this.beginTransaction();
    
    try {
      const result = await operations();
      await this.commitTransaction();
      return result;
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  /**
   * Get database schema information
   */
  async getSchema(): Promise<{ name: string; sql: string }[]> {
    return this.query(`
      SELECT name, sql 
      FROM sqlite_master 
      WHERE type = 'table' 
      ORDER BY name
    `);
  }

  /**
   * Check database integrity
   */
  async checkIntegrity(): Promise<boolean> {
    const result = await this.queryOne<{ integrity_check: string }>('PRAGMA integrity_check');
    return result?.integrity_check === 'ok';
  }
}

/**
 * Core Data timestamp utilities
 * Core Data uses seconds since 2001-01-01 00:00:00 UTC
 */
export class CoreDataUtils {
  // Core Data epoch: January 1, 2001 00:00:00 UTC
  private static readonly CORE_DATA_EPOCH = new Date('2001-01-01T00:00:00Z').getTime();

  /**
   * Convert Core Data timestamp to JavaScript Date
   */
  static toDate(coreDataTimestamp: number): Date {
    return new Date(this.CORE_DATA_EPOCH + (coreDataTimestamp * 1000));
  }

  /**
   * Convert JavaScript Date to Core Data timestamp
   */
  static fromDate(date: Date): number {
    return (date.getTime() - this.CORE_DATA_EPOCH) / 1000;
  }

  /**
   * Get current timestamp in Core Data format
   */
  static now(): number {
    return this.fromDate(new Date());
  }
} 