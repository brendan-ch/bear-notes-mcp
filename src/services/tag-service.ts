import { ITagService, IDatabaseService, SERVICE_TOKENS } from './interfaces/index.js';
import { globalContainer } from './container/service-container.js';
import { TagWithCount, NoteWithTags, BearNote } from '../types/bear.js';
import { CoreDataUtils } from '../utils/database.js';
import { SqlParameters } from '../types/database.js';

/**
 * TagService - Handles all tag management and operations for Bear notes
 *
 * Responsibilities:
 * - Tag retrieval and filtering
 * - Tag validation and sanitization
 * - Bear-specific hashtag parsing
 * - Tag-based note operations
 * - Bear API integration for tag operations
 */
export class TagService implements ITagService {
  private database: IDatabaseService;

  constructor() {
    this.database = globalContainer.resolve<IDatabaseService>(SERVICE_TOKENS.DATABASE_SERVICE);
  }

  /**
   * Get all tags with note counts
   */
  async getTags(): Promise<TagWithCount[]> {
    await this.database.connect(true);

    try {
      const sql = `
        SELECT t.*, COUNT(nt.Z_5NOTES) as noteCount
        FROM ZSFNOTETAG t
        LEFT JOIN Z_5TAGS nt ON t.Z_PK = nt.Z_13TAGS
        LEFT JOIN ZSFNOTE n ON nt.Z_5NOTES = n.Z_PK AND n.ZTRASHED = 0
        GROUP BY t.Z_PK
        ORDER BY noteCount DESC, t.ZTITLE ASC
      `;

      return await this.database.query<TagWithCount>(sql);
    } finally {
      await this.database.disconnect();
    }
  }

  /**
   * Get notes by tag
   */
  async getNotesByTag(tagName: string): Promise<NoteWithTags[]> {
    await this.database.connect(true);

    try {
      const sql = `
        SELECT n.*, GROUP_CONCAT(t2.ZTITLE) as tag_names
        FROM ZSFNOTE n
        JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        LEFT JOIN Z_5TAGS nt2 ON n.Z_PK = nt2.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t2 ON nt2.Z_13TAGS = t2.Z_PK
        WHERE t.ZTITLE = ? AND n.ZTRASHED = 0
        GROUP BY n.Z_PK
        ORDER BY n.ZMODIFICATIONDATE DESC
      `;

      const rows = await this.database.query<BearNote & { tag_names: string }>(sql, [tagName]);

      return rows.map(row => ({
        ...row,
        tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
      }));
    } finally {
      await this.database.disconnect();
    }
  }

  /**
   * Validate and sanitize tags according to Bear's rules
   */
  validateAndSanitizeTags(tags: string[]): {
    sanitized: string[];
    warnings: string[];
  } {
    const sanitized: string[] = [];
    const warnings: string[] = [];

    for (const originalTag of tags) {
      const trimmed = originalTag.trim();

      if (!trimmed) {
        warnings.push(`Empty tag ignored`);
        continue;
      }

      let sanitizedTag = trimmed;
      let hadChanges = false;

      // Convert to lowercase
      if (sanitizedTag !== sanitizedTag.toLowerCase()) {
        sanitizedTag = sanitizedTag.toLowerCase();
        hadChanges = true;
      }

      // Remove hyphens
      if (sanitizedTag.includes('-')) {
        sanitizedTag = sanitizedTag.replace(/-/g, '');
        hadChanges = true;
      }

      // Remove spaces
      if (sanitizedTag.includes(' ')) {
        sanitizedTag = sanitizedTag.replace(/\s+/g, '');
        hadChanges = true;
      }

      // Keep underscores (they are allowed in Bear tags)
      // No processing needed for underscores

      // Remove commas
      if (sanitizedTag.includes(',')) {
        sanitizedTag = sanitizedTag.replace(/,/g, '');
        hadChanges = true;
      }

      // Clean up multiple slashes and remove leading/trailing slashes
      sanitizedTag = sanitizedTag
        .replace(/\/+/g, '/') // Multiple slashes to single
        .replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes

      // Check if tag is still valid after sanitization
      if (!sanitizedTag) {
        warnings.push(`Tag "${originalTag}" became empty after sanitization and was ignored`);
        continue;
      }

      // Add to results
      sanitized.push(sanitizedTag);

      // Add warning if changes were made
      if (hadChanges) {
        warnings.push(`Tag "${originalTag}" was sanitized to "${sanitizedTag}"`);
      }
    }

    return { sanitized, warnings };
  }

  /**
   * Legacy method kept for backward compatibility
   * @deprecated Use validateAndSanitizeTags instead
   */
  sanitizeTagName(tagName: string): string {
    const result = this.validateAndSanitizeTags([tagName]);
    return result.sanitized[0] || '';
  }

