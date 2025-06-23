/**
 * Bear MCP Server - Bear Service
 * Copyright (c) 2024 Bear MCP Server
 * MIT License - see LICENSE file for details
 */
import { NoteWithTags, TagWithCount, DatabaseStats, NoteSearchOptions } from '../types/bear.js';
/**
 * Service layer for Bear database operations
 * Provides high-level methods for interacting with Bear's data
 */
export declare class BearService {
    private database;
    constructor(dbPath?: string);
    /**
     * Get comprehensive database statistics
     */
    getDatabaseStats(): Promise<DatabaseStats>;
    /**
     * Get all notes with optional filtering
     */
    getNotes(options?: NoteSearchOptions): Promise<NoteWithTags[]>;
    /**
     * Get a single note by ID
     */
    getNoteById(id: number): Promise<NoteWithTags | null>;
    /**
     * Get a single note by title
     */
    getNoteByTitle(title: string): Promise<NoteWithTags | null>;
    /**
     * Search notes by content and title
     */
    searchNotes(query: string, options?: NoteSearchOptions): Promise<NoteWithTags[]>;
    /**
     * Get all tags with usage counts
     */
    getTags(): Promise<TagWithCount[]>;
    /**
     * Get notes by tag
     */
    getNotesByTag(tagName: string): Promise<NoteWithTags[]>;
    /**
     * Check if Bear app is currently running
     */
    isBearRunning(): Promise<boolean>;
    /**
     * Verify database access
     */
    verifyDatabaseAccess(): Promise<void>;
    /**
     * Create a database backup
     */
    createBackup(): Promise<string>;
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
    /**
     * Get recent notes (last 10 by default)
     */
    getRecentNotes(limit?: number): Promise<NoteWithTags[]>;
    /**
     * Get note count by status
     */
    getNoteCountsByStatus(): Promise<{
        total: number;
        active: number;
        trashed: number;
        archived: number;
        encrypted: number;
    }>;
    /**
     * Get notes with advanced filtering options
     */
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
    /**
     * Get notes by multiple criteria with AND/OR logic
     */
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
    /**
     * Get note statistics and analytics
     */
    getNoteAnalytics(): Promise<{
        totalNotes: number;
        averageLength: number;
        longestNote: {
            title: string;
            length: number;
        };
        shortestNote: {
            title: string;
            length: number;
        };
        mostRecentNote: {
            title: string;
            date: Date;
        };
        oldestNote: {
            title: string;
            date: Date;
        };
        notesPerMonth: {
            month: string;
            count: number;
        }[];
        topTags: {
            tag: string;
            count: number;
        }[];
        contentStats: {
            hasImages: number;
            hasFiles: number;
            hasSourceCode: number;
            hasTodos: number;
        };
    }>;
    /**
     * Find related notes based on content similarity and shared tags
     */
    getRelatedNotes(noteId: number, limit?: number): Promise<{
        byTags: NoteWithTags[];
        byContent: NoteWithTags[];
    }>;
    /**
     * Extract keywords from text for content similarity matching
     */
    private extractKeywords;
    /**
     * Advanced full-text search with ranking and relevance scoring
     */
    searchNotesFullText(query: string, options?: {
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
    }): Promise<Array<NoteWithTags & {
        relevanceScore: number;
        matchedTerms: string[];
        snippets: string[];
        titleMatches: number;
        contentMatches: number;
    }>>;
    /**
     * Search with auto-complete suggestions
     */
    getSearchSuggestions(partialQuery: string, limit?: number): Promise<{
        terms: string[];
        titles: string[];
        tags: string[];
    }>;
    /**
     * Search for similar notes using content analysis
     */
    findSimilarNotes(referenceText: string, options?: {
        limit?: number;
        minSimilarity?: number;
        excludeNoteId?: number;
    }): Promise<Array<NoteWithTags & {
        similarityScore: number;
        commonKeywords: string[];
    }>>;
    /**
     * Extract search terms with optional fuzzy matching
     */
    private extractSearchTerms;
    /**
     * Analyze search matches and calculate relevance
     */
    private analyzeSearchMatches;
    /**
     * Get comprehensive file attachment information
     */
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
            metadata?: any;
        }>;
        attachmentsByType: Array<{
            type: string;
            count: number;
            totalSize: number;
        }>;
    }>;
    /**
     * Analyze note metadata and content patterns
     */
    analyzeNoteMetadata(options?: {
        includeContentAnalysis?: boolean;
        includeLinkAnalysis?: boolean;
        includeStructureAnalysis?: boolean;
    }): Promise<{
        overview: {
            totalNotes: number;
            averageLength: number;
            lengthDistribution: Array<{
                range: string;
                count: number;
            }>;
            creationPatterns: Array<{
                hour: number;
                count: number;
            }>;
            modificationPatterns: Array<{
                hour: number;
                count: number;
            }>;
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
            languagePatterns: Array<{
                language: string;
                count: number;
            }>;
            commonPatterns: Array<{
                pattern: string;
                description: string;
                count: number;
            }>;
        };
        linkAnalysis?: {
            internalLinks: number;
            externalLinks: number;
            brokenLinks: number;
            topDomains: Array<{
                domain: string;
                count: number;
            }>;
            linkTypes: Array<{
                type: string;
                count: number;
            }>;
        };
        structureAnalysis?: {
            titlePatterns: Array<{
                pattern: string;
                count: number;
                examples: string[];
            }>;
            averageWordsPerNote: number;
            averageParagraphsPerNote: number;
            notesWithTodos: number;
            notesWithDates: number;
            notesWithNumbers: number;
        };
    }>;
    /**
     * Get notes with specific metadata characteristics
     */
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
    }): Promise<Array<NoteWithTags & {
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
    }>>;
    /**
     * Extract file metadata from database record
     */
    private extractFileMetadata;
    /**
     * Analyze content patterns in notes
     */
    private analyzeContent;
    /**
     * Analyze links in notes
     */
    private analyzeLinks;
    /**
     * Analyze note structure patterns
     */
    private analyzeStructure;
    /**
     * Extract patterns from note titles
     */
    private extractTitlePatterns;
    /**
     * Create a new note with title, content, and tags
     * Note: Bear automatically extracts the title from the first line of content (markdown header).
     * We don't set ZTITLE directly to avoid inconsistencies between database and Bear's display.
     */
    createNote(options: {
        title: string;
        content?: string;
        tags?: string[];
        isArchived?: boolean;
        isPinned?: boolean;
    }): Promise<{
        noteId: number;
        success: boolean;
        backupPath?: string;
        tagWarnings?: string[];
    }>;
    /**
     * Update an existing note
     * Note: Title changes are handled by updating the content's first line (markdown header).
     * We clear ZTITLE so Bear will re-extract it from the updated content.
     */
    updateNote(noteId: number, options: {
        title?: string;
        content?: string;
        tags?: string[];
        isArchived?: boolean;
        isPinned?: boolean;
        expectedModificationDate?: Date;
    }): Promise<{
        success: boolean;
        backupPath?: string;
        conflictDetected?: boolean;
        tagWarnings?: string[];
    }>;
    /**
     * Duplicate an existing note
     */
    duplicateNote(noteId: number, options?: {
        titleSuffix?: string;
        copyTags?: boolean;
    }): Promise<{
        newNoteId: number;
        success: boolean;
        backupPath?: string;
    }>;
    /**
     * Archive or unarchive a note
     */
    archiveNote(noteId: number, archived: boolean): Promise<{
        success: boolean;
        backupPath?: string;
    }>;
    /**
     * Generate a UUID for new notes (Bear format)
     */
    private generateUUID;
    /**
     * Clear Bear's Core Data cache to force sidebar refresh
     */
    private clearBearCache;
    /**
     * Trigger Bear to reparse a note by simulating a content edit
     * This mimics the manual edit that makes Bear recognize hashtags
     */
    private triggerBearReparse;
    /**
     * Validate and sanitize tag names according to Bear's rules
     * Bear tag rules:
     * - No capital letters (converts to lowercase)
     * - No hyphens (removes them)
     * - No spaces (removes them)
     * - No underscores (removes them)
     * - No commas (removes them)
     * - Forward slashes allowed for nested tags (e.g., project/alpha)
     * - Must not be empty after sanitization
     */
    private validateAndSanitizeTags;
    /**
     * Legacy method kept for backward compatibility
     * @deprecated Use validateAndSanitizeTags instead
     */
    private sanitizeTagName;
    /**
     * Trigger Bear to reparse a note by opening it in edit mode via x-callback-url
     * This uses Bear's API to simulate opening the note for editing, which should trigger parsing
     */
    private triggerBearParseViaAPI;
    /**
     * Trigger Bear parsing using AppleScript to simulate a keystroke
     * This is a more aggressive approach that actually simulates typing in Bear
     */
    private triggerBearParseViaAppleScript;
    /**
     * Comprehensive method to trigger Bear's hashtag parsing using multiple approaches
     * Tries different methods in order of likelihood to succeed
     */
    private triggerBearHashtagParsing;
    /**
     * Public method to trigger hashtag parsing for a specific note
     * Can be called by MCP tools to help users fix sidebar display issues
     * Note: Bear must be running for this to work effectively
     */
    triggerHashtagParsing(noteId?: string, noteTitle?: string): Promise<string>;
    /**
     * Create a note using Bear's x-callback-url API when Bear is running
     * This bypasses database writes and uses Bear's native API instead
     */
    createNoteViaBearAPI(title: string, content: string, tags: string[]): Promise<string>;
    /**
     * Batch trigger hashtag parsing for multiple notes
     * Useful for fixing sidebar display issues for many notes at once
     */
    batchTriggerHashtagParsing(options: {
        tag_filter?: string;
        title_pattern?: string;
        limit?: number;
        created_after?: string;
    }): Promise<string>;
}
//# sourceMappingURL=bear-service.d.ts.map