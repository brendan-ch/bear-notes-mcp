/**
 * Service Interfaces for Bear MCP Server
 * Defines contracts for the decomposed service architecture
 */

import {
  NoteWithTags,
  TagWithCount,
  DatabaseStats,
  NoteSearchOptions,
  SQLParameter,
} from '../../types/bear.js';

/**
 * Database service interface - handles low-level database operations
 */
export interface IDatabaseService {
  // Connection management
  connect(readOnly?: boolean): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Database operations
  query<T = unknown>(sql: string, params?: SQLParameter[]): Promise<T[]>;
  queryOne<T = unknown>(sql: string, params?: SQLParameter[]): Promise<T | null>;

  // Database maintenance
  getDatabaseStats(): Promise<DatabaseStats>;
  getSchema(): Promise<{ name: string; sql: string }[]>;
  checkIntegrity(): Promise<boolean>;
  verifyAccess(): Promise<void>;
  createBackup(): Promise<string>;

  // Bear-specific operations
  isBearRunning(): Promise<boolean>;
}

/**
 * Note service interface - handles note CRUD operations
 */
export interface INoteService {
  // Note retrieval
  getNotes(options?: NoteSearchOptions): Promise<NoteWithTags[]>;
  getNoteById(id: number): Promise<NoteWithTags | null>;
  getNoteByTitle(title: string): Promise<NoteWithTags | null>;
  getRecentNotes(limit?: number): Promise<NoteWithTags[]>;

  // Note status queries
  getNoteCountsByStatus(): Promise<{
    total: number;
    active: number;
    trashed: number;
    archived: number;
    encrypted: number;
  }>;

  // Note manipulation
  createNote(options: {
    title: string;
    content?: string;
    tags?: string[];
    isArchived?: boolean;
    isPinned?: boolean;
  }): Promise<{ noteId: string; success: boolean; tagWarnings?: string[] }>;

  updateNote(
    noteId: number,
    options: {
      title?: string;
      content?: string;
      tags?: string[];
      isArchived?: boolean;
      isPinned?: boolean;
      expectedModificationDate?: Date;
    }
  ): Promise<{ success: boolean; conflictDetected?: boolean; tagWarnings?: string[] }>;

  duplicateNote(
    noteId: number,
    options?: {
      titleSuffix?: string;
      copyTags?: boolean;
    }
  ): Promise<{ newNoteId: string; success: boolean }>;

  archiveNote(noteId: number, archived: boolean): Promise<{ success: boolean }>;
}

/**
 * Search service interface - handles search operations
 */
export interface ISearchService {
  // Basic search
  searchNotes(query: string, options?: NoteSearchOptions): Promise<NoteWithTags[]>;