  /**
   * Public method to trigger hashtag parsing for a specific note
   * Can be called by MCP tools to help users fix sidebar display issues
   * Note: Bear must be running for this to work effectively
   */
  async triggerHashtagParsing(noteId?: string, noteTitle?: string): Promise<string> {
    if (!noteId && !noteTitle) {
      throw new Error('Either noteId or noteTitle is required');
    }

    // Check if Bear is running
    const isBearRunning = await this.database.isBearRunning();
    if (!isBearRunning) {
      return `Bear is not running. Please start Bear first, then the hashtags will be parsed automatically. Alternatively, restart Bear to trigger parsing for all notes.`;
    }

    try {
      await this.database.connect(true); // Read mode

      // Find the note
      let query: string;
      let params: SqlParameters;

      if (noteId) {
        query =
          'SELECT Z_PK, ZUNIQUEIDENTIFIER, ZTITLE, ZTEXT FROM ZSFNOTE WHERE ZUNIQUEIDENTIFIER = ? AND ZTRASHED = 0';
        params = [noteId];
      } else if (noteTitle) {
        query =
          'SELECT Z_PK, ZUNIQUEIDENTIFIER, ZTITLE, ZTEXT FROM ZSFNOTE WHERE ZTITLE = ? AND ZTRASHED = 0';
        params = [noteTitle];
      } else {
        throw new Error('Either noteId or noteTitle is required');
      }

      const note = await this.database.queryOne<{
        Z_PK: number;
        ZUNIQUEIDENTIFIER: string;
        ZTITLE: string;
        ZTEXT: string;
      }>(query, params);

      if (!note) {
        throw new Error(`Note not found: ${noteId || noteTitle}`);
      }

      // Most effective approach: Use Bear's API to "update" the note with its own content
      // This forces Bear to reparse all hashtags in the content
      await this.triggerBearParseEffectively(note.ZUNIQUEIDENTIFIER, note.ZTEXT, note.ZTITLE);

      return `Hashtag parsing triggered for note: ${noteId || noteTitle}. Bear should update the sidebar within a few seconds.`;
    } catch (error) {
      throw new Error(
        `Failed to trigger hashtag parsing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      await this.database.disconnect();
    }
  }

  /**
   * Batch trigger hashtag parsing for multiple notes
   * Useful for fixing sidebar display issues for many notes at once
   */
  async batchTriggerHashtagParsing(options: {
    tag_filter?: string;
    title_pattern?: string;
    limit?: number;
    created_after?: string;
  }): Promise<string> {
    try {
      await this.database.connect(true); // Read mode

      // Build query to find notes
      let query = 'SELECT Z_PK, ZUNIQUEIDENTIFIER, ZTITLE FROM ZSFNOTE WHERE ZTRASHED = 0';
      const params: SqlParameters = [];

      if (options.title_pattern) {
        query += ' AND ZTITLE LIKE ?';
        params.push(`%${options.title_pattern}%`);
      }

      if (options.created_after) {
        const date = new Date(options.created_after);
        query += ' AND ZCREATIONDATE > ?';
        params.push(CoreDataUtils.fromDate(date));
      }

      query += ' ORDER BY ZMODIFICATIONDATE DESC';

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }

      const notes = await this.database.query<{
        Z_PK: number;
        ZUNIQUEIDENTIFIER: string;
        ZTITLE: string;
      }>(query, params);

      if (notes.length === 0) {
        return 'No notes found matching the criteria';
      }

      // Process each note
      let successCount = 0;
      for (const note of notes) {
        try {
          // Get the full note content for effective parsing trigger
          const fullNote = await this.database.queryOne<{ ZTEXT: string }>(
            `
            SELECT ZTEXT FROM ZSFNOTE WHERE Z_PK = ?
          `,
            [note.Z_PK]
          );

          if (fullNote?.ZTEXT) {
            await this.triggerBearParseEffectively(
              note.ZUNIQUEIDENTIFIER,
              fullNote.ZTEXT,
              note.ZTITLE
            );
            successCount++;
          }

          // Small delay between notes to avoid overwhelming Bear
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch {
          // Silent error handling to avoid JSON-RPC interference
        }
      }

      return `Triggered hashtag parsing for ${successCount}/${notes.length} notes. Check Bear's sidebar in a few seconds.`;
    } catch (error) {
      throw new Error(
        `Failed to batch trigger hashtag parsing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      await this.database.disconnect();
    }
  }

  /**
   * Most effective method to trigger Bear's hashtag parsing
   * Uses Bear's API to update the note with its own content, forcing a reparse
   */
  private async triggerBearParseEffectively(
    noteUUID: string,
    noteContent: string,
    noteTitle?: string
  ): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // CRITICAL FIX: Remove duplicate title headers before triggering reparse
      // This prevents duplicate titles when hashtag parsing updates notes with existing headers
      let processedContent = noteContent;
      if (noteTitle) {
        const titleHeaderPattern = new RegExp(
          `^#\\s+${noteTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+`,
          'i'
        );
        if (titleHeaderPattern.test(processedContent)) {
          processedContent = processedContent.replace(titleHeaderPattern, '');
        }
      }

      // Use Bear's API to replace the note content with itself
      // This forces Bear to reparse all hashtags in the content
      const encodedContent = encodeURIComponent(processedContent);
      const bearURL = `bear://x-callback-url/add-text?id=${noteUUID}&mode=replace&text=${encodedContent}&show_window=no`;

      await execAsync(`open "${bearURL}"`);

      // Wait for Bear to process the update and reparse hashtags
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      throw new Error(
        `Failed to trigger effective Bear parsing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Dispose of the service and clean up resources
   */
  async dispose(): Promise<void> {
    // TagService doesn't hold any persistent resources
    // Database connections are managed by DatabaseService
  }
}
