/**
 * Database operation types and utilities
 * Provides type safety for database queries and parameters
 */

/**
 * Valid SQL parameter types for database queries
 */
export type SqlParameter = string | number | boolean | null | Date | Buffer;

/**
 * Array of SQL parameters for prepared statements
 */
export type SqlParameters = SqlParameter[];

/**
 * Database query result metadata
 */
export interface QueryMetadata {
  rowCount: number;
  columnCount: number;
  executionTime: number;
  lastInsertId?: number;
  changes?: number;
}

/**
 * Database transaction options
 */
export interface TransactionOptions {
  readonly?: boolean;
  timeout?: number;
  retries?: number;
}

/**
 * Database connection options
 */
export interface ConnectionOptions {
  readonly?: boolean;
  timeout?: number;
  busyTimeout?: number;
  cacheSize?: number;
}

/**
 * Database backup options
 */
export interface BackupOptions {
  compressionLevel?: number;
  includeSchema?: boolean;
  includeData?: boolean;
  backupPath?: string;
}

/**
 * Database integrity check result
 */
export interface IntegrityCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checkedTables: string[];
}

/**
 * Database schema information
 */
export interface SchemaInfo {
  tables: TableInfo[];
  indexes: IndexInfo[];
  triggers: TriggerInfo[];
  views: ViewInfo[];
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primaryKey: string[];
  foreignKeys: ForeignKeyInfo[];
  indexes: string[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: SqlParameter;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

export interface IndexInfo {
  name: string;
  tableName: string;
  columns: string[];
  isUnique: boolean;
  isPrimaryKey: boolean;
}

export interface ForeignKeyInfo {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface TriggerInfo {
  name: string;
  tableName: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  definition: string;
}

export interface ViewInfo {
  name: string;
  definition: string;
  columns: string[];
}

/**
 * Type-safe query builder result
 */
export interface QueryBuilder {
  sql: string;
  parameters: SqlParameters;
  metadata: {
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    tables: string[];
    estimatedRows?: number;
  };
}

/**
 * Database performance metrics
 */
export interface PerformanceMetrics {
  queryCount: number;
  averageQueryTime: number;
  slowQueries: Array<{
    sql: string;
    executionTime: number;
    timestamp: Date;
  }>;
  connectionPoolStats: {
    active: number;
    idle: number;
    waiting: number;
  };
  cacheHitRatio: number;
} 