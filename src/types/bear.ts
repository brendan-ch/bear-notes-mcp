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
