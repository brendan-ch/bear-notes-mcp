/**
 * Bear MCP Server - Note Service
 * Copyright (c) 2024 Bear MCP Server
 * MIT License - see LICENSE file for details
 */

import { v4 as uuidv4 } from 'uuid';
import { CoreDataUtils } from '../utils/database.js';
import {
  BearNote,
  NoteWithTags,
  NoteSearchOptions,
  BearDatabaseError,
  BearSafetyError,
} from '../types/bear.js';
import { INoteService, IDatabaseService, SERVICE_TOKENS } from './interfaces/index.js';
import { globalContainer } from './container/service-container.js';
import { SqlParameters } from '../types/database.js';

/**
 * Service for managing Bear notes
 * Handles note CRUD operations and basic note queries
 */
export class NoteService implements INoteService {
  private databaseService: IDatabaseService;

  constructor() {
    this.databaseService = globalContainer.resolve<IDatabaseService>(SERVICE_TOKENS.DATABASE_SERVICE);
  }

  /**
   * Get all notes with optional filtering
   */
  async getNotes(options: NoteSearchOptions = {}): Promise<NoteWithTags[]> {
    await this.databaseService.connect(true);

    try {
      let sql = `
        SELECT n.*, GROUP_CONCAT(t.ZTITLE) as tag_names
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE 1=1
      `;

      const params: SqlParameters = [];

      // Apply filters
      if (!options.includeTrashed) {
        sql += ' AND n.ZTRASHED = 0';
      }

      if (!options.includeArchived) {
        sql += ' AND n.ZARCHIVED = 0';
      }

      if (options.query) {
        sql += ' AND (n.ZTITLE LIKE ? OR n.ZTEXT LIKE ?)';
        const searchTerm = `%${options.query}%`;
        params.push(searchTerm, searchTerm);
      }

      if (options.dateFrom) {
        sql += ' AND n.ZCREATIONDATE >= ?';
        params.push(CoreDataUtils.fromDate(options.dateFrom));
      }

      if (options.dateTo) {
        sql += ' AND n.ZCREATIONDATE <= ?';
        params.push(CoreDataUtils.fromDate(options.dateTo));
      }

      sql += ' GROUP BY n.Z_PK ORDER BY n.ZMODIFICATIONDATE DESC';

      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);

        if (options.offset) {
          sql += ' OFFSET ?';
          params.push(options.offset);
        }
      }

      const rows = await this.databaseService.query<BearNote & { tag_names: string }>(sql, params);

