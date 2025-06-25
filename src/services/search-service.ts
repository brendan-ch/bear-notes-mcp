import { ISearchService, IDatabaseService, SERVICE_TOKENS } from './interfaces/index.js';
import { globalContainer } from './container/service-container.js';
import { NoteWithTags, NoteSearchOptions, DatabaseSearchResult } from '../types/bear.js';
import { CoreDataUtils } from '../utils/database.js';
import { SqlParameters } from '../types/database.js';

/**
 * SearchService - Handles all search and filtering operations for Bear notes
 *
 * Responsibilities:
 * - Basic and advanced note searching
 * - Full-text search with relevance scoring
 * - Search suggestions and auto-completion
 * - Content similarity analysis
 * - Complex criteria-based filtering
 * - Related notes discovery
 */
export class SearchService implements ISearchService {
  private database: IDatabaseService;

  constructor() {
    this.database = globalContainer.resolve<IDatabaseService>(SERVICE_TOKENS.DATABASE_SERVICE);
  }

  /**
   * Basic search - delegates to advanced search for consistency
   */
  async searchNotes(query: string, options: NoteSearchOptions = {}): Promise<NoteWithTags[]> {
    return this.getNotesAdvanced({ ...options, query });
  }

  /**
   * Advanced full-text search with ranking and relevance scoring
   */
  async searchNotesFullText(
    query: string,
    options: {
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
    } = {}
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
  > {
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

      const params: SqlParameters = [];

      // Basic filters
      if (!options.includeTrashed) {
        sql += ' AND n.ZTRASHED = 0';
      }

      if (!options.includeArchived) {
        sql += ' AND n.ZARCHIVED = 0';
      }

      // Build search conditions
      const searchConditions: string[] = [];

      if (searchFields.includes('title') || searchFields.includes('both')) {
        const titleConditions = searchTerms.map(() =>
          options.caseSensitive ? 'n.ZTITLE LIKE ?' : 'LOWER(n.ZTITLE) LIKE LOWER(?)'
        );
        if (titleConditions.length > 0) {
          searchConditions.push(`(${titleConditions.join(' OR ')})`);
          searchTerms.forEach(term => params.push(`%${term}%`));
        }
      }

      if (searchFields.includes('content') || searchFields.includes('both')) {
        const contentConditions = searchTerms.map(() =>
          options.caseSensitive ? 'n.ZTEXT LIKE ?' : 'LOWER(n.ZTEXT) LIKE LOWER(?)'
        );
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
      } else {
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

      const rows = await this.database.query<DatabaseSearchResult>(sql, params);

      // Calculate relevance scores and extract snippets
      return rows
        .map(row => {
          const note = {
            ...row,
            tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
            contentLength: row.content_length,
          };

          const analysis = this.analyzeSearchMatches(note, searchTerms);

          return {
            ...note,
            relevanceScore: analysis.relevanceScore,
            matchedTerms: analysis.matchedTerms,
            snippets: options.includeSnippets ? analysis.snippets : [],
            titleMatches: analysis.titleMatches,
            contentMatches: analysis.contentMatches,
          };
        })
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
    } finally {
      await this.database.disconnect();
    }
  }

  /**
   * Search with auto-complete suggestions
   */
  async getSearchSuggestions(
    partialQuery: string,
    limit: number = 10
  ): Promise<{
    terms: string[];
    titles: string[];
    tags: string[];
  }> {
    await this.database.connect(true);

    try {
      const [termSuggestions, titleSuggestions, tagSuggestions] = await Promise.all([
        // Extract common words from content that start with the partial query
        this.database.query<{ term: string; frequency: number }>(
          `
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
        `,
          [`${partialQuery.toLowerCase()}%`, limit]
        ),

        // Find note titles that contain the partial query
        this.database.query<{ title: string }>(
          `
          SELECT DISTINCT ZTITLE as title
          FROM ZSFNOTE 
          WHERE ZTITLE LIKE ? AND ZTRASHED = 0 AND ZTITLE IS NOT NULL
          ORDER BY ZMODIFICATIONDATE DESC
          LIMIT ?
        `,
          [`%${partialQuery}%`, limit]
        ),

        // Find tags that start with the partial query
        this.database.query<{ tag: string }>(
          `
          SELECT DISTINCT ZTITLE as tag
          FROM ZSFNOTETAG 
          WHERE ZTITLE LIKE ?
          ORDER BY ZTITLE
          LIMIT ?
        `,
          [`${partialQuery}%`, limit]
        ),
      ]);

      return {
        terms: termSuggestions.map(s => s.term),
        titles: titleSuggestions.map(s => s.title),
        tags: tagSuggestions.map(s => s.tag),
      };
    } finally {
      await this.database.disconnect();
    }
  }

  /**
   * Search for similar notes using content analysis
   */
  async findSimilarNotes(
    referenceText: string,
    options: {
      limit?: number;
      minSimilarity?: number;
      excludeNoteId?: number;
    } = {}
  ): Promise<Array<NoteWithTags & { similarityScore: number; commonKeywords: string[] }>> {
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

      const params: SqlParameters = [];

      if (options.excludeNoteId) {
        sql += ' AND n.Z_PK != ?';
        params.push(options.excludeNoteId);
      }

      // Add keyword matching conditions
      const keywordConditions = referenceKeywords
        .map(() => 'LOWER(n.ZTEXT) LIKE LOWER(?)')
        .join(' OR ');
      sql += ` AND (${keywordConditions})`;
      referenceKeywords.forEach(keyword => params.push(`%${keyword}%`));

      sql += ' GROUP BY n.Z_PK ORDER BY n.ZMODIFICATIONDATE DESC';

      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit * 3); // Get more results for similarity filtering
      }

