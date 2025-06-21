import { BearDatabase, CoreDataUtils } from '../utils/database.js';
import { v4 as uuidv4 } from 'uuid';
/**
 * Service layer for Bear database operations
 * Provides high-level methods for interacting with Bear's data
 */
export class BearService {
    database;
    constructor(dbPath) {
        this.database = new BearDatabase(dbPath);
    }
    /**
     * Get comprehensive database statistics
     */
    async getDatabaseStats() {
        await this.database.connect(true); // Read-only connection
        try {
            const [totalNotes, activeNotes, trashedNotes, archivedNotes, encryptedNotes, totalTags, totalAttachments] = await Promise.all([
                this.database.queryOne('SELECT COUNT(*) as count FROM ZSFNOTE'),
                this.database.queryOne('SELECT COUNT(*) as count FROM ZSFNOTE WHERE ZTRASHED = 0'),
                this.database.queryOne('SELECT COUNT(*) as count FROM ZSFNOTE WHERE ZTRASHED = 1'),
                this.database.queryOne('SELECT COUNT(*) as count FROM ZSFNOTE WHERE ZARCHIVED = 1'),
                this.database.queryOne('SELECT COUNT(*) as count FROM ZSFNOTE WHERE ZENCRYPTED = 1'),
                this.database.queryOne('SELECT COUNT(*) as count FROM ZSFNOTETAG'),
                this.database.queryOne('SELECT COUNT(*) as count FROM ZSFNOTEFILE')
            ]);
            // Get database file size and last modified date
            const fs = await import('fs/promises');
            const stats = await fs.stat(this.database['dbPath']);
            return {
                totalNotes: totalNotes?.count || 0,
                activeNotes: activeNotes?.count || 0,
                trashedNotes: trashedNotes?.count || 0,
                archivedNotes: archivedNotes?.count || 0,
                encryptedNotes: encryptedNotes?.count || 0,
                totalTags: totalTags?.count || 0,
                totalAttachments: totalAttachments?.count || 0,
                databaseSize: stats.size,
                lastModified: stats.mtime
            };
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Get all notes with optional filtering
     */
    async getNotes(options = {}) {
        await this.database.connect(true);
        try {
            let sql = `
        SELECT n.*, GROUP_CONCAT(t.ZTITLE) as tag_names
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE 1=1
      `;
            const params = [];
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
            const rows = await this.database.query(sql, params);
            return rows.map(row => ({
                ...row,
                tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : []
            }));
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Get a single note by ID
     */
    async getNoteById(id) {
        await this.database.connect(true);
        try {
            const sql = `
        SELECT n.*, GROUP_CONCAT(t.ZTITLE) as tag_names
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE n.Z_PK = ?
        GROUP BY n.Z_PK
      `;
            const row = await this.database.queryOne(sql, [id]);
            if (!row) {
                return null;
            }
            return {
                ...row,
                tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : []
            };
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Get a single note by title
     */
    async getNoteByTitle(title) {
        await this.database.connect(true);
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
            const row = await this.database.queryOne(sql, [title]);
            if (!row) {
                return null;
            }
            return {
                ...row,
                tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : []
            };
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Search notes by content and title
     */
    async searchNotes(query, options = {}) {
        return this.getNotes({ ...options, query });
    }
    /**
     * Get all tags with usage counts
     */
    async getTags() {
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
            return await this.database.query(sql);
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Get notes by tag
     */
    async getNotesByTag(tagName) {
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
            const rows = await this.database.query(sql, [tagName]);
            return rows.map(row => ({
                ...row,
                tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : []
            }));
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Check if Bear app is currently running
     */
    async isBearRunning() {
        return this.database.isBearRunning();
    }
    /**
     * Verify database access
     */
    async verifyDatabaseAccess() {
        await this.database.verifyDatabaseAccess();
    }
    /**
     * Create a database backup
     */
    async createBackup() {
        return this.database.createBackup();
    }
    /**
     * Get database schema information
     */
    async getSchema() {
        await this.database.connect(true);
        try {
            return this.database.getSchema();
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Check database integrity
     */
    async checkIntegrity() {
        await this.database.connect(true);
        try {
            return this.database.checkIntegrity();
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Get recent notes (last 10 by default)
     */
    async getRecentNotes(limit = 10) {
        return this.getNotes({ limit, includeArchived: false, includeTrashed: false });
    }
    /**
     * Get note count by status
     */
    async getNoteCountsByStatus() {
        const stats = await this.getDatabaseStats();
        return {
            total: stats.totalNotes,
            active: stats.activeNotes,
            trashed: stats.trashedNotes,
            archived: stats.archivedNotes,
            encrypted: stats.encryptedNotes
        };
    }
    /**
     * Get notes with advanced filtering options
     */
    async getNotesAdvanced(options = {}) {
        await this.database.connect(true);
        try {
            let sql = `
        SELECT n.*, GROUP_CONCAT(DISTINCT t.ZTITLE) as tag_names,
               LENGTH(n.ZTEXT) as content_length,
               CASE 
                 WHEN n.ZENCRYPTED = 1 THEN '[ENCRYPTED]'
                 ELSE SUBSTR(n.ZTEXT, 1, 200)
               END as preview
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE 1=1
      `;
            const params = [];
            // Basic filters
            if (!options.includeTrashed) {
                sql += ' AND n.ZTRASHED = 0';
            }
            if (!options.includeArchived) {
                sql += ' AND n.ZARCHIVED = 0';
            }
            if (!options.includeEncrypted) {
                sql += ' AND n.ZENCRYPTED = 0';
            }
            // Text search
            if (options.query) {
                sql += ' AND (n.ZTITLE LIKE ? OR n.ZTEXT LIKE ?)';
                const searchTerm = `%${options.query}%`;
                params.push(searchTerm, searchTerm);
            }
            // Date filters
            if (options.dateFrom) {
                sql += ' AND n.ZCREATIONDATE >= ?';
                params.push(CoreDataUtils.fromDate(options.dateFrom));
            }
            if (options.dateTo) {
                sql += ' AND n.ZCREATIONDATE <= ?';
                params.push(CoreDataUtils.fromDate(options.dateTo));
            }
            if (options.modifiedAfter) {
                sql += ' AND n.ZMODIFICATIONDATE >= ?';
                params.push(CoreDataUtils.fromDate(options.modifiedAfter));
            }
            if (options.modifiedBefore) {
                sql += ' AND n.ZMODIFICATIONDATE <= ?';
                params.push(CoreDataUtils.fromDate(options.modifiedBefore));
            }
            sql += ' GROUP BY n.Z_PK';
            // Tag filters (applied after grouping)
            if (options.tags && options.tags.length > 0) {
                const tagConditions = options.tags.map(() => 'tag_names LIKE ?').join(' AND ');
                sql += ` HAVING ${tagConditions}`;
                options.tags.forEach(tag => params.push(`%${tag}%`));
            }
            if (options.excludeTags && options.excludeTags.length > 0) {
                const excludeConditions = options.excludeTags.map(() => 'tag_names NOT LIKE ? OR tag_names IS NULL').join(' AND ');
                sql += options.tags ? ` AND (${excludeConditions})` : ` HAVING (${excludeConditions})`;
                options.excludeTags.forEach(tag => params.push(`%${tag}%`));
            }
            // Sorting
            const sortBy = options.sortBy || 'modified';
            const sortOrder = options.sortOrder || 'desc';
            switch (sortBy) {
                case 'created':
                    sql += ` ORDER BY n.ZCREATIONDATE ${sortOrder.toUpperCase()}`;
                    break;
                case 'modified':
                    sql += ` ORDER BY n.ZMODIFICATIONDATE ${sortOrder.toUpperCase()}`;
                    break;
                case 'title':
                    sql += ` ORDER BY n.ZTITLE ${sortOrder.toUpperCase()}`;
                    break;
                case 'size':
                    sql += ` ORDER BY LENGTH(n.ZTEXT) ${sortOrder.toUpperCase()}`;
                    break;
                default:
                    sql += ` ORDER BY n.ZMODIFICATIONDATE DESC`;
            }
            // Pagination
            if (options.limit) {
                sql += ' LIMIT ?';
                params.push(options.limit);
                if (options.offset) {
                    sql += ' OFFSET ?';
                    params.push(options.offset);
                }
            }
            const rows = await this.database.query(sql, params);
            return rows.map(row => ({
                ...row,
                tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
                contentLength: row.content_length,
                preview: row.preview
            }));
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Get notes by multiple criteria with AND/OR logic
     */
    async getNotesWithCriteria(criteria) {
        await this.database.connect(true);
        try {
            let sql = `
        SELECT n.*, GROUP_CONCAT(DISTINCT t.ZTITLE) as tag_names,
               LENGTH(n.ZTEXT) as content_length
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE 1=1
      `;
            const params = [];
            // Title search (OR logic for multiple terms)
            if (criteria.titleContains && criteria.titleContains.length > 0) {
                const titleConditions = criteria.titleContains.map(() => 'n.ZTITLE LIKE ?').join(' OR ');
                sql += ` AND (${titleConditions})`;
                criteria.titleContains.forEach(term => params.push(`%${term}%`));
            }
            // Content search (OR logic for multiple terms)
            if (criteria.contentContains && criteria.contentContains.length > 0) {
                const contentConditions = criteria.contentContains.map(() => 'n.ZTEXT LIKE ?').join(' OR ');
                sql += ` AND (${contentConditions})`;
                criteria.contentContains.forEach(term => params.push(`%${term}%`));
            }
            // Date filters
            if (criteria.createdAfter) {
                sql += ' AND n.ZCREATIONDATE >= ?';
                params.push(CoreDataUtils.fromDate(criteria.createdAfter));
            }
            if (criteria.createdBefore) {
                sql += ' AND n.ZCREATIONDATE <= ?';
                params.push(CoreDataUtils.fromDate(criteria.createdBefore));
            }
            if (criteria.modifiedAfter) {
                sql += ' AND n.ZMODIFICATIONDATE >= ?';
                params.push(CoreDataUtils.fromDate(criteria.modifiedAfter));
            }
            if (criteria.modifiedBefore) {
                sql += ' AND n.ZMODIFICATIONDATE <= ?';
                params.push(CoreDataUtils.fromDate(criteria.modifiedBefore));
            }
            // Content length filters
            if (criteria.minLength) {
                sql += ' AND LENGTH(n.ZTEXT) >= ?';
                params.push(criteria.minLength);
            }
            if (criteria.maxLength) {
                sql += ' AND LENGTH(n.ZTEXT) <= ?';
                params.push(criteria.maxLength);
            }
            // Boolean filters
            if (criteria.isPinned !== undefined) {
                sql += ' AND n.ZPINNED = ?';
                params.push(criteria.isPinned ? 1 : 0);
            }
            if (criteria.isArchived !== undefined) {
                sql += ' AND n.ZARCHIVED = ?';
                params.push(criteria.isArchived ? 1 : 0);
            }
            if (criteria.isTrashed !== undefined) {
                sql += ' AND n.ZTRASHED = ?';
                params.push(criteria.isTrashed ? 1 : 0);
            }
            if (criteria.isEncrypted !== undefined) {
                sql += ' AND n.ZENCRYPTED = ?';
                params.push(criteria.isEncrypted ? 1 : 0);
            }
            sql += ' GROUP BY n.Z_PK';
            // Tag filters (applied after grouping)
            if (criteria.hasAllTags && criteria.hasAllTags.length > 0) {
                const allTagConditions = criteria.hasAllTags.map(() => 'tag_names LIKE ?').join(' AND ');
                sql += ` HAVING ${allTagConditions}`;
                criteria.hasAllTags.forEach(tag => params.push(`%${tag}%`));
            }
            if (criteria.hasAnyTags && criteria.hasAnyTags.length > 0) {
                const anyTagConditions = criteria.hasAnyTags.map(() => 'tag_names LIKE ?').join(' OR ');
                const havingClause = criteria.hasAllTags ? ` AND (${anyTagConditions})` : ` HAVING (${anyTagConditions})`;
                sql += havingClause;
                criteria.hasAnyTags.forEach(tag => params.push(`%${tag}%`));
            }
            sql += ' ORDER BY n.ZMODIFICATIONDATE DESC';
            const rows = await this.database.query(sql, params);
            return rows.map(row => ({
                ...row,
                tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
                contentLength: row.content_length
            }));
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Get note statistics and analytics
     */
    async getNoteAnalytics() {
        await this.database.connect(true);
        try {
            const [totalStats, longestNote, shortestNote, mostRecentNote, oldestNote, contentStats] = await Promise.all([
                this.database.queryOne(`
          SELECT COUNT(*) as count, AVG(LENGTH(ZTEXT)) as avgLength
          FROM ZSFNOTE 
          WHERE ZTRASHED = 0
        `),
                this.database.queryOne(`
          SELECT ZTITLE, LENGTH(ZTEXT) as length
          FROM ZSFNOTE 
          WHERE ZTRASHED = 0 AND ZTEXT IS NOT NULL
          ORDER BY LENGTH(ZTEXT) DESC 
          LIMIT 1
        `),
                this.database.queryOne(`
          SELECT ZTITLE, LENGTH(ZTEXT) as length
          FROM ZSFNOTE 
          WHERE ZTRASHED = 0 AND ZTEXT IS NOT NULL
          ORDER BY LENGTH(ZTEXT) ASC 
          LIMIT 1
        `),
                this.database.queryOne(`
          SELECT ZTITLE, ZMODIFICATIONDATE
          FROM ZSFNOTE 
          WHERE ZTRASHED = 0
          ORDER BY ZMODIFICATIONDATE DESC 
          LIMIT 1
        `),
                this.database.queryOne(`
          SELECT ZTITLE, ZCREATIONDATE
          FROM ZSFNOTE 
          WHERE ZTRASHED = 0
          ORDER BY ZCREATIONDATE ASC 
          LIMIT 1
        `),
                this.database.queryOne(`
          SELECT 
            SUM(ZHASIMAGES) as hasImages,
            SUM(ZHASFILES) as hasFiles,
            SUM(ZHASSOURCECODE) as hasSourceCode,
            SUM(ZTODOCOMPLETED + ZTODOINCOMPLETED) as todos
          FROM ZSFNOTE 
          WHERE ZTRASHED = 0
        `)
            ]);
            // Get monthly note creation stats
            const monthlyStats = await this.database.query(`
        SELECT 
          strftime('%Y-%m', datetime(ZCREATIONDATE + 978307200, 'unixepoch')) as month,
          COUNT(*) as count
        FROM ZSFNOTE 
        WHERE ZTRASHED = 0
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `);
            // Get top tags
            const topTags = await this.database.query(`
        SELECT t.ZTITLE, COUNT(nt.Z_5NOTES) as count
        FROM ZSFNOTETAG t
        JOIN Z_5TAGS nt ON t.Z_PK = nt.Z_13TAGS
        JOIN ZSFNOTE n ON nt.Z_5NOTES = n.Z_PK AND n.ZTRASHED = 0
        GROUP BY t.Z_PK, t.ZTITLE
        ORDER BY count DESC
        LIMIT 10
      `);
            return {
                totalNotes: totalStats?.count || 0,
                averageLength: Math.round(totalStats?.avgLength || 0),
                longestNote: {
                    title: longestNote?.ZTITLE || '',
                    length: longestNote?.length || 0
                },
                shortestNote: {
                    title: shortestNote?.ZTITLE || '',
                    length: shortestNote?.length || 0
                },
                mostRecentNote: {
                    title: mostRecentNote?.ZTITLE || '',
                    date: mostRecentNote ? CoreDataUtils.toDate(mostRecentNote.ZMODIFICATIONDATE) : new Date()
                },
                oldestNote: {
                    title: oldestNote?.ZTITLE || '',
                    date: oldestNote ? CoreDataUtils.toDate(oldestNote.ZCREATIONDATE) : new Date()
                },
                notesPerMonth: monthlyStats.map(stat => ({
                    month: stat.month,
                    count: stat.count
                })),
                topTags: topTags.map(tag => ({
                    tag: tag.ZTITLE,
                    count: tag.count
                })),
                contentStats: {
                    hasImages: contentStats?.hasImages || 0,
                    hasFiles: contentStats?.hasFiles || 0,
                    hasSourceCode: contentStats?.hasSourceCode || 0,
                    hasTodos: contentStats?.todos || 0
                }
            };
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Find related notes based on content similarity and shared tags
     */
    async getRelatedNotes(noteId, limit = 5) {
        await this.database.connect(true);
        try {
            // Get the source note's tags and content keywords
            const sourceNote = await this.getNoteById(noteId);
            if (!sourceNote) {
                return { byTags: [], byContent: [] };
            }
            // Find notes with shared tags
            const relatedByTags = sourceNote.tags.length > 0 ? await this.database.query(`
        SELECT n.*, GROUP_CONCAT(DISTINCT t.ZTITLE) as tag_names,
               COUNT(DISTINCT CASE WHEN t.ZTITLE IN (${sourceNote.tags.map(() => '?').join(',')}) THEN t.ZTITLE END) as shared_tags
        FROM ZSFNOTE n
        JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE n.Z_PK != ? AND n.ZTRASHED = 0
        GROUP BY n.Z_PK
        HAVING shared_tags > 0
        ORDER BY shared_tags DESC, n.ZMODIFICATIONDATE DESC
        LIMIT ?
      `, [...sourceNote.tags, noteId, limit]) : [];
            // Find notes with similar content (basic keyword matching)
            const contentKeywords = this.extractKeywords(sourceNote.ZTEXT || '');
            const relatedByContent = contentKeywords.length > 0 ? await this.database.query(`
        SELECT n.*, GROUP_CONCAT(DISTINCT t.ZTITLE) as tag_names
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE n.Z_PK != ? AND n.ZTRASHED = 0
          AND (${contentKeywords.map(() => 'n.ZTEXT LIKE ?').join(' OR ')})
        GROUP BY n.Z_PK
        ORDER BY n.ZMODIFICATIONDATE DESC
        LIMIT ?
      `, [noteId, ...contentKeywords.map(kw => `%${kw}%`), limit]) : [];
            return {
                byTags: relatedByTags.map(row => ({
                    ...row,
                    tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : []
                })),
                byContent: relatedByContent.map(row => ({
                    ...row,
                    tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : []
                }))
            };
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Extract keywords from text for content similarity matching
     */
    extractKeywords(text) {
        if (!text)
            return [];
        // Simple keyword extraction - remove common words and get significant terms
        const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those']);
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.has(word))
            .slice(0, 10); // Top 10 keywords
    }
    /**
     * Advanced full-text search with ranking and relevance scoring
     */
    async searchNotesFullText(query, options = {}) {
        await this.database.connect(true);
        try {
            const searchTerms = this.extractSearchTerms(query, options.fuzzyMatch);
            const searchFields = options.searchFields || ['both'];
            let sql = `
        SELECT n.*, GROUP_CONCAT(DISTINCT t.ZTITLE) as tag_names,
               LENGTH(n.ZTEXT) as content_length
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE 1=1
      `;
            const params = [];
            // Basic filters
            if (!options.includeTrashed) {
                sql += ' AND n.ZTRASHED = 0';
            }
            if (!options.includeArchived) {
                sql += ' AND n.ZARCHIVED = 0';
            }
            // Build search conditions
            const searchConditions = [];
            if (searchFields.includes('title') || searchFields.includes('both')) {
                const titleConditions = searchTerms.map(() => options.caseSensitive ? 'n.ZTITLE LIKE ?' : 'LOWER(n.ZTITLE) LIKE LOWER(?)');
                if (titleConditions.length > 0) {
                    searchConditions.push(`(${titleConditions.join(' OR ')})`);
                    searchTerms.forEach(term => params.push(`%${term}%`));
                }
            }
            if (searchFields.includes('content') || searchFields.includes('both')) {
                const contentConditions = searchTerms.map(() => options.caseSensitive ? 'n.ZTEXT LIKE ?' : 'LOWER(n.ZTEXT) LIKE LOWER(?)');
                if (contentConditions.length > 0) {
                    searchConditions.push(`(${contentConditions.join(' OR ')})`);
                    searchTerms.forEach(term => params.push(`%${term}%`));
                }
            }
            if (searchConditions.length > 0) {
                sql += ` AND (${searchConditions.join(' OR ')})`;
            }
            // Tag filters
            if (options.tags && options.tags.length > 0) {
                sql += ' GROUP BY n.Z_PK HAVING ';
                const tagConditions = options.tags.map(() => 'tag_names LIKE ?').join(' AND ');
                sql += tagConditions;
                options.tags.forEach(tag => params.push(`%${tag}%`));
            }
            else {
                sql += ' GROUP BY n.Z_PK';
            }
            // Date filters
            if (options.dateFrom) {
                sql += ' AND n.ZCREATIONDATE >= ?';
                params.push(CoreDataUtils.fromDate(options.dateFrom));
            }
            if (options.dateTo) {
                sql += ' AND n.ZCREATIONDATE <= ?';
                params.push(CoreDataUtils.fromDate(options.dateTo));
            }
            sql += ' ORDER BY n.ZMODIFICATIONDATE DESC';
            if (options.limit) {
                sql += ' LIMIT ?';
                params.push(options.limit);
            }
            const rows = await this.database.query(sql, params);
            // Calculate relevance scores and extract snippets
            return rows.map(row => {
                const note = {
                    ...row,
                    tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
                    contentLength: row.content_length
                };
                const analysis = this.analyzeSearchMatches(note, searchTerms, options);
                return {
                    ...note,
                    relevanceScore: analysis.relevanceScore,
                    matchedTerms: analysis.matchedTerms,
                    snippets: options.includeSnippets ? analysis.snippets : [],
                    titleMatches: analysis.titleMatches,
                    contentMatches: analysis.contentMatches
                };
            }).sort((a, b) => b.relevanceScore - a.relevanceScore);
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Search with auto-complete suggestions
     */
    async getSearchSuggestions(partialQuery, limit = 10) {
        await this.database.connect(true);
        try {
            const [termSuggestions, titleSuggestions, tagSuggestions] = await Promise.all([
                // Extract common words from content that start with the partial query
                this.database.query(`
          WITH RECURSIVE split(word, str) AS (
            SELECT '', LOWER(ZTEXT) || ' ' FROM ZSFNOTE WHERE ZTRASHED = 0 AND ZTEXT IS NOT NULL
            UNION ALL
            SELECT substr(str, 0, instr(str, ' ')), 
                   substr(str, instr(str, ' ') + 1)
            FROM split WHERE str != ''
          )
          SELECT word as term, COUNT(*) as frequency
          FROM split 
          WHERE word LIKE ? AND LENGTH(word) > 2
          GROUP BY word
          ORDER BY frequency DESC
          LIMIT ?
        `, [`${partialQuery.toLowerCase()}%`, limit]),
                // Find note titles that contain the partial query
                this.database.query(`
          SELECT DISTINCT ZTITLE as title
          FROM ZSFNOTE 
          WHERE ZTITLE LIKE ? AND ZTRASHED = 0 AND ZTITLE IS NOT NULL
          ORDER BY ZMODIFICATIONDATE DESC
          LIMIT ?
        `, [`%${partialQuery}%`, limit]),
                // Find tags that start with the partial query
                this.database.query(`
          SELECT DISTINCT ZTITLE as tag
          FROM ZSFNOTETAG 
          WHERE ZTITLE LIKE ?
          ORDER BY ZTITLE
          LIMIT ?
        `, [`${partialQuery}%`, limit])
            ]);
            return {
                terms: termSuggestions.map(s => s.term),
                titles: titleSuggestions.map(s => s.title),
                tags: tagSuggestions.map(s => s.tag)
            };
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Search for similar notes using content analysis
     */
    async findSimilarNotes(referenceText, options = {}) {
        await this.database.connect(true);
        try {
            const referenceKeywords = this.extractKeywords(referenceText);
            if (referenceKeywords.length === 0) {
                return [];
            }
            let sql = `
        SELECT n.*, GROUP_CONCAT(DISTINCT t.ZTITLE) as tag_names,
               LENGTH(n.ZTEXT) as content_length
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE n.ZTRASHED = 0 AND n.ZTEXT IS NOT NULL
      `;
            const params = [];
            if (options.excludeNoteId) {
                sql += ' AND n.Z_PK != ?';
                params.push(options.excludeNoteId);
            }
            // Add keyword matching conditions
            const keywordConditions = referenceKeywords.map(() => 'LOWER(n.ZTEXT) LIKE LOWER(?)').join(' OR ');
            sql += ` AND (${keywordConditions})`;
            referenceKeywords.forEach(keyword => params.push(`%${keyword}%`));
            sql += ' GROUP BY n.Z_PK ORDER BY n.ZMODIFICATIONDATE DESC';
            if (options.limit) {
                sql += ' LIMIT ?';
                params.push(options.limit * 3); // Get more results for similarity filtering
            }
            const rows = await this.database.query(sql, params);
            // Calculate similarity scores
            const results = rows.map(row => {
                const note = {
                    ...row,
                    tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
                    contentLength: row.content_length
                };
                const noteKeywords = this.extractKeywords(note.ZTEXT || '');
                const commonKeywords = referenceKeywords.filter(kw => noteKeywords.some(nkw => nkw.includes(kw) || kw.includes(nkw)));
                const similarityScore = commonKeywords.length / Math.max(referenceKeywords.length, noteKeywords.length);
                return {
                    ...note,
                    similarityScore,
                    commonKeywords
                };
            })
                .filter(result => result.similarityScore >= (options.minSimilarity || 0.1))
                .sort((a, b) => b.similarityScore - a.similarityScore)
                .slice(0, options.limit || 10);
            return results;
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Extract search terms with optional fuzzy matching
     */
    extractSearchTerms(query, fuzzyMatch = false) {
        const terms = query
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(term => term.length > 1);
        if (fuzzyMatch) {
            // Add fuzzy variations (simple approach - could be enhanced with Levenshtein distance)
            const fuzzyTerms = [];
            terms.forEach(term => {
                fuzzyTerms.push(term);
                if (term.length > 3) {
                    // Add terms with one character missing
                    for (let i = 0; i < term.length; i++) {
                        fuzzyTerms.push(term.substring(0, i) + term.substring(i + 1));
                    }
                }
            });
            return [...new Set(fuzzyTerms)]; // Remove duplicates
        }
        return terms;
    }
    /**
     * Analyze search matches and calculate relevance
     */
    analyzeSearchMatches(note, searchTerms, options) {
        const title = note.ZTITLE?.toLowerCase() || '';
        const content = note.ZTEXT?.toLowerCase() || '';
        let titleMatches = 0;
        let contentMatches = 0;
        const matchedTerms = [];
        const snippets = [];
        searchTerms.forEach(term => {
            const termLower = term.toLowerCase();
            // Count title matches
            const titleMatchCount = (title.match(new RegExp(termLower, 'g')) || []).length;
            if (titleMatchCount > 0) {
                titleMatches += titleMatchCount;
                matchedTerms.push(term);
            }
            // Count content matches and extract snippets
            const contentMatchCount = (content.match(new RegExp(termLower, 'g')) || []).length;
            if (contentMatchCount > 0) {
                contentMatches += contentMatchCount;
                if (!matchedTerms.includes(term)) {
                    matchedTerms.push(term);
                }
                // Extract snippet around the match
                const matchIndex = content.indexOf(termLower);
                if (matchIndex !== -1 && snippets.length < 3) {
                    const start = Math.max(0, matchIndex - 50);
                    const end = Math.min(content.length, matchIndex + 100);
                    const snippet = content.substring(start, end);
                    snippets.push(`...${snippet}...`);
                }
            }
        });
        // Calculate relevance score
        let relevanceScore = 0;
        // Title matches are weighted more heavily
        relevanceScore += titleMatches * 10;
        // Content matches
        relevanceScore += contentMatches * 2;
        // Boost for exact phrase matches
        const queryLower = searchTerms.join(' ').toLowerCase();
        if (title.includes(queryLower)) {
            relevanceScore += 20;
        }
        if (content.includes(queryLower)) {
            relevanceScore += 5;
        }
        // Boost for tag matches
        const tagMatches = note.tags.filter(tag => searchTerms.some(term => tag.toLowerCase().includes(term.toLowerCase()))).length;
        relevanceScore += tagMatches * 15;
        // Normalize by content length (favor shorter, more focused content)
        if (note.contentLength && note.contentLength > 0) {
            relevanceScore = relevanceScore / Math.log(note.contentLength + 1);
        }
        return {
            relevanceScore,
            matchedTerms,
            snippets,
            titleMatches,
            contentMatches
        };
    }
    /**
     * Get comprehensive file attachment information
     */
    async getFileAttachments(options = {}) {
        await this.database.connect(true);
        try {
            let sql = `
        SELECT f.*, n.ZTITLE as note_title, n.Z_PK as note_id
        FROM ZSFNOTEFILE f
        INNER JOIN ZSFNOTE n ON f.ZNOTE = n.Z_PK
        WHERE n.ZTRASHED = 0
      `;
            const params = [];
            if (options.noteId) {
                sql += ' AND f.ZNOTE = ?';
                params.push(options.noteId);
            }
            if (options.fileType) {
                sql += ' AND LOWER(f.ZFILENAME) LIKE LOWER(?)';
                params.push(`%.${options.fileType}`);
            }
            sql += ' ORDER BY f.ZCREATIONDATE DESC';
            if (options.limit) {
                sql += ' LIMIT ?';
                params.push(options.limit);
            }
            const files = await this.database.query(sql, params);
            // Get attachment statistics by type
            const typeStats = await this.database.query(`
        SELECT 
          CASE 
            WHEN LOWER(f.ZFILENAME) LIKE '%.jpg' OR LOWER(f.ZFILENAME) LIKE '%.jpeg' OR 
                 LOWER(f.ZFILENAME) LIKE '%.png' OR LOWER(f.ZFILENAME) LIKE '%.gif' OR
                 LOWER(f.ZFILENAME) LIKE '%.webp' THEN 'image'
            WHEN LOWER(f.ZFILENAME) LIKE '%.pdf' THEN 'pdf'
            WHEN LOWER(f.ZFILENAME) LIKE '%.doc' OR LOWER(f.ZFILENAME) LIKE '%.docx' OR
                 LOWER(f.ZFILENAME) LIKE '%.txt' OR LOWER(f.ZFILENAME) LIKE '%.md' THEN 'document'
            WHEN LOWER(f.ZFILENAME) LIKE '%.mp4' OR LOWER(f.ZFILENAME) LIKE '%.mov' OR
                 LOWER(f.ZFILENAME) LIKE '%.avi' THEN 'video'
            WHEN LOWER(f.ZFILENAME) LIKE '%.mp3' OR LOWER(f.ZFILENAME) LIKE '%.wav' OR
                 LOWER(f.ZFILENAME) LIKE '%.m4a' THEN 'audio'
            ELSE 'other'
          END as type,
          COUNT(*) as count,
          COALESCE(SUM(f.ZFILESIZE), 0) as total_size
        FROM ZSFNOTEFILE f
        INNER JOIN ZSFNOTE n ON f.ZNOTE = n.Z_PK
        WHERE n.ZTRASHED = 0
        GROUP BY type
        ORDER BY count DESC
      `);
            const attachments = files.map((file) => {
                const filename = file.ZFILENAME || 'unknown';
                const extension = filename.split('.').pop()?.toLowerCase() || '';
                let contentType = 'application/octet-stream';
                let fileType = 'other';
                // Determine content type and file type
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
                    contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
                    fileType = 'image';
                }
                else if (extension === 'pdf') {
                    contentType = 'application/pdf';
                    fileType = 'pdf';
                }
                else if (['doc', 'docx'].includes(extension)) {
                    contentType = 'application/msword';
                    fileType = 'document';
                }
                else if (['txt', 'md'].includes(extension)) {
                    contentType = 'text/plain';
                    fileType = 'document';
                }
                else if (['mp4', 'mov', 'avi'].includes(extension)) {
                    contentType = `video/${extension}`;
                    fileType = 'video';
                }
                else if (['mp3', 'wav', 'm4a'].includes(extension)) {
                    contentType = `audio/${extension}`;
                    fileType = 'audio';
                }
                return {
                    id: file.Z_PK,
                    filename,
                    fileType,
                    fileSize: file.ZFILESIZE || 0,
                    createdAt: CoreDataUtils.toDate(file.ZCREATIONDATE),
                    modifiedAt: CoreDataUtils.toDate(file.ZMODIFICATIONDATE),
                    noteId: file.note_id,
                    noteTitle: file.note_title || 'Untitled',
                    filePath: file.ZFILEPATH || '',
                    contentType,
                    metadata: options.includeMetadata ? this.extractFileMetadata(file) : undefined
                };
            });
            return {
                totalAttachments: files.length,
                attachments,
                attachmentsByType: typeStats.map(stat => ({
                    type: stat.type,
                    count: stat.count,
                    totalSize: stat.total_size
                }))
            };
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Analyze note metadata and content patterns
     */
    async analyzeNoteMetadata(options = {}) {
        await this.database.connect(true);
        try {
            // Basic overview
            const [overview] = await this.database.query(`
        SELECT 
          COUNT(*) as total_notes,
          AVG(LENGTH(ZTEXT)) as avg_length
        FROM ZSFNOTE 
        WHERE ZTRASHED = 0 AND ZTEXT IS NOT NULL
      `);
            // Length distribution
            const lengthDistribution = await this.database.query(`
        SELECT 
          CASE 
            WHEN LENGTH(ZTEXT) < 100 THEN '0-100'
            WHEN LENGTH(ZTEXT) < 500 THEN '100-500'
            WHEN LENGTH(ZTEXT) < 1000 THEN '500-1K'
            WHEN LENGTH(ZTEXT) < 5000 THEN '1K-5K'
            WHEN LENGTH(ZTEXT) < 10000 THEN '5K-10K'
            ELSE '10K+'
          END as range,
          COUNT(*) as count
        FROM ZSFNOTE 
        WHERE ZTRASHED = 0 AND ZTEXT IS NOT NULL
        GROUP BY range
        ORDER BY 
          CASE range
            WHEN '0-100' THEN 1
            WHEN '100-500' THEN 2
            WHEN '500-1K' THEN 3
            WHEN '1K-5K' THEN 4
            WHEN '5K-10K' THEN 5
            ELSE 6
          END
      `);
            // Creation and modification patterns by hour
            const creationPatterns = await this.database.query(`
        SELECT 
          CAST(strftime('%H', datetime(ZCREATIONDATE + 978307200, 'unixepoch', 'localtime')) AS INTEGER) as hour,
          COUNT(*) as count
        FROM ZSFNOTE 
        WHERE ZTRASHED = 0
        GROUP BY hour
        ORDER BY hour
      `);
            const modificationPatterns = await this.database.query(`
        SELECT 
          CAST(strftime('%H', datetime(ZMODIFICATIONDATE + 978307200, 'unixepoch', 'localtime')) AS INTEGER) as hour,
          COUNT(*) as count
        FROM ZSFNOTE 
        WHERE ZTRASHED = 0
        GROUP BY hour
        ORDER BY hour
      `);
            const result = {
                overview: {
                    totalNotes: overview.total_notes,
                    averageLength: Math.round(overview.avg_length || 0),
                    lengthDistribution,
                    creationPatterns,
                    modificationPatterns
                }
            };
            // Content analysis
            if (options.includeContentAnalysis) {
                const notes = await this.database.query(`
          SELECT ZTEXT as text FROM ZSFNOTE 
          WHERE ZTRASHED = 0 AND ZTEXT IS NOT NULL
          LIMIT 1000
        `);
                const contentAnalysis = this.analyzeContent(notes.map(n => n.text));
                result.contentAnalysis = contentAnalysis;
            }
            // Link analysis
            if (options.includeLinkAnalysis) {
                const notes = await this.database.query(`
          SELECT ZTEXT as text FROM ZSFNOTE 
          WHERE ZTRASHED = 0 AND ZTEXT IS NOT NULL
          AND (ZTEXT LIKE '%http%' OR ZTEXT LIKE '%www.%' OR ZTEXT LIKE '%[%](%')
          LIMIT 1000
        `);
                const linkAnalysis = this.analyzeLinks(notes.map(n => n.text));
                result.linkAnalysis = linkAnalysis;
            }
            // Structure analysis
            if (options.includeStructureAnalysis) {
                const notes = await this.database.query(`
          SELECT ZTITLE as title, ZTEXT as text FROM ZSFNOTE 
          WHERE ZTRASHED = 0 AND ZTEXT IS NOT NULL
          LIMIT 1000
        `);
                const structureAnalysis = this.analyzeStructure(notes);
                result.structureAnalysis = structureAnalysis;
            }
            return result;
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Get notes with specific metadata characteristics
     */
    async getNotesWithMetadata(criteria) {
        await this.database.connect(true);
        try {
            let sql = `
        SELECT n.*, 
               GROUP_CONCAT(DISTINCT t.ZTITLE) as tag_names,
               COUNT(DISTINCT f.Z_PK) as attachment_count
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        LEFT JOIN ZSFNOTEFILE f ON n.Z_PK = f.ZNOTE
        WHERE n.ZTRASHED = 0
      `;
            const params = [];
            // Date filters
            if (criteria.createdAfter) {
                sql += ' AND n.ZCREATIONDATE >= ?';
                params.push(CoreDataUtils.fromDate(criteria.createdAfter));
            }
            if (criteria.createdBefore) {
                sql += ' AND n.ZCREATIONDATE <= ?';
                params.push(CoreDataUtils.fromDate(criteria.createdBefore));
            }
            if (criteria.modifiedAfter) {
                sql += ' AND n.ZMODIFICATIONDATE >= ?';
                params.push(CoreDataUtils.fromDate(criteria.modifiedAfter));
            }
            if (criteria.modifiedBefore) {
                sql += ' AND n.ZMODIFICATIONDATE <= ?';
                params.push(CoreDataUtils.fromDate(criteria.modifiedBefore));
            }
            // Attachment filter
            if (criteria.hasAttachments === true) {
                sql += ' AND f.Z_PK IS NOT NULL';
            }
            else if (criteria.hasAttachments === false) {
                sql += ' AND f.Z_PK IS NULL';
            }
            sql += ' GROUP BY n.Z_PK ORDER BY n.ZMODIFICATIONDATE DESC';
            if (criteria.limit) {
                sql += ' LIMIT ?';
                params.push(criteria.limit);
            }
            const rows = await this.database.query(sql, params);
            // Analyze content for each note
            const results = rows.map(row => {
                const note = {
                    ...row,
                    tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : []
                };
                const content = note.ZTEXT || '';
                // Count various content elements
                const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
                const linkCount = (content.match(/https?:\/\/[^\s\)]+/g) || []).length;
                const imageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
                const todoCount = (content.match(/- \[[ x]\]/g) || []).length;
                const codeBlockCount = (content.match(/```/g) || []).length / 2;
                const tableCount = (content.match(/\|.*\|/g) || []).length;
                // Apply content-based filters
                if (criteria.minWordCount && wordCount < criteria.minWordCount)
                    return null;
                if (criteria.maxWordCount && wordCount > criteria.maxWordCount)
                    return null;
                if (criteria.hasLinks === true && linkCount === 0)
                    return null;
                if (criteria.hasLinks === false && linkCount > 0)
                    return null;
                if (criteria.hasImages === true && imageCount === 0)
                    return null;
                if (criteria.hasImages === false && imageCount > 0)
                    return null;
                if (criteria.hasTodos === true && todoCount === 0)
                    return null;
                if (criteria.hasTodos === false && todoCount > 0)
                    return null;
                if (criteria.hasCodeBlocks === true && codeBlockCount === 0)
                    return null;
                if (criteria.hasCodeBlocks === false && codeBlockCount > 0)
                    return null;
                if (criteria.hasTables === true && tableCount === 0)
                    return null;
                if (criteria.hasTables === false && tableCount > 0)
                    return null;
                return {
                    ...note,
                    wordCount,
                    attachmentCount: row.attachment_count,
                    linkCount,
                    imageCount,
                    todoCount,
                    codeBlockCount,
                    tableCount,
                    metadata: {
                        hasAttachments: row.attachment_count > 0,
                        hasLinks: linkCount > 0,
                        hasImages: imageCount > 0,
                        hasTodos: todoCount > 0,
                        hasCodeBlocks: codeBlockCount > 0,
                        hasTables: tableCount > 0
                    }
                };
            }).filter(Boolean);
            return results;
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Extract file metadata from database record
     */
    extractFileMetadata(file) {
        return {
            creationDate: CoreDataUtils.toDate(file.ZCREATIONDATE),
            modificationDate: CoreDataUtils.toDate(file.ZMODIFICATIONDATE),
            fileSize: file.ZFILESIZE || 0,
            filePath: file.ZFILEPATH || '',
            originalFilename: file.ZFILENAME || '',
            // Add more metadata fields as available in the database
        };
    }
    /**
     * Analyze content patterns in notes
     */
    analyzeContent(texts) {
        const analysis = {
            markdownUsage: {
                headings: 0,
                lists: 0,
                codeBlocks: 0,
                links: 0,
                images: 0,
                tables: 0
            },
            languagePatterns: [],
            commonPatterns: []
        };
        const languageMap = new Map();
        const patternCounts = {
            emails: 0,
            urls: 0,
            phoneNumbers: 0,
            dates: 0,
            times: 0,
            hashtags: 0
        };
        texts.forEach(text => {
            // Markdown usage
            analysis.markdownUsage.headings += (text.match(/^#+\s/gm) || []).length;
            analysis.markdownUsage.lists += (text.match(/^[\s]*[-*+]\s/gm) || []).length;
            analysis.markdownUsage.codeBlocks += (text.match(/```/g) || []).length / 2;
            analysis.markdownUsage.links += (text.match(/\[.*?\]\(.*?\)/g) || []).length;
            analysis.markdownUsage.images += (text.match(/!\[.*?\]\(.*?\)/g) || []).length;
            analysis.markdownUsage.tables += (text.match(/\|.*\|/g) || []).length;
            // Language detection (basic)
            const codeBlocks = text.match(/```(\w+)?\n([\s\S]*?)```/g) || [];
            codeBlocks.forEach(block => {
                const match = block.match(/```(\w+)/);
                if (match && match[1]) {
                    const lang = match[1].toLowerCase();
                    languageMap.set(lang, (languageMap.get(lang) || 0) + 1);
                }
            });
            // Common patterns
            patternCounts.emails += (text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || []).length;
            patternCounts.urls += (text.match(/https?:\/\/[^\s\)]+/g) || []).length;
            patternCounts.phoneNumbers += (text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g) || []).length;
            patternCounts.dates += (text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g) || []).length;
            patternCounts.times += (text.match(/\b\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?\b/g) || []).length;
            patternCounts.hashtags += (text.match(/#\w+/g) || []).length;
        });
        analysis.languagePatterns = Array.from(languageMap.entries())
            .map(([language, count]) => ({ language, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        analysis.commonPatterns = [
            { pattern: 'emails', description: 'Email addresses', count: patternCounts.emails },
            { pattern: 'urls', description: 'Web URLs', count: patternCounts.urls },
            { pattern: 'phoneNumbers', description: 'Phone numbers', count: patternCounts.phoneNumbers },
            { pattern: 'dates', description: 'Date patterns', count: patternCounts.dates },
            { pattern: 'times', description: 'Time patterns', count: patternCounts.times },
            { pattern: 'hashtags', description: 'Hashtags', count: patternCounts.hashtags }
        ].filter(p => p.count > 0).sort((a, b) => b.count - a.count);
        return analysis;
    }
    /**
     * Analyze links in notes
     */
    analyzeLinks(texts) {
        const analysis = {
            internalLinks: 0,
            externalLinks: 0,
            brokenLinks: 0,
            topDomains: [],
            linkTypes: []
        };
        const domainMap = new Map();
        const typeMap = new Map();
        texts.forEach(text => {
            // Extract all URLs
            const urls = text.match(/https?:\/\/[^\s\)\]]+/g) || [];
            urls.forEach(url => {
                try {
                    const urlObj = new URL(url);
                    const domain = urlObj.hostname;
                    domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
                    // Categorize link types
                    if (domain.includes('github.com')) {
                        typeMap.set('GitHub', (typeMap.get('GitHub') || 0) + 1);
                    }
                    else if (domain.includes('stackoverflow.com')) {
                        typeMap.set('Stack Overflow', (typeMap.get('Stack Overflow') || 0) + 1);
                    }
                    else if (domain.includes('wikipedia.org')) {
                        typeMap.set('Wikipedia', (typeMap.get('Wikipedia') || 0) + 1);
                    }
                    else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
                        typeMap.set('YouTube', (typeMap.get('YouTube') || 0) + 1);
                    }
                    else if (domain.includes('medium.com')) {
                        typeMap.set('Medium', (typeMap.get('Medium') || 0) + 1);
                    }
                    else {
                        typeMap.set('Other', (typeMap.get('Other') || 0) + 1);
                    }
                    analysis.externalLinks++;
                }
                catch (e) {
                    analysis.brokenLinks++;
                }
            });
            // Bear internal links (bear:// protocol or [[Note Title]] format)
            const internalLinks = text.match(/(?:bear:\/\/|x-callback-url:\/\/bear|bear-callback:\/\/|\[\[.*?\]\])/g) || [];
            analysis.internalLinks += internalLinks.length;
        });
        analysis.topDomains = Array.from(domainMap.entries())
            .map(([domain, count]) => ({ domain, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        analysis.linkTypes = Array.from(typeMap.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);
        return analysis;
    }
    /**
     * Analyze note structure patterns
     */
    analyzeStructure(notes) {
        const analysis = {
            titlePatterns: [],
            averageWordsPerNote: 0,
            averageParagraphsPerNote: 0,
            notesWithTodos: 0,
            notesWithDates: 0,
            notesWithNumbers: 0
        };
        const titlePatternMap = new Map();
        let totalWords = 0;
        let totalParagraphs = 0;
        notes.forEach(note => {
            const { title, text } = note;
            // Analyze title patterns
            if (title) {
                const patterns = this.extractTitlePatterns(title);
                patterns.forEach(pattern => {
                    if (!titlePatternMap.has(pattern)) {
                        titlePatternMap.set(pattern, { count: 0, examples: [] });
                    }
                    const entry = titlePatternMap.get(pattern);
                    entry.count++;
                    if (entry.examples.length < 3) {
                        entry.examples.push(title);
                    }
                });
            }
            // Count words and paragraphs
            const words = text.split(/\s+/).filter(word => word.length > 0);
            totalWords += words.length;
            const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
            totalParagraphs += paragraphs.length;
            // Check for specific content types
            if (text.match(/- \[[ x]\]/))
                analysis.notesWithTodos++;
            if (text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/))
                analysis.notesWithDates++;
            if (text.match(/\b\d+\b/))
                analysis.notesWithNumbers++;
        });
        analysis.titlePatterns = Array.from(titlePatternMap.entries())
            .map(([pattern, data]) => ({ pattern, count: data.count, examples: data.examples }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        analysis.averageWordsPerNote = Math.round(totalWords / notes.length);
        analysis.averageParagraphsPerNote = Math.round((totalParagraphs / notes.length) * 100) / 100;
        return analysis;
    }
    /**
     * Extract patterns from note titles
     */
    extractTitlePatterns(title) {
        const patterns = [];
        // Date patterns
        if (title.match(/\d{4}-\d{2}-\d{2}/))
            patterns.push('ISO Date (YYYY-MM-DD)');
        if (title.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/))
            patterns.push('US Date (MM/DD/YYYY)');
        if (title.match(/\d{1,2}-\d{1,2}-\d{2,4}/))
            patterns.push('Dash Date (MM-DD-YYYY)');
        // Meeting patterns
        if (title.toLowerCase().includes('meeting'))
            patterns.push('Meeting Notes');
        if (title.toLowerCase().includes('standup'))
            patterns.push('Standup Notes');
        if (title.toLowerCase().includes('interview'))
            patterns.push('Interview Notes');
        // Project patterns
        if (title.toLowerCase().includes('project'))
            patterns.push('Project Notes');
        if (title.toLowerCase().includes('todo') || title.toLowerCase().includes('task'))
            patterns.push('Task Lists');
        // Learning patterns
        if (title.toLowerCase().includes('notes on') || title.toLowerCase().includes('learning'))
            patterns.push('Learning Notes');
        if (title.toLowerCase().includes('tutorial') || title.toLowerCase().includes('guide'))
            patterns.push('Tutorials/Guides');
        // Question patterns
        if (title.startsWith('How to') || title.startsWith('Why') || title.startsWith('What'))
            patterns.push('Question Format');
        // Number patterns
        if (title.match(/^\d+\.?\s/))
            patterns.push('Numbered Title');
        // Capitalization patterns
        if (title === title.toUpperCase())
            patterns.push('ALL CAPS');
        if (title.split(' ').every(word => word[0] === word[0].toUpperCase()))
            patterns.push('Title Case');
        return patterns.length > 0 ? patterns : ['No Pattern'];
    }
    /**
     * Create a new note with title, content, and tags
     */
    async createNote(options) {
        // Check if Bear is running - if so, use API approach instead of database writes
        const isBearRunning = await this.isBearRunning();
        if (isBearRunning) {
            // Bear is running - using API approach for note creation
            const result = await this.createNoteViaBearAPI(options.title, options.content || '', options.tags || []);
            return {
                noteId: -1, // API doesn't return internal ID
                success: true,
                backupPath: undefined
            };
        }
        // Create backup before any write operation
        const backupPath = await this.createBackup();
        await this.database.connect(false); // Write mode
        try {
            const now = CoreDataUtils.fromDate(new Date());
            const uuid = this.generateUUID();
            // Prepare content in exact Bear format that works
            let noteContent = `# ${options.title}\n\n`;
            // Add hashtags on separate lines (Bear format)
            if (options.tags && options.tags.length > 0) {
                const sanitizedTags = options.tags.map(tag => this.sanitizeTagName(tag));
                noteContent += sanitizedTags.map(tag => `#${tag}`).join('\n') + '\n\n';
            }
            // Add actual content
            if (options.content) {
                noteContent += options.content;
            }
            // Insert the new note with proper versioning and device info
            const noteResult = await this.database.query(`
        INSERT INTO ZSFNOTE (
          ZUNIQUEIDENTIFIER, 
          ZTITLE, 
          ZTEXT, 
          ZCREATIONDATE, 
          ZMODIFICATIONDATE,
          ZARCHIVEDDATE,
          ZPINNED,
          ZTRASHED,
          ZARCHIVED,
          ZENCRYPTED,
          ZVERSION,
          ZLASTEDITINGDEVICE,
          ZSKIPSYNC
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING Z_PK as id
      `, [
                uuid,
                options.title,
                noteContent,
                now,
                now,
                options.isArchived ? now : null,
                options.isPinned ? 1 : 0,
                0, // Not trashed
                options.isArchived ? 1 : 0,
                0, // Not encrypted
                3, // Version (like working notes)
                'MCP Server', // Editing device
                0 // Don't skip sync
            ]);
            const noteId = noteResult[0].id;
            // Try multiple approaches to trigger Bear's hashtag parsing
            await this.triggerBearHashtagParsing(noteId);
            // Clear Bear's cache to force sidebar refresh
            await this.clearBearCache();
            return {
                noteId,
                success: true,
                backupPath
            };
        }
        catch (error) {
            throw new Error(`Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Update an existing note
     */
    async updateNote(noteId, options) {
        // Safety check - ensure Bear is not running
        const isBearRunning = await this.isBearRunning();
        if (isBearRunning) {
            throw new Error('Cannot update notes while Bear is running. Please close Bear first.');
        }
        // Create backup before any write operation
        const backupPath = await this.createBackup();
        await this.database.connect(false); // Write mode
        try {
            // Check if note exists and get current modification date
            const [currentNote] = await this.database.query(`
        SELECT ZMODIFICATIONDATE, ZTITLE, ZTEXT 
        FROM ZSFNOTE 
        WHERE Z_PK = ? AND ZTRASHED = 0
      `, [noteId]);
            if (!currentNote) {
                throw new Error(`Note with ID ${noteId} not found or is trashed`);
            }
            // Conflict detection
            if (options.expectedModificationDate) {
                const currentModDate = CoreDataUtils.toDate(currentNote.ZMODIFICATIONDATE);
                if (Math.abs(currentModDate.getTime() - options.expectedModificationDate.getTime()) > 1000) {
                    return {
                        success: false,
                        conflictDetected: true,
                        backupPath
                    };
                }
            }
            const now = CoreDataUtils.fromDate(new Date());
            const updates = [];
            const params = [];
            // Build dynamic update query
            if (options.title !== undefined) {
                updates.push('ZTITLE = ?');
                params.push(options.title);
            }
            if (options.content !== undefined) {
                let noteContent = options.content;
                // Add hashtags to content if provided
                if (options.tags !== undefined && options.tags.length > 0) {
                    const sanitizedTags = options.tags.map(tag => this.sanitizeTagName(tag));
                    const hashtagsLine = sanitizedTags.map(tag => `#${tag}`).join(' ');
                    noteContent = noteContent ? `${noteContent}\n${hashtagsLine}` : hashtagsLine;
                }
                updates.push('ZTEXT = ?');
                params.push(noteContent);
            }
            if (options.isArchived !== undefined) {
                updates.push('ZARCHIVED = ?', 'ZARCHIVEDDATE = ?');
                params.push(options.isArchived ? 1 : 0, options.isArchived ? now : null);
            }
            if (options.isPinned !== undefined) {
                updates.push('ZPINNED = ?');
                params.push(options.isPinned ? 1 : 0);
            }
            // Always update modification date
            updates.push('ZMODIFICATIONDATE = ?');
            params.push(now);
            if (updates.length > 0) {
                params.push(noteId);
                await this.database.query(`
          UPDATE ZSFNOTE 
          SET ${updates.join(', ')} 
          WHERE Z_PK = ?
        `, params);
            }
            // Tags are now handled purely through content - no database relationships needed
            // Trigger Bear to reparse the note for tag recognition
            await this.triggerBearReparse(noteId);
            // Clear Bear's cache to force sidebar refresh
            await this.clearBearCache();
            return {
                success: true,
                backupPath
            };
        }
        catch (error) {
            throw new Error(`Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        finally {
            await this.database.disconnect();
        }
    }
    /**
     * Duplicate an existing note
     */
    async duplicateNote(noteId, options = {}) {
        // Safety check - ensure Bear is not running
        const isBearRunning = await this.isBearRunning();
        if (isBearRunning) {
            throw new Error('Cannot duplicate notes while Bear is running. Please close Bear first.');
        }
        await this.database.connect(true); // Read mode first
        try {
            // Get the source note
            const [sourceNote] = await this.database.query(`
        SELECT * FROM ZSFNOTE WHERE Z_PK = ? AND ZTRASHED = 0
      `, [noteId]);
            if (!sourceNote) {
                throw new Error(`Note with ID ${noteId} not found or is trashed`);
            }
            // Get tags if copying them
            let tags = [];
            if (options.copyTags !== false) {
                const tagResults = await this.database.query(`
          SELECT t.ZTITLE
          FROM ZSFNOTETAG t
          INNER JOIN Z_5TAGS nt ON t.Z_PK = nt.Z_13TAGS
          WHERE nt.Z_5NOTES = ?
        `, [noteId]);
                tags = tagResults.map(t => t.ZTITLE);
            }
            await this.database.disconnect();
            // Create the duplicate note
            const newTitle = sourceNote.ZTITLE + (options.titleSuffix || ' (Copy)');
            const result = await this.createNote({
                title: newTitle,
                content: sourceNote.ZTEXT || '',
                tags: tags,
                isArchived: sourceNote.ZARCHIVED === 1,
                isPinned: sourceNote.ZPINNED === 1
            });
            return {
                newNoteId: result.noteId,
                success: result.success,
                backupPath: result.backupPath
            };
        }
        catch (error) {
            await this.database.disconnect();
            throw new Error(`Failed to duplicate note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Archive or unarchive a note
     */
    async archiveNote(noteId, archived) {
        return await this.updateNote(noteId, {
            isArchived: archived
        });
    }
    /**
     * Generate a UUID for new notes (Bear format)
     */
    generateUUID() {
        // Generate a UUID v4 format that Bear uses
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16).toUpperCase();
        });
    }
    /**
     * Clear Bear's Core Data cache to force sidebar refresh
     */
    async clearBearCache() {
        try {
            await this.database.query(`DELETE FROM Z_MODELCACHE`);
        }
        catch (error) {
            // Cache clearing is optional - don't fail the operation if it doesn't work
            // Silent error handling to avoid JSON-RPC interference
        }
    }
    /**
     * Trigger Bear to reparse a note by simulating a content edit
     * This mimics the manual edit that makes Bear recognize hashtags
     */
    async triggerBearReparse(noteId) {
        try {
            // Get current content
            const currentNote = await this.database.queryOne(`
        SELECT ZTEXT FROM ZSFNOTE WHERE Z_PK = ?
      `, [noteId]);
            if (!currentNote)
                return;
            // Simulate a content edit by adding and removing a character
            // This mimics what happens when you type and delete in Bear
            const originalContent = currentNote.ZTEXT || '';
            const tempContent = originalContent + ' '; // Add a space
            // First update: add the space
            let now = CoreDataUtils.fromDate(new Date());
            await this.database.query(`
        UPDATE ZSFNOTE 
        SET ZTEXT = ?, ZMODIFICATIONDATE = ?, ZVERSION = COALESCE(ZVERSION, 0) + 1
        WHERE Z_PK = ?
      `, [tempContent, now, noteId]);
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 50));
            // Second update: remove the space (back to original)
            now = CoreDataUtils.fromDate(new Date());
            await this.database.query(`
        UPDATE ZSFNOTE 
        SET ZTEXT = ?, ZMODIFICATIONDATE = ?, ZVERSION = COALESCE(ZVERSION, 0) + 1
        WHERE Z_PK = ?
      `, [originalContent, now, noteId]);
        }
        catch (error) {
            // Silent error handling to avoid JSON-RPC interference
        }
    }
    /**
     * Validate and sanitize tag names for Bear compatibility
     */
    sanitizeTagName(tagName) {
        // Remove hyphens as they break Bear's tag parser
        return tagName.replace(/-/g, '');
    }
    /**
     * Link a note to tags (create tags if they don't exist)
     */
    async linkNoteTags(noteId, tagNames) {
        for (const tagName of tagNames) {
            // Sanitize tag name to ensure Bear compatibility
            const sanitizedTagName = this.sanitizeTagName(tagName);
            // Find or create the tag
            let [tag] = await this.database.query(`
        SELECT Z_PK FROM ZSFNOTETAG WHERE ZTITLE = ?
      `, [sanitizedTagName]);
            if (!tag) {
                // Create new tag with all required columns
                const now = CoreDataUtils.fromDate(new Date());
                const uniqueId = uuidv4().toUpperCase();
                const tagResult = await this.database.query(`
          INSERT INTO ZSFNOTETAG (
            Z_ENT, Z_OPT, ZENCRYPTED, ZHIDESUBTAGSNOTES, ZISROOT, ZPINNED, 
            ZSORTING, ZSORTINGDIRECTION, ZVERSION, ZMODIFICATIONDATE, 
            ZTITLE, ZUNIQUEIDENTIFIER
          )
          VALUES (13, 6, 0, 0, 0, NULL, 0, NULL, 3, ?, ?, ?)
          RETURNING Z_PK as id
        `, [now, sanitizedTagName, uniqueId]);
                tag = { Z_PK: tagResult[0].id };
            }
            // Link note to tag
            await this.database.query(`
        INSERT OR IGNORE INTO Z_5TAGS (Z_5NOTES, Z_13TAGS)
        VALUES (?, ?)
      `, [noteId, tag.Z_PK]);
        }
    }
    /**
     * Trigger Bear to reparse a note by opening it in edit mode via x-callback-url
     * This uses Bear's API to simulate opening the note for editing, which should trigger parsing
     */
    async triggerBearParseViaAPI(noteId) {
        try {
            // Get the note's unique identifier for the API call
            const note = await this.database.queryOne(`
        SELECT ZUNIQUEIDENTIFIER FROM ZSFNOTE WHERE Z_PK = ?
      `, [noteId]);
            if (!note?.ZUNIQUEIDENTIFIER) {
                // Could not find note identifier for Bear API call
                return;
            }
            // Use Bear's x-callback-url API to open the note in edit mode
            // This should trigger Bear's hashtag parsing
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            const bearURL = `bear://x-callback-url/open-note?id=${note.ZUNIQUEIDENTIFIER}&edit=yes&show_window=no`;
            await execAsync(`open "${bearURL}"`);
            // Wait a moment for Bear to process the edit trigger
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        catch (error) {
            // Silent error handling to avoid JSON-RPC interference
        }
    }
    /**
     * Trigger Bear parsing using AppleScript to simulate a keystroke
     * This is a more aggressive approach that actually simulates typing in Bear
     */
    async triggerBearParseViaAppleScript(noteId) {
        try {
            // Get the note's unique identifier for the API call
            const note = await this.database.queryOne(`
        SELECT ZUNIQUEIDENTIFIER FROM ZSFNOTE WHERE Z_PK = ?
      `, [noteId]);
            if (!note?.ZUNIQUEIDENTIFIER) {
                // Could not find note identifier for AppleScript
                return;
            }
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            // AppleScript to open Bear, open the note, and simulate a keystroke
            const appleScript = `
        tell application "Bear"
          activate
        end tell
        
        delay 0.5
        
        do shell script "open 'bear://x-callback-url/open-note?id=${note.ZUNIQUEIDENTIFIER}&edit=yes'"
        
        delay 1
        
        tell application "System Events"
          tell process "Bear"
            -- Add a space and immediately delete it to trigger parsing
            keystroke " "
            delay 0.1
            key code 51 -- Delete key
          end tell
        end tell
      `;
            await execAsync(`osascript -e '${appleScript.replace(/'/g, "\\'")}'`);
        }
        catch (error) {
            // Silent error handling to avoid JSON-RPC interference
        }
    }
    /**
     * Comprehensive method to trigger Bear's hashtag parsing using multiple approaches
     * Tries different methods in order of likelihood to succeed
     */
    async triggerBearHashtagParsing(noteId) {
        try {
            // Approach 1: x-callback-url with edit=yes (most promising)
            await this.triggerBearParseViaAPI(noteId);
            // Approach 2: Database content simulation (our previous attempt)
            await this.triggerBearReparse(noteId);
            // Approach 3: AppleScript keystroke simulation (most aggressive)
            // Only try this if the user hasn't disabled it
            await this.triggerBearParseViaAppleScript(noteId);
        }
        catch (error) {
            // Silent error handling to avoid JSON-RPC interference
        }
    }
    /**
     * Public method to trigger hashtag parsing for a specific note
     * Can be called by MCP tools to help users fix sidebar display issues
     */
    async triggerHashtagParsing(noteId, noteTitle) {
        if (!noteId && !noteTitle) {
            throw new Error('Either noteId or noteTitle is required');
        }
        try {
            // Find the note
            let query;
            let params;
            if (noteId) {
                query = 'SELECT Z_PK FROM ZSFNOTE WHERE ZUNIQUEIDENTIFIER = ? AND ZTRASHED = 0';
                params = [noteId];
            }
            else {
                query = 'SELECT Z_PK FROM ZSFNOTE WHERE ZTITLE = ? AND ZTRASHED = 0';
                params = [noteTitle];
            }
            const note = await this.database.queryOne(query, params);
            if (!note) {
                throw new Error(`Note not found: ${noteId || noteTitle}`);
            }
            // Trigger the hashtag parsing
            await this.triggerBearHashtagParsing(note.Z_PK);
            return `Hashtag parsing triggered for note: ${noteId || noteTitle}. Check Bear's sidebar in a few seconds.`;
        }
        catch (error) {
            throw new Error(`Failed to trigger hashtag parsing: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Create a note using Bear's x-callback-url API when Bear is running
     * This bypasses database writes and uses Bear's native API instead
     */
    async createNoteViaBearAPI(title, content, tags) {
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            // Sanitize tags to remove hyphens (Bear doesn't support them)
            const sanitizedTags = tags.map(tag => this.sanitizeTagName(tag));
            // Build the content with embedded hashtags in Bear format
            const hashtagsLine = sanitizedTags.map(tag => `#${tag}`).join(' ');
            const bearContent = `# ${title}\n\n${hashtagsLine}\n\n${content}`;
            // Create the Bear URL with proper encoding
            const encodedTitle = encodeURIComponent(title);
            const encodedContent = encodeURIComponent(bearContent);
            const encodedTags = encodeURIComponent(sanitizedTags.join(','));
            const bearURL = `bear://x-callback-url/create?title=${encodedTitle}&text=${encodedContent}&tags=${encodedTags}&edit=yes&show_window=no`;
            // Creating note via Bear API (silent for JSON-RPC compatibility)
            await execAsync(`open "${bearURL}"`);
            // Wait for Bear to process the creation
            await new Promise(resolve => setTimeout(resolve, 1000));
            return `Note "${title}" created via Bear API with tags: ${sanitizedTags.join(', ')}`;
        }
        catch (error) {
            throw new Error(`Failed to create note via Bear API: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Batch trigger hashtag parsing for multiple notes
     * Useful for fixing sidebar display issues for many notes at once
     */
    async batchTriggerHashtagParsing(options) {
        try {
            await this.database.connect(true); // Read mode
            // Build query to find notes
            let query = 'SELECT Z_PK, ZUNIQUEIDENTIFIER, ZTITLE FROM ZSFNOTE WHERE ZTRASHED = 0';
            const params = [];
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
            const notes = await this.database.query(query, params);
            await this.database.disconnect();
            if (notes.length === 0) {
                return 'No notes found matching the criteria';
            }
            // Process each note
            let successCount = 0;
            for (const note of notes) {
                try {
                    await this.triggerBearHashtagParsing(note.Z_PK);
                    successCount++;
                    // Small delay between notes to avoid overwhelming Bear
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                catch (error) {
                    // Silent error handling to avoid JSON-RPC interference
                }
            }
            return `Triggered hashtag parsing for ${successCount}/${notes.length} notes. Check Bear's sidebar in a few seconds.`;
        }
        catch (error) {
            throw new Error(`Failed to batch trigger hashtag parsing: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
//# sourceMappingURL=bear-service.js.map