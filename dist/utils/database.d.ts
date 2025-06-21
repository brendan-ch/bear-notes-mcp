/**
 * Database connection and safety utilities for Bear SQLite integration
 */
export declare class BearDatabase {
    private db;
    private readonly dbPath;
    private readonly backupDir;
    constructor(dbPath?: string);
    /**
     * Check if Bear app is currently running
     * Critical safety check to prevent database corruption
     */
    isBearRunning(): Promise<boolean>;
    /**
     * Verify database file exists and is accessible
     */
    verifyDatabaseAccess(): Promise<void>;
    /**
     * Create a timestamped backup of the database
     */
    createBackup(): Promise<string>;
    /**
     * Perform comprehensive safety checks before database operations
     */
    performSafetyChecks(requireWriteAccess?: boolean): Promise<void>;
    /**
     * Connect to the database with safety checks
     */
    connect(readOnly?: boolean): Promise<void>;
    /**
     * Disconnect from the database
     */
    disconnect(): Promise<void>;
    /**
     * Execute a SELECT query
     */
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    /**
     * Execute a single SELECT query that returns one row
     */
    queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
    /**
     * Execute an INSERT, UPDATE, or DELETE query
     */
    execute(sql: string, params?: any[]): Promise<{
        changes: number;
        lastID: number;
    }>;
    /**
     * Begin a transaction
     */
    beginTransaction(): Promise<void>;
    /**
     * Commit a transaction
     */
    commitTransaction(): Promise<void>;
    /**
     * Rollback a transaction
     */
    rollbackTransaction(): Promise<void>;
    /**
     * Execute multiple operations in a transaction
     */
    transaction<T>(operations: () => Promise<T>): Promise<T>;
    /**
     * Get database schema information
     */
    getSchema(): Promise<{
        name: string;
        sql: string;
    }[]>;
    /**
     * Check database integrity
     */
    checkIntegrity(): Promise<boolean>;
}
/**
 * Core Data timestamp utilities
 * Core Data uses seconds since 2001-01-01 00:00:00 UTC
 */
export declare class CoreDataUtils {
    private static readonly CORE_DATA_EPOCH;
    /**
     * Convert Core Data timestamp to JavaScript Date
     */
    static toDate(coreDataTimestamp: number): Date;
    /**
     * Convert JavaScript Date to Core Data timestamp
     */
    static fromDate(date: Date): number;
    /**
     * Get current timestamp in Core Data format
     */
    static now(): number;
}
//# sourceMappingURL=database.d.ts.map