  // Advanced search
  searchNotesFullText(
    query: string,
    options?: {
      limit?: number;
      includeSnippets?: boolean;
      searchFields?: ('title' | 'content' | 'both')[];
      fuzzyMatch?: boolean;
      caseSensitive?: boolean;
      wholeWords?: boolean;
      includeArchived?: boolean;
      includeTrashed?: boolean;
      tags?: string[];
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<
    Array<
      NoteWithTags & {
        relevanceScore: number;
        matchedTerms: string[];
        snippets: string[];
        titleMatches: number;
        contentMatches: number;
      }
    >
  >;

  // Search utilities
  getSearchSuggestions(
    partialQuery: string,
    limit?: number
  ): Promise<{
    terms: string[];
    titles: string[];
    tags: string[];
  }>;

  findSimilarNotes(
    referenceText: string,
    options?: {
      limit?: number;
      minSimilarity?: number;
      excludeNoteId?: number;
    }
  ): Promise<Array<NoteWithTags & { similarityScore: number; commonKeywords: string[] }>>;

  // Advanced filtering
  getNotesAdvanced(options?: {
    query?: string;
    tags?: string[];
    excludeTags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    modifiedAfter?: Date;
    modifiedBefore?: Date;
    includeContent?: boolean;
    includeTrashed?: boolean;
    includeArchived?: boolean;
    includeEncrypted?: boolean;
    sortBy?: 'created' | 'modified' | 'title' | 'size';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<NoteWithTags[]>;

  getNotesWithCriteria(criteria: {
    titleContains?: string[];
    contentContains?: string[];
    hasAllTags?: string[];
    hasAnyTags?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
    modifiedAfter?: Date;
    modifiedBefore?: Date;
    minLength?: number;
    maxLength?: number;
    isPinned?: boolean;
    isArchived?: boolean;
    isTrashed?: boolean;
    isEncrypted?: boolean;
  }): Promise<NoteWithTags[]>;
}

/**
 * Tag service interface - handles tag operations
 */
export interface ITagService {
  // Tag retrieval
  getTags(): Promise<TagWithCount[]>;
  getNotesByTag(tagName: string): Promise<NoteWithTags[]>;

  // Tag management
  validateAndSanitizeTags(tags: string[]): {
    sanitized: string[];
    warnings: string[];
  };

  // Bear-specific tag operations
  triggerHashtagParsing(noteId?: string, noteTitle?: string): Promise<string>;
  batchTriggerHashtagParsing(options: {
    tag_filter?: string;
    title_pattern?: string;
    limit?: number;
    created_after?: string;
  }): Promise<string>;
}

/**
 * Analytics service interface - handles analytics and insights
 */
export interface IAnalyticsService {
  // Note analytics
  getNoteAnalytics(): Promise<{
    totalNotes: number;
    averageLength: number;
    longestNote: { title: string; length: number };
    shortestNote: { title: string; length: number };
    mostRecentNote: { title: string; date: Date };
    oldestNote: { title: string; date: Date };
    notesPerMonth: { month: string; count: number }[];
    topTags: { tag: string; count: number }[];
    contentStats: {
      hasImages: number;
      hasFiles: number;
      hasSourceCode: number;
      hasTodos: number;
    };
  }>;

  // Content analysis
  analyzeNoteMetadata(options?: {
    includeContentAnalysis?: boolean;
    includeLinkAnalysis?: boolean;
    includeStructureAnalysis?: boolean;
  }): Promise<{
    overview: {
      totalNotes: number;
      averageLength: number;
      lengthDistribution: Array<{ range: string; count: number }>;
      creationPatterns: Array<{ hour: number; count: number }>;
      modificationPatterns: Array<{ hour: number; count: number }>;
    };
    contentAnalysis?: {
      markdownUsage: {
        headings: number;
        lists: number;
        codeBlocks: number;
        links: number;
        images: number;
        tables: number;
      };
      languagePatterns: Array<{ language: string; count: number }>;
      commonPatterns: Array<{ pattern: string; description: string; count: number }>;
    };
    linkAnalysis?: {
      internalLinks: number;
      externalLinks: number;
      brokenLinks: number;
      topDomains: Array<{ domain: string; count: number }>;
      linkTypes: Array<{ type: string; count: number }>;
    };
    structureAnalysis?: {
      titlePatterns: Array<{ pattern: string; count: number; examples: string[] }>;
      averageWordsPerNote: number;
      averageParagraphsPerNote: number;
      notesWithTodos: number;
      notesWithDates: number;
      notesWithNumbers: number;
    };
  }>;

  // File attachments
  getFileAttachments(options?: {
    noteId?: number;
    fileType?: string;
    includeMetadata?: boolean;
    limit?: number;
  }): Promise<{
    totalAttachments: number;
    attachments: Array<{
      id: number;
      filename: string;
      fileType: string;
      fileSize: number;
      createdAt: Date;
      modifiedAt: Date;
      noteId: number;
      noteTitle: string;
      filePath: string;
      contentType: string;
      metadata?: Record<string, unknown>;
    }>;
    attachmentsByType: Array<{ type: string; count: number; totalSize: number }>;
  }>;

  // Enhanced note metadata
  getNotesWithMetadata(criteria: {
    hasAttachments?: boolean;
    hasLinks?: boolean;
    hasImages?: boolean;
    hasTodos?: boolean;
    hasCodeBlocks?: boolean;
    hasTables?: boolean;
    minWordCount?: number;
    maxWordCount?: number;
    createdAfter?: Date;
    createdBefore?: Date;
    modifiedAfter?: Date;
    modifiedBefore?: Date;
    limit?: number;
  }): Promise<
    Array<
      NoteWithTags & {
        wordCount: number;
        attachmentCount: number;
        linkCount: number;
        imageCount: number;
        todoCount: number;
        codeBlockCount: number;
        tableCount: number;
        metadata: {
          hasAttachments: boolean;
          hasLinks: boolean;
          hasImages: boolean;
          hasTodos: boolean;
          hasCodeBlocks: boolean;
          hasTables: boolean;
        };
      }
    >
  >;

  // Related notes
  getRelatedNotes(
    noteId: number,
    limit?: number
  ): Promise<{
    byTags: NoteWithTags[];
    byContent: NoteWithTags[];
  }>;
}

/**
 * Bear API service interface - handles Bear application integration
 */
export interface IBearApiService {
  // Bear process management
  isBearRunning(): Promise<boolean>;

  // Bear API operations
  createNoteViaBearAPI(title: string, content: string, tags: string[]): Promise<string>;

  // Bear cache management
  clearBearCache(): Promise<void>;
  triggerBearReparse(noteId: number): Promise<void>;
}

/**
 * File system service interface - handles file operations
 */
export interface IFileSystemService {
  // File operations
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;

  // Directory operations
  createDirectory(path: string): Promise<void>;
  listDirectory(path: string): Promise<string[]>;

  // File metadata
  getFileStats(path: string): Promise<{
    size: number;
    mtime: Date;
    isFile: boolean;
    isDirectory: boolean;
  }>;

  // Backup operations
  createBackup(sourcePath: string, backupPath: string): Promise<string>;
}

/**
 * Service container interface for dependency injection
 */
export interface IServiceContainer {
  // Service registration
  register<T>(token: string, factory: () => T): void;
  registerSingleton<T>(token: string, factory: () => T): void;

  // Service resolution
  resolve<T>(token: string): T;

  // Service lifecycle
  dispose(): Promise<void>;
}

/**
 * Validation service interface - handles input validation and sanitization
 */
export interface IValidationService {
  validate(
    data: Record<string, unknown>,
    schema: Record<string, unknown>,
    context?: Record<string, unknown>
  ): {
    isValid: boolean;
    errors: unknown[];
    sanitizedData?: Record<string, unknown>;
  };

  validateField(
    name: string,
    value: unknown,
    rule: Record<string, unknown>,
    context?: Record<string, unknown>
  ): unknown;

  sanitize(data: Record<string, unknown>, schema: Record<string, unknown>): Record<string, unknown>;

  validateMcpArgs(
    method: string,
    args: Record<string, unknown>
  ): {
    isValid: boolean;
    errors: unknown[];
    sanitizedData?: Record<string, unknown>;
  };

  validateNoteData(data: Record<string, unknown>): {
    isValid: boolean;
    errors: unknown[];
    sanitizedData?: Record<string, unknown>;
  };

  validateSearchParams(params: Record<string, unknown>): {
    isValid: boolean;
    errors: unknown[];
    sanitizedData?: Record<string, unknown>;
  };

  validateTagParams(params: Record<string, unknown>): {
    isValid: boolean;
    errors: unknown[];
    sanitizedData?: Record<string, unknown>;
  };
}

/**
 * Logging service interface - handles structured logging and monitoring
 */
export interface ILoggingService {
  // Core logging methods
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void;

  // Structured logging with context
  child(context: Record<string, unknown>): ILoggingService;

  // Performance logging
  startTimer(label: string): () => void;
  logPerformance(operation: string, duration: number, meta?: Record<string, unknown>): void;

  // Health checks and monitoring
  logHealthCheck(
    service: string,
    status: 'healthy' | 'unhealthy' | 'degraded',
    details?: Record<string, unknown>
  ): void;
  logSystemMetrics(metrics: Record<string, unknown>): void;

  // Service lifecycle logging
  logServiceStart(serviceName: string, version?: string): void;
  logServiceStop(serviceName: string, reason?: string): void;

  // Database operation logging
  logDatabaseOperation(
    operation: string,
    duration: number,
    rowsAffected?: number,
    error?: Error
  ): void;

  // Security and audit logging
  logSecurityEvent(event: string, details: Record<string, unknown>): void;
  logAuditEvent(
    action: string,
    resource: string,
    user?: string,
    details?: Record<string, unknown>
  ): void;

  // Configuration
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void;
  getLevel(): string;

  // Cleanup
  close(): Promise<void>;
}

/**
 * Health check service interface - provides health monitoring
 */
export interface IHealthService {
  // Health check methods
  checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: Date;
    uptime: number;
    services: Record<
      string,
      {
        status: 'healthy' | 'unhealthy' | 'degraded';
        responseTime?: number;
        error?: string;
        lastCheck: Date;
      }
    >;
    system: {
      memory: {
        used: number;
        total: number;
        percentage: number;
      };
      cpu: {
        usage: number;
      };
      disk?: {
        used: number;
        total: number;
        percentage: number;
      };
    };
  }>;

  // Individual service health checks
  checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
    error?: string;
  }>;
  checkBearHealth(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
    error?: string;
  }>;
  checkCacheHealth(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
    error?: string;
  }>;

  // Monitoring configuration
  setHealthCheckInterval(intervalMs: number): void;
  startHealthChecks(): void;
  stopHealthChecks(): void;
}

// Re-export cache and performance interfaces
export type { ICacheService, CacheEntry, CacheStats, CacheOptions } from '../cache-service.js';
export type {
  IPerformanceService,
  QueryPerformance,
  SystemMetrics,
  PerformanceReport,
} from '../performance-service.js';

// Service tokens for dependency injection
export const SERVICE_TOKENS = {
  DATABASE_SERVICE: 'DatabaseService',
  NOTE_SERVICE: 'NoteService',
  SEARCH_SERVICE: 'SearchService',
  TAG_SERVICE: 'TagService',
  CACHE_SERVICE: 'CacheService',
  PERFORMANCE_SERVICE: 'PerformanceService',
  VALIDATION_SERVICE: 'ValidationService',
  LOGGING_SERVICE: 'LoggingService',
  HEALTH_SERVICE: 'HealthService',
  ANALYTICS_SERVICE: 'AnalyticsService',
  BEAR_API_SERVICE: 'BearApiService',
  FILE_SYSTEM_SERVICE: 'FileSystemService',
} as const;
