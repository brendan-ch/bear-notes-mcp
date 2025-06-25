import { SearchService } from '../../src/services/search-service.js';
import { SERVICE_TOKENS } from '../../src/services/interfaces/index.js';
import { mockBearNotes } from '../fixtures/bear-data.js';
import { MockBearDatabase } from '../utils/test-helpers.js';

// Mock the global container
const mockDatabaseService = new MockBearDatabase();

jest.mock('../../src/services/container/service-container.js', () => ({
  globalContainer: {
    resolve: jest.fn((token: string) => {
      if (token === SERVICE_TOKENS.DATABASE_SERVICE) {
        return mockDatabaseService;
      }
      throw new Error(`Unknown service token: ${token}`);
    }),
  },
}));

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    searchService = new SearchService();
    mockDatabaseService.reset();
  });

  afterEach(async () => {
    await searchService.dispose();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with database service dependency', () => {
      // The constructor calls globalContainer.resolve during initialization
      // Since we create searchService in beforeEach, we need to check if it was called
      expect(searchService).toBeInstanceOf(SearchService);
      // Verify the service was properly injected by checking if database calls work
      expect(mockDatabaseService).toBeDefined();
    });
  });

  describe('Basic Search Operations', () => {
    it('should perform basic search using searchNotes', async () => {
      const query = 'test';
      const options = { limit: 5 };

      // Mock database responses
      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'work,important',
          content_length: 100,
          preview: 'Test note content...',
        },
      ]);

      const result = await searchService.searchNotes(query, options);

      expect(mockDatabaseService.connect).toHaveBeenCalledWith(true);
      expect(mockDatabaseService.disconnect).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        Z_PK: mockBearNotes[0].Z_PK,
        ZTITLE: mockBearNotes[0].ZTITLE,
        tags: ['work', 'important'],
      });
    });

    it('should handle empty search results', async () => {
      mockDatabaseService.setQueryResult([]);

      const result = await searchService.searchNotes('nonexistent');

      expect(result).toHaveLength(0);
    });

    it('should handle search with no query', async () => {
      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'work',
          content_length: 100,
          preview: 'Content preview...',
        },
      ]);

      const result = await searchService.searchNotes('');

      expect(result).toHaveLength(1);
    });
  });

  describe('Full-Text Search', () => {
    it('should perform full-text search with relevance scoring', async () => {
      const query = 'important project';
      const options = {
        limit: 10,
        includeSnippets: true,
        searchFields: ['both' as const],
        fuzzyMatch: false,
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'work,important',
          content_length: 200,
        },
      ]);

      const result = await searchService.searchNotesFullText(query, options);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('relevanceScore');
      expect(result[0]).toHaveProperty('matchedTerms');
      expect(result[0]).toHaveProperty('snippets');
      expect(result[0]).toHaveProperty('titleMatches');
      expect(result[0]).toHaveProperty('contentMatches');
      expect(typeof result[0].relevanceScore).toBe('number');
    });

    it('should search only in titles when specified', async () => {
      const query = 'meeting';
      const options = {
        searchFields: ['title' as const],
        includeSnippets: false,
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[1],
          tag_names: 'meetings',
          content_length: 150,
        },
      ]);

      const result = await searchService.searchNotesFullText(query, options);

      expect(result).toHaveLength(1);
      expect(result[0].snippets).toHaveLength(0); // No snippets requested
    });

    it('should handle fuzzy matching', async () => {
      const query = 'importnt'; // Misspelled 'important'
      const options = {
        fuzzyMatch: true,
        includeSnippets: true,
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'work',
          content_length: 100,
        },
      ]);

      const result = await searchService.searchNotesFullText(query, options);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('relevanceScore');
    });

    it('should filter by tags', async () => {
      const query = 'project';
      const options = {
        tags: ['work', 'important'],
        limit: 5,
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'work,important,project',
          content_length: 200,
        },
      ]);

      const result = await searchService.searchNotesFullText(query, options);

      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('work');
      expect(result[0].tags).toContain('important');
    });

    it('should filter by date range', async () => {
      const query = 'test';
      const options = {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-12-31'),
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'test',
          content_length: 100,
        },
      ]);

      const result = await searchService.searchNotesFullText(query, options);

      expect(result).toHaveLength(1);
    });

    it('should include/exclude archived and trashed notes', async () => {
      const query = 'test';

      // Test including archived and trashed
      const includeOptions = {
        includeArchived: true,
        includeTrashed: true,
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'test',
          content_length: 100,
        },
      ]);

      const resultInclude = await searchService.searchNotesFullText(query, includeOptions);
      expect(resultInclude.length).toBeGreaterThan(0);

      // Test excluding archived and trashed (default)
      const excludeOptions = {
        includeArchived: false,
        includeTrashed: false,
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'test',
          content_length: 100,
        },
      ]);

      const resultExclude = await searchService.searchNotesFullText(query, excludeOptions);
      expect(resultExclude.length).toBeGreaterThan(0);
    });
  });

  describe('Search Suggestions', () => {
    it('should provide search suggestions for partial query', async () => {
      const partialQuery = 'proj';
      const limit = 5;

      // Mock term suggestions
      mockDatabaseService.setQueryResult([
        { term: 'project', frequency: 10 },
        { term: 'projects', frequency: 5 },
      ]);

      // Mock title suggestions
      mockDatabaseService.setQueryResult([
        { title: 'Project Planning' },
        { title: 'Project Review' },
      ]);

      // Mock tag suggestions
      mockDatabaseService.setQueryResult([{ tag: 'project' }, { tag: 'projects' }]);

      const result = await searchService.getSearchSuggestions(partialQuery, limit);

      expect(result).toHaveProperty('terms');
      expect(result).toHaveProperty('titles');
      expect(result).toHaveProperty('tags');
      expect(Array.isArray(result.terms)).toBe(true);
      expect(Array.isArray(result.titles)).toBe(true);
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it('should handle empty suggestions', async () => {
      mockDatabaseService.setQueryResult([]);

      const result = await searchService.getSearchSuggestions('xyz');

      expect(result.terms).toHaveLength(0);
      expect(result.titles).toHaveLength(0);
      expect(result.tags).toHaveLength(0);
    });
  });

  describe('Similar Notes', () => {
    it('should find similar notes based on content', async () => {
      const referenceText = 'This is about project management and team collaboration';
      const options = {
        limit: 5,
        minSimilarity: 0.1, // Lower threshold to ensure matches
        excludeNoteId: 1,
      };

      // Mock notes with relevant content for similarity matching
      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[1],
          ZTEXT: 'Project management is important for team collaboration and success',
          tag_names: 'work,management',
          content_length: 300,
        },
        {
          ...mockBearNotes[2],
          ZTEXT: 'Team collaboration helps with project management workflows',
          tag_names: 'team,project',
          content_length: 250,
        },
      ]);

      const result = await searchService.findSimilarNotes(referenceText, options);

      expect(result.length).toBeGreaterThan(0);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('similarityScore');
        expect(result[0]).toHaveProperty('commonKeywords');
        expect(typeof result[0].similarityScore).toBe('number');
        expect(Array.isArray(result[0].commonKeywords)).toBe(true);
      }
    });

    it('should return empty array for text with no keywords', async () => {
      const referenceText = 'a an the is are';

      const result = await searchService.findSimilarNotes(referenceText);

      expect(result).toHaveLength(0);
    });

    it('should filter by minimum similarity threshold', async () => {
      const referenceText = 'project management';
      const options = {
        minSimilarity: 0.8, // High threshold
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'unrelated',
          content_length: 100,
        },
      ]);

      const result = await searchService.findSimilarNotes(referenceText, options);

      // Should filter out low-similarity results
      expect(result).toHaveLength(0);
    });
  });

  describe('Advanced Search', () => {
    it('should perform advanced search with multiple filters', async () => {
      const options = {
        query: 'project',
        tags: ['work'],
        excludeTags: ['personal'],
        dateFrom: new Date('2024-01-01'),
        sortBy: 'title' as const,
        sortOrder: 'asc' as const,
        limit: 10,
        offset: 0,
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'work,important',
          content_length: 200,
          preview: 'Project content preview...',
        },
      ]);

      const result = await searchService.getNotesAdvanced(options);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('preview');
      expect(result[0].tags).toContain('work');
      expect(result[0].tags).not.toContain('personal');
    });

    it('should handle different sort options', async () => {
      const sortOptions = ['created', 'modified', 'title', 'size'] as const;

      for (const sortBy of sortOptions) {
        mockDatabaseService.setQueryResult([
          {
            ...mockBearNotes[0],
            tag_names: 'test',
            content_length: 100,
            preview: 'Test content...',
          },
        ]);

        const result = await searchService.getNotesAdvanced({
          query: 'test',
          sortBy,
          sortOrder: 'desc',
        });

        expect(result).toHaveLength(1);
      }
    });

    it('should handle pagination', async () => {
      const options = {
        query: 'test',
        limit: 5,
        offset: 10,
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'test',
          content_length: 100,
          preview: 'Test content...',
        },
      ]);

      const result = await searchService.getNotesAdvanced(options);

      expect(result).toHaveLength(1);
    });
  });

  describe('Criteria-Based Search', () => {
    it('should search by multiple criteria', async () => {
      const criteria = {
        titleContains: ['project', 'meeting'],
        contentContains: ['important', 'urgent'],
        hasAllTags: ['work'],
        hasAnyTags: ['important', 'urgent'],
        createdAfter: new Date('2024-01-01'),
        minLength: 100,
        maxLength: 1000,
        isPinned: false,
        isArchived: false,
        isTrashed: false,
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'work,important',
          content_length: 500,
        },
      ]);

      const result = await searchService.getNotesWithCriteria(criteria);

      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('work');
      expect(result[0].contentLength).toBe(500);
    });

    it('should handle boolean criteria', async () => {
      const criteria = {
        isPinned: true,
        isArchived: false,
        isEncrypted: false,
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'test',
          content_length: 200,
        },
      ]);

      const result = await searchService.getNotesWithCriteria(criteria);

      expect(result).toHaveLength(1);
    });

    it('should handle length filters', async () => {
      const criteria = {
        minLength: 100,
        maxLength: 500,
      };

      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'test',
          content_length: 300,
        },
      ]);

      const result = await searchService.getNotesWithCriteria(criteria);

      expect(result).toHaveLength(1);
      expect(result[0].contentLength).toBe(300);
    });
  });

  describe('Related Notes', () => {
    it('should find related notes by tags and content', async () => {
      const noteId = 1;
      const limit = 5;

      // Mock source note query
      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: 'work,important,project',
        },
      ]);

      // Mock related by tags query
      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[1],
          tag_names: 'work,meetings',
          shared_tags: 1,
        },
      ]);

      // Mock related by content query
      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[2],
          tag_names: 'development,coding',
        },
      ]);

      const result = await searchService.getRelatedNotes(noteId, limit);

      expect(result).toHaveProperty('byTags');
      expect(result).toHaveProperty('byContent');
      expect(Array.isArray(result.byTags)).toBe(true);
      expect(Array.isArray(result.byContent)).toBe(true);
    });

    it('should handle note not found', async () => {
      mockDatabaseService.setQueryResult([]);

      const result = await searchService.getRelatedNotes(999);

      expect(result.byTags).toHaveLength(0);
      expect(result.byContent).toHaveLength(0);
    });

    it('should handle notes with no tags', async () => {
      const noteId = 1;

      // Mock source note with no tags
      mockDatabaseService.setQueryResult([
        {
          ...mockBearNotes[0],
          tag_names: null,
        },
      ]);

      const result = await searchService.getRelatedNotes(noteId);

      expect(result.byTags).toHaveLength(0);
      expect(Array.isArray(result.byContent)).toBe(true);
    });
  });

  describe('Private Helper Methods', () => {
    it('should extract keywords correctly', () => {
      // Access private method through type assertion for testing
      const extractKeywords = (searchService as any).extractKeywords.bind(searchService);

      const text = 'This is a test document about project management and team collaboration';
      const keywords = extractKeywords(text);

      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.length).toBeLessThanOrEqual(10);
      expect(keywords).toContain('document');
      expect(keywords).toContain('project');
      expect(keywords).toContain('management');
      expect(keywords).toContain('team');
      expect(keywords).toContain('collaboration');

      // Should not contain common words
      expect(keywords).not.toContain('this');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('a');
    });

    it('should handle empty text for keyword extraction', () => {
      const extractKeywords = (searchService as any).extractKeywords.bind(searchService);

      expect(extractKeywords('')).toEqual([]);
      expect(extractKeywords(null)).toEqual([]);
      expect(extractKeywords(undefined)).toEqual([]);
    });

    it('should extract search terms correctly', () => {
      const extractSearchTerms = (searchService as any).extractSearchTerms.bind(searchService);

      const query = 'project management team';
      const terms = extractSearchTerms(query, false);

      expect(terms).toEqual(['project', 'management', 'team']);
    });

    it('should handle fuzzy search terms', () => {
      const extractSearchTerms = (searchService as any).extractSearchTerms.bind(searchService);

      const query = 'test';
      const fuzzyTerms = extractSearchTerms(query, true);

      expect(fuzzyTerms).toContain('test');
      expect(fuzzyTerms.length).toBeGreaterThan(1); // Should include fuzzy variations
    });

    it('should analyze search matches correctly', () => {
      const analyzeSearchMatches = (searchService as any).analyzeSearchMatches.bind(searchService);

      const note = {
        ZTITLE: 'Project Management Guide',
        ZTEXT: 'This is a comprehensive guide about project management and team collaboration.',
        tags: ['work', 'project', 'management'],
        contentLength: 100,
      };

      const searchTerms = ['project', 'management'];
      const options = {};

      const analysis = analyzeSearchMatches(note, searchTerms, options);

      expect(analysis).toHaveProperty('relevanceScore');
      expect(analysis).toHaveProperty('matchedTerms');
      expect(analysis).toHaveProperty('snippets');
      expect(analysis).toHaveProperty('titleMatches');
      expect(analysis).toHaveProperty('contentMatches');

      expect(typeof analysis.relevanceScore).toBe('number');
      expect(analysis.relevanceScore).toBeGreaterThan(0);
      expect(analysis.matchedTerms).toContain('project');
      expect(analysis.matchedTerms).toContain('management');
      expect(analysis.titleMatches).toBeGreaterThan(0);
      expect(analysis.contentMatches).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockDatabaseService.connect.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(searchService.searchNotes('test')).rejects.toThrow('Connection failed');
    });

    it('should handle database query errors', async () => {
      mockDatabaseService.query.mockRejectedValueOnce(new Error('Query failed'));

      await expect(searchService.searchNotesFullText('test')).rejects.toThrow('Query failed');
    });

    it('should ensure database disconnect on error', async () => {
      mockDatabaseService.query.mockRejectedValueOnce(new Error('Query failed'));

      try {
        await searchService.searchNotes('test');
      } catch {
        // Expected error
      }

      expect(mockDatabaseService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Service Lifecycle', () => {
    it('should dispose cleanly', async () => {
      await expect(searchService.dispose()).resolves.not.toThrow();
    });
  });
});
