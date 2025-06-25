/**
 * TypeScript interfaces for Bear's SQLite database entities
 * Based on Core Data schema with Z-prefixed table names
 */

export interface BearNote {
  Z_PK: number; // Primary key
  ZTITLE: string | null; // Note title
  ZTEXT: string | null; // Note content (markdown)
  ZCREATIONDATE: number; // Creation timestamp (Core Data format)
  ZMODIFICATIONDATE: number; // Last modified timestamp
  ZTRASHED: number; // Trash status (0=active, 1=trashed)
  ZARCHIVED: number; // Archive status (0=not archived, 1=archived)
  ZPINNED: number; // Pinned status (0=not pinned, 1=pinned)
  ZENCRYPTED: number; // Encryption status (0=not encrypted, 1=encrypted)
  ZORDER: number | null; // Display order
  ZTRASHEDDATE: number | null; // Date when trashed
  ZARCHIVEDDATE: number | null; // Date when archived
}

export interface BearTag {
  Z_PK: number; // Primary key
  ZTITLE: string; // Tag name
  ZPARENT: number | null; // Parent tag reference (for hierarchical tags)
  ZORDER: number | null; // Display order
  ZCREATIONDATE: number; // Creation timestamp
  ZMODIFICATIONDATE: number; // Last modified timestamp
}

export interface BearNoteTag {
  ZNOTES: number; // Foreign key to ZSFNOTE.Z_PK
  ZTAGS: number; // Foreign key to ZSFTAG.Z_PK
}

export interface BearNoteSearch {
  Z_PK: number; // Primary key
  ZNOTE: number; // Foreign key to ZSFNOTE.Z_PK
  ZTITLE: string | null; // Indexed title for search
  ZTEXT: string | null; // Indexed content for search
}

export interface BearNoteFile {
  Z_PK: number; // Primary key
  ZNOTE: number; // Foreign key to ZSFNOTE.Z_PK
  ZFILENAME: string; // Original filename
  ZFILESIZE: number; // File size in bytes
  ZFILETYPE: string | null; // MIME type
  ZFILEURL: string; // File path/URL
  ZCREATIONDATE: number; // Creation timestamp
}

// Utility types for API responses
export interface NoteWithTags extends BearNote {
  tags: string[]; // Array of tag names
  contentLength?: number; // Content length in characters
  preview?: string; // Content preview (first 200 chars or encrypted indicator)
}

export interface TagWithCount extends BearTag {
  noteCount: number; // Number of notes with this tag
}

export interface DatabaseStats {
  totalNotes: number;
  activeNotes: number;
  trashedNotes: number;
  archivedNotes: number;
  encryptedNotes: number;
  totalTags: number;
  totalAttachments: number;
  databaseSize: number; // Size in bytes
  lastModified: Date;
}

// Search and filter types
export interface NoteSearchOptions {
  query?: string; // Text search query
  tags?: string[]; // Filter by tags
  dateFrom?: Date; // Filter by creation date range
  dateTo?: Date;
  includeArchived?: boolean; // Include archived notes
  includeTrashed?: boolean; // Include trashed notes
  limit?: number; // Limit results
  offset?: number; // Pagination offset
}

export interface NoteCreateOptions {
  title?: string;
  content: string;
  tags?: string[];
  pinned?: boolean;
  archived?: boolean;
}

export interface NoteUpdateOptions {
  title?: string;
  content?: string;
  tags?: string[];
  pinned?: boolean;
  archived?: boolean;
  trashed?: boolean;
}

// Core Data timestamp conversion utilities
export interface CoreDataTimestamp {
  timestamp: number; // Core Data timestamp (seconds since 2001-01-01)
  date: Date; // JavaScript Date object
}

// Error types
export class BearDatabaseError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'BearDatabaseError';
  }
}

export class BearSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BearSafetyError';
  }
}

/**
 * Valid SQL parameter types for database queries
 */
export type SQLParameter = string | number | boolean | Date | null | Buffer;

/**
 * File metadata structure for attachments
 */
export interface FileMetadata {
  [key: string]: string | number | boolean | Date | null | undefined;
}

/**
 * Content analysis result structure
 */
export interface ContentAnalysis {
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
}

/**
 * Link analysis result structure
 */
export interface LinkAnalysis {
  internalLinks: number;
  externalLinks: number;
  brokenLinks: number;
  topDomains: Array<{ domain: string; count: number }>;
  linkTypes: Array<{ type: string; count: number }>;
}

/**
 * Structure analysis result structure
 */
export interface StructureAnalysis {
  titlePatterns: Array<{ pattern: string; count: number; examples: string[] }>;
  averageWordsPerNote: number;
  averageParagraphsPerNote: number;
  notesWithTodos: number;
  notesWithDates: number;
  notesWithNumbers: number;
}

/**
 * Database file record structure (from Bear's SQLite database)
 */
export interface DatabaseFileRecord {
  Z_PK: number;
  ZUNIQUEIDENTIFIER: string;
  ZTITLE: string;
  ZFILENAME: string;
  ZFILETYPE: string;
  ZFILESIZE: number;
  ZCREATIONDATE: number;
  ZMODIFICATIONDATE: number;
  ZNOTE: number;
  ZFILEPATH: string;
  ZCONTENTTYPE: string;
  [key: string]: unknown; // Allow additional database fields
}

/**
 * Database note record structure (from Bear's SQLite database)
 */
export interface DatabaseNoteRecord {
  Z_PK: number;
  ZUNIQUEIDENTIFIER: string;
  ZTITLE: string;
  ZSUBTITLE?: string;
  ZTEXT: string;
  ZCREATIONDATE: number;
  ZMODIFICATIONDATE: number;
  ZORDERINDEX: number;
  ZPINNED: number;
  ZARCHIVED: number;
  ZTRASHED: number;
  ZENCRYPTED: number;
  ZHASFILES: number;
  ZHASIMAGES: number;
  ZHASSOURCECODE: number;
  ZHASTODOS: number;
  ZORDER: number | null;
  ZTRASHEDDATE: number | null;
  ZARCHIVEDDATE: number | null;
  [key: string]: unknown; // Allow additional database fields
}

/**
 * Database search result with additional computed fields
 */
export interface DatabaseSearchResult extends DatabaseNoteRecord {
  tag_names?: string;
  content_length: number;
  preview?: string;
}

/**
 * Database file record with joined note information
 */
export interface DatabaseFileWithNote extends DatabaseFileRecord {
  note_id: number;
  note_title: string;
}