      return rows.map(row => ({
        ...row,
        tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
      }));
    } finally {
      await this.databaseService.disconnect();
    }
  }

  /**
   * Get a single note by ID
   */
  async getNoteById(id: number): Promise<NoteWithTags | null> {
    await this.databaseService.connect(true);

    try {
      const sql = `
        SELECT n.*, GROUP_CONCAT(t.ZTITLE) as tag_names
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE n.Z_PK = ?
        GROUP BY n.Z_PK
      `;

      const row = await this.databaseService.queryOne<BearNote & { tag_names: string }>(sql, [id]);

      if (!row) {
        return null;
      }

      return {
        ...row,
        tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
      };
    } finally {
      await this.databaseService.disconnect();
    }
  }

  /**
   * Get a single note by title
   */
  async getNoteByTitle(title: string): Promise<NoteWithTags | null> {
    await this.databaseService.connect(true);

    try {
      const sql = `
        SELECT n.*, GROUP_CONCAT(t.ZTITLE) as tag_names
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE n.ZTITLE = ? AND n.ZTRASHED = 0
        GROUP BY n.Z_PK
        LIMIT 1
      `;

      const row = await this.databaseService.queryOne<BearNote & { tag_names: string }>(sql, [title]);

      if (!row) {
        return null;
      }

      return {
        ...row,
        tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
      };
    } finally {
      await this.databaseService.disconnect();
    }
  }

  /**
   * Get recent notes
   */
  async getRecentNotes(limit: number = 10): Promise<NoteWithTags[]> {
    return this.getNotes({ limit, includeTrashed: false, includeArchived: false });
  }

  /**
   * Get note counts by status
   */
  async getNoteCountsByStatus(): Promise<{
    total: number;
    active: number;
    trashed: number;
    archived: number;
    encrypted: number;
  }> {
    await this.databaseService.connect(true);

    try {
      const [totalNotes, activeNotes, trashedNotes, archivedNotes, encryptedNotes] = await Promise.all([
        this.databaseService.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM ZSFNOTE'),
        this.databaseService.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM ZSFNOTE WHERE ZTRASHED = 0'
        ),
        this.databaseService.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM ZSFNOTE WHERE ZTRASHED = 1'
        ),
        this.databaseService.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM ZSFNOTE WHERE ZARCHIVED = 1'
        ),
        this.databaseService.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM ZSFNOTE WHERE ZENCRYPTED = 1'
        ),
      ]);

      return {
        total: totalNotes?.count || 0,
        active: activeNotes?.count || 0,
        trashed: trashedNotes?.count || 0,
        archived: archivedNotes?.count || 0,
        encrypted: encryptedNotes?.count || 0,
      };
    } finally {
      await this.databaseService.disconnect();
    }
  }

  /**
   * Create a new note
   */
  async createNote(options: {
    title: string;
    content?: string;
    tags?: string[];
    isArchived?: boolean;
    isPinned?: boolean;
  }): Promise<{ noteId: string; success: boolean; tagWarnings?: string[] }> {
    if (!options.title?.trim()) {
      throw new BearSafetyError('Note title is required and cannot be empty');
    }

    const noteUUID = this.generateUUID();
    const content = options.content || '';
    const now = CoreDataUtils.now();

    // Validate and sanitize tags
    let tagWarnings: string[] = [];
    if (options.tags && options.tags.length > 0) {
      const tagValidation = this.validateAndSanitizeTags(options.tags);
      options.tags = tagValidation.sanitized;
      tagWarnings = tagValidation.warnings;
    }

    await this.databaseService.connect(false);

    try {
      // Insert the note
      const insertNoteSql = `
        INSERT INTO ZSFNOTE (
          ZUNIQUEIDENTIFIER, ZTITLE, ZTEXT, ZCREATIONDATE, ZMODIFICATIONDATE,
          ZTRASHED, ZARCHIVED, ZPINNED, ZENCRYPTED, ZORDER, ZTRASHEDDATE, ZARCHIVEDDATE
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?)
      `;

      const noteParams = [
        noteUUID,
        options.title,
        content,
        now,
        now,
        0, // ZTRASHED
        options.isArchived ? 1 : 0, // ZARCHIVED
        options.isPinned ? 1 : 0, // ZPINNED
        options.isArchived ? now : null, // ZARCHIVEDDATE
      ];

      await this.databaseService.query(insertNoteSql, noteParams);

      // Get the inserted note ID
      const noteRow = await this.databaseService.queryOne<{ Z_PK: number }>(
        'SELECT Z_PK FROM ZSFNOTE WHERE ZUNIQUEIDENTIFIER = ?',
        [noteUUID]
      );

      if (!noteRow) {
        throw new BearDatabaseError('Failed to retrieve created note');
      }

      // Handle tags if provided
      if (options.tags && options.tags.length > 0) {
        await this.createNoteTags(noteRow.Z_PK, options.tags);
      }

      return {
        noteId: noteUUID,
        success: true,
        tagWarnings: tagWarnings.length > 0 ? tagWarnings : undefined,
      };
    } catch (error) {
      throw new BearDatabaseError(`Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await this.databaseService.disconnect();
    }
  }

  /**
   * Update an existing note
   */
  async updateNote(
    noteId: number,
    options: {
      title?: string;
      content?: string;
      tags?: string[];
      isArchived?: boolean;
      isPinned?: boolean;
      expectedModificationDate?: Date;
    }
  ): Promise<{ success: boolean; conflictDetected?: boolean; tagWarnings?: string[] }> {
    await this.databaseService.connect(false);

    try {
      // First, get the current note to check for conflicts
      const currentNote = await this.databaseService.queryOne<BearNote>(
        'SELECT * FROM ZSFNOTE WHERE Z_PK = ?',
        [noteId]
      );

      if (!currentNote) {
        throw new BearDatabaseError(`Note with ID ${noteId} not found`);
      }

      // Check for modification conflicts if expected date is provided
      if (options.expectedModificationDate) {
        const currentModDate = CoreDataUtils.toDate(currentNote.ZMODIFICATIONDATE);
        if (currentModDate.getTime() !== options.expectedModificationDate.getTime()) {
          return { success: false, conflictDetected: true };
        }
      }

      const now = CoreDataUtils.now();
      const updateFields: string[] = [];
      const updateParams: SqlParameters = [];

      // Build dynamic update query
      if (options.title !== undefined) {
        updateFields.push('ZTITLE = ?');
        updateParams.push(options.title);
      }

      if (options.content !== undefined) {
        updateFields.push('ZTEXT = ?');
        updateParams.push(options.content);
      }

      if (options.isArchived !== undefined) {
        updateFields.push('ZARCHIVED = ?', 'ZARCHIVEDDATE = ?');
        updateParams.push(
          options.isArchived ? 1 : 0,
          options.isArchived ? now : null
        );
      }

      if (options.isPinned !== undefined) {
        updateFields.push('ZPINNED = ?');
        updateParams.push(options.isPinned ? 1 : 0);
      }

      // Always update modification date
      updateFields.push('ZMODIFICATIONDATE = ?');
      updateParams.push(now);

      // Add WHERE clause parameter
      updateParams.push(noteId);

      // Execute update if there are fields to update
      if (updateFields.length > 1) { // > 1 because we always have ZMODIFICATIONDATE
        const updateSql = `UPDATE ZSFNOTE SET ${updateFields.join(', ')} WHERE Z_PK = ?`;
        await this.databaseService.query(updateSql, updateParams);
      }

      // Handle tag updates
      let tagWarnings: string[] = [];
      if (options.tags !== undefined) {
        const tagValidation = this.validateAndSanitizeTags(options.tags);
        tagWarnings = tagValidation.warnings;

        // Remove existing tags
        await this.databaseService.query('DELETE FROM Z_5TAGS WHERE Z_5NOTES = ?', [noteId]);

        // Add new tags
        if (tagValidation.sanitized.length > 0) {
          await this.createNoteTags(noteId, tagValidation.sanitized);
        }
      }

      return {
        success: true,
        tagWarnings: tagWarnings.length > 0 ? tagWarnings : undefined,
      };
    } catch (error) {
      throw new BearDatabaseError(`Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await this.databaseService.disconnect();
    }
  }

  /**
   * Duplicate an existing note
   */
  async duplicateNote(
    noteId: number,
    options: {
      titleSuffix?: string;
      copyTags?: boolean;
    } = {}
  ): Promise<{ newNoteId: string; success: boolean }> {
    await this.databaseService.connect(false);

    try {
      // Get the original note
      const originalNote = await this.databaseService.queryOne<BearNote>(
        'SELECT * FROM ZSFNOTE WHERE Z_PK = ?',
        [noteId]
      );

      if (!originalNote) {
        throw new BearDatabaseError(`Note with ID ${noteId} not found`);
      }

      // Get original note tags if copying tags
      let originalTags: string[] = [];
      if (options.copyTags) {
        const tagRows = await this.databaseService.query<{ ZTITLE: string }>(
          `SELECT t.ZTITLE 
           FROM ZSFNOTETAG t
           JOIN Z_5TAGS nt ON t.Z_PK = nt.Z_13TAGS
           WHERE nt.Z_5NOTES = ?`,
          [noteId]
        );
        originalTags = tagRows.map(row => row.ZTITLE);
      }

      // Create the duplicate
      const suffix = options.titleSuffix || ' Copy';
      const duplicateTitle = originalNote.ZTITLE ? `${originalNote.ZTITLE}${suffix}` : `Untitled${suffix}`;

      const result = await this.createNote({
        title: duplicateTitle,
        content: originalNote.ZTEXT || undefined,
        tags: originalTags.length > 0 ? originalTags : undefined,
        isArchived: originalNote.ZARCHIVED === 1,
        isPinned: originalNote.ZPINNED === 1,
      });

      return {
        newNoteId: result.noteId,
        success: result.success,
      };
    } catch (error) {
      throw new BearDatabaseError(`Failed to duplicate note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await this.databaseService.disconnect();
    }
  }

  /**
   * Archive or unarchive a note
   */
  async archiveNote(noteId: number, archived: boolean): Promise<{ success: boolean }> {
    await this.databaseService.connect(false);

    try {
      const now = CoreDataUtils.now();
      const sql = `
        UPDATE ZSFNOTE 
        SET ZARCHIVED = ?, ZARCHIVEDDATE = ?, ZMODIFICATIONDATE = ?
        WHERE Z_PK = ?
      `;

      await this.databaseService.query(sql, [
        archived ? 1 : 0,
        archived ? now : null,
        now,
        noteId,
      ]);

      return { success: true };
    } catch (error) {
      throw new BearDatabaseError(`Failed to ${archived ? 'archive' : 'unarchive'} note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await this.databaseService.disconnect();
    }
  }

  /**
   * Private helper methods
   */
  private generateUUID(): string {
    return uuidv4().toUpperCase();
  }

  private validateAndSanitizeTags(tags: string[]): {
    sanitized: string[];
    warnings: string[];
  } {
    const sanitized: string[] = [];
    const warnings: string[] = [];
    const seen = new Set<string>();

    for (const tag of tags) {
      if (!tag || typeof tag !== 'string') {
        warnings.push(`Invalid tag: ${tag}`);
        continue;
      }

      const sanitizedTag = this.sanitizeTagName(tag.trim());
      
      if (!sanitizedTag) {
        warnings.push(`Tag "${tag}" resulted in empty string after sanitization`);
        continue;
      }

      if (sanitizedTag.length > 100) {
        warnings.push(`Tag "${tag}" is too long (max 100 characters)`);
        continue;
      }

      if (seen.has(sanitizedTag.toLowerCase())) {
        warnings.push(`Duplicate tag: ${sanitizedTag}`);
        continue;
      }

      seen.add(sanitizedTag.toLowerCase());
      sanitized.push(sanitizedTag);
    }

    return { sanitized, warnings };
  }

  private sanitizeTagName(tagName: string): string {
    return tagName.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
  }

  private async createNoteTags(noteId: number, tags: string[]): Promise<void> {
    for (const tagName of tags) {
      // Find or create tag
      let tag = await this.databaseService.queryOne<{ Z_PK: number }>(
        'SELECT Z_PK FROM ZSFNOTETAG WHERE ZTITLE = ?',
        [tagName]
      );

      if (!tag) {
        // Create new tag
        const now = CoreDataUtils.now();
        await this.databaseService.query(
          `INSERT INTO ZSFNOTETAG (ZTITLE, ZCREATIONDATE, ZMODIFICATIONDATE, ZPARENT, ZORDER)
           VALUES (?, ?, ?, NULL, NULL)`,
          [tagName, now, now]
        );

        tag = await this.databaseService.queryOne<{ Z_PK: number }>(
          'SELECT Z_PK FROM ZSFNOTETAG WHERE ZTITLE = ?',
          [tagName]
        );
      }

      if (tag) {
        // Create note-tag relationship
        await this.databaseService.query(
          'INSERT OR IGNORE INTO Z_5TAGS (Z_5NOTES, Z_13TAGS) VALUES (?, ?)',
          [noteId, tag.Z_PK]
        );
      }
    }
  }
} 