      const rows = await this.database.query<DatabaseSearchResult>(sql, params);

      // Calculate similarity scores
      const results = rows
        .map(row => {
          const note = {
            ...row,
            tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
            contentLength: row.content_length,
          };

          const noteKeywords = this.extractKeywords(note.ZTEXT || '');
          const commonKeywords = referenceKeywords.filter(kw =>
            noteKeywords.some(nkw => nkw.includes(kw) || kw.includes(nkw))
          );

          const similarityScore =
            commonKeywords.length / Math.max(referenceKeywords.length, noteKeywords.length);

          return {
            ...note,
            similarityScore,
            commonKeywords,
          };
        })
        .filter(result => result.similarityScore >= (options.minSimilarity || 0.1))
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, options.limit || 10);

      return results;
    } finally {
      await this.database.disconnect();
    }
  }

  /**
   * Get notes with advanced filtering options
   */
  async getNotesAdvanced(
    options: {
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
    } = {}
  ): Promise<NoteWithTags[]> {
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

      const params: SqlParameters = [];

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
        const excludeConditions = options.excludeTags
          .map(() => 'tag_names NOT LIKE ? OR tag_names IS NULL')
          .join(' AND ');
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

      const rows = await this.database.query<DatabaseSearchResult>(sql, params);

      return rows.map(row => ({
        ...row,
        tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
        contentLength: row.content_length,
        preview: row.preview,
      }));
    } finally {
      await this.database.disconnect();
    }
  }

  /**
   * Get notes by multiple criteria with AND/OR logic
   */
  async getNotesWithCriteria(criteria: {
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
  }): Promise<NoteWithTags[]> {
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

      const params: SqlParameters = [];

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
        const havingClause = criteria.hasAllTags
          ? ` AND (${anyTagConditions})`
          : ` HAVING (${anyTagConditions})`;
        sql += havingClause;
        criteria.hasAnyTags.forEach(tag => params.push(`%${tag}%`));
      }

      sql += ' ORDER BY n.ZMODIFICATIONDATE DESC';

      const rows = await this.database.query<DatabaseSearchResult>(sql, params);

      return rows.map(row => ({
        ...row,
        tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
        contentLength: row.content_length,
      }));
    } finally {
      await this.database.disconnect();
    }
  }

  /**
   * Find related notes based on content similarity and shared tags
   */
  async getRelatedNotes(
    noteId: number,
    limit: number = 5
  ): Promise<{
    byTags: NoteWithTags[];
    byContent: NoteWithTags[];
  }> {
    await this.database.connect(true);

    try {
      // Get the source note's tags and content keywords
      const sourceNote = await this.database.queryOne<DatabaseSearchResult>(
        `
        SELECT n.*, GROUP_CONCAT(DISTINCT t.ZTITLE) as tag_names
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE n.Z_PK = ?
        GROUP BY n.Z_PK
      `,
        [noteId]
      );

      if (!sourceNote) {
        return { byTags: [], byContent: [] };
      }

      const sourceTags = sourceNote.tag_names
        ? sourceNote.tag_names.split(',').filter(Boolean)
        : [];

      // Find notes with shared tags
      const relatedByTags =
        sourceTags.length > 0
          ? await this.database.query<DatabaseSearchResult & { shared_tags: number }>(
              `
        SELECT n.*, GROUP_CONCAT(DISTINCT t.ZTITLE) as tag_names,
               COUNT(DISTINCT CASE WHEN t.ZTITLE IN (${sourceTags.map(() => '?').join(',')}) THEN t.ZTITLE END) as shared_tags
        FROM ZSFNOTE n
        JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE n.Z_PK != ? AND n.ZTRASHED = 0
        GROUP BY n.Z_PK
        HAVING shared_tags > 0
        ORDER BY shared_tags DESC, n.ZMODIFICATIONDATE DESC
        LIMIT ?
      `,
              [...sourceTags, noteId, limit]
            )
          : [];

      // Find notes with similar content (basic keyword matching)
      const contentKeywords = this.extractKeywords(sourceNote.ZTEXT || '');
      const relatedByContent =
        contentKeywords.length > 0
          ? await this.database.query<DatabaseSearchResult>(
              `
        SELECT n.*, GROUP_CONCAT(DISTINCT t.ZTITLE) as tag_names
        FROM ZSFNOTE n
        LEFT JOIN Z_5TAGS nt ON n.Z_PK = nt.Z_5NOTES
        LEFT JOIN ZSFNOTETAG t ON nt.Z_13TAGS = t.Z_PK
        WHERE n.Z_PK != ? AND n.ZTRASHED = 0
          AND (${contentKeywords.map(() => 'n.ZTEXT LIKE ?').join(' OR ')})
        GROUP BY n.Z_PK
        ORDER BY n.ZMODIFICATIONDATE DESC
        LIMIT ?
      `,
              [noteId, ...contentKeywords.map(kw => `%${kw}%`), limit]
            )
          : [];

      return {
        byTags: relatedByTags.map(row => ({
          ...row,
          tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
        })),
        byContent: relatedByContent.map(row => ({
          ...row,
          tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
        })),
      };
    } finally {
      await this.database.disconnect();
    }
  }

  /**
   * Extract keywords from text for content similarity matching
   */
  private extractKeywords(text: string): string[] {
    if (!text) {
      return [];
    }

    // Simple keyword extraction - remove common words and get significant terms
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'this',
      'that',
      'these',
      'those',
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }

  /**
   * Extract search terms with optional fuzzy matching
   */
  private extractSearchTerms(query: string, fuzzyMatch: boolean = false): string[] {
    const terms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 1);

    if (fuzzyMatch) {
      // Add fuzzy variations (simple approach - could be enhanced with Levenshtein distance)
      const fuzzyTerms: string[] = [];
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
  private analyzeSearchMatches(
    note: NoteWithTags,
    searchTerms: string[]
  ): {
    relevanceScore: number;
    matchedTerms: string[];
    snippets: string[];
    titleMatches: number;
    contentMatches: number;
  } {
    const title = note.ZTITLE?.toLowerCase() || '';
    const content = note.ZTEXT?.toLowerCase() || '';

    let titleMatches = 0;
    let contentMatches = 0;
    const matchedTerms: string[] = [];
    const snippets: string[] = [];

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
    const tagMatches = note.tags.filter(tag =>
      searchTerms.some(term => tag.toLowerCase().includes(term.toLowerCase()))
    ).length;
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
      contentMatches,
    };
  }

  /**
   * Service lifecycle management
   */
  async dispose(): Promise<void> {
    // Clean up any resources if needed
    // SearchService doesn't maintain persistent connections
  }
}
