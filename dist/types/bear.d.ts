/**
 * TypeScript interfaces for Bear's SQLite database entities
 * Based on Core Data schema with Z-prefixed table names
 */
export interface BearNote {
    Z_PK: number;
    ZTITLE: string | null;
    ZTEXT: string | null;
    ZCREATIONDATE: number;
    ZMODIFICATIONDATE: number;
    ZTRASHED: number;
    ZARCHIVED: number;
    ZPINNED: number;
    ZENCRYPTED: number;
    ZORDER: number | null;
    ZTRASHEDDATE: number | null;
    ZARCHIVEDDATE: number | null;
}
export interface BearTag {
    Z_PK: number;
    ZTITLE: string;
    ZPARENT: number | null;
    ZORDER: number | null;
    ZCREATIONDATE: number;
    ZMODIFICATIONDATE: number;
}
export interface BearNoteTag {
    ZNOTES: number;
    ZTAGS: number;
}
export interface BearNoteSearch {
    Z_PK: number;
    ZNOTE: number;
    ZTITLE: string | null;
    ZTEXT: string | null;
}
export interface BearNoteFile {
    Z_PK: number;
    ZNOTE: number;
    ZFILENAME: string;
    ZFILESIZE: number;
    ZFILETYPE: string | null;
    ZFILEURL: string;
    ZCREATIONDATE: number;
}
export interface NoteWithTags extends BearNote {
    tags: string[];
    contentLength?: number;
    preview?: string;
}
export interface TagWithCount extends BearTag {
    noteCount: number;
}
export interface DatabaseStats {
    totalNotes: number;
    activeNotes: number;
    trashedNotes: number;
    archivedNotes: number;
    encryptedNotes: number;
    totalTags: number;
    totalAttachments: number;
    databaseSize: number;
    lastModified: Date;
}
export interface NoteSearchOptions {
    query?: string;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    includeArchived?: boolean;
    includeTrashed?: boolean;
    limit?: number;
    offset?: number;
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
export interface CoreDataTimestamp {
    timestamp: number;
    date: Date;
}
export declare class BearDatabaseError extends Error {
    code?: string | undefined;
    constructor(message: string, code?: string | undefined);
}
export declare class BearSafetyError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=bear.d.ts.map