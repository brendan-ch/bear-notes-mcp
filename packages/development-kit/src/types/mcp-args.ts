/**
 * MCP (Model Context Protocol) method argument types
 * Provides type safety for all MCP tool method arguments
 */

/**
 * Base interface for all MCP method arguments
 */
export interface BaseMcpArgs {
  [key: string]: unknown;
}

/**
 * Arguments for getRecentNotes method
 */
export interface GetRecentNotesArgs extends BaseMcpArgs {
  limit?: number;
}

/**
 * Arguments for searchNotes method
 */
export interface SearchNotesArgs extends BaseMcpArgs {
  query: string;
  limit?: number;
  includeArchived?: boolean;
  includeTrashed?: boolean;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Arguments for getNoteById method
 */
export interface GetNoteByIdArgs extends BaseMcpArgs {
  id: number;
}

/**
 * Arguments for getNoteByTitle method
 */
export interface GetNoteByTitleArgs extends BaseMcpArgs {
  title: string;
}

/**
 * Arguments for getNotesByTag method
 */
export interface GetNotesByTagArgs extends BaseMcpArgs {
  tagName: string;
}

/**
 * Arguments for getNotesAdvanced method
 */
export interface GetNotesAdvancedArgs extends BaseMcpArgs {
  query?: string;
  tags?: string[];
  excludeTags?: string[];
  dateFrom?: string;
  dateTo?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  includeContent?: boolean;
  includeTrashed?: boolean;
  includeArchived?: boolean;
  includeEncrypted?: boolean;
  sortBy?: 'created' | 'modified' | 'title' | 'size';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Arguments for getNotesWithCriteria method
 */
export interface GetNotesWithCriteriaArgs extends BaseMcpArgs {
  titleContains?: string[];
  contentContains?: string[];
  hasAllTags?: string[];
  hasAnyTags?: string[];
  createdAfter?: string;
  createdBefore?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  minLength?: number;
  maxLength?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  isEncrypted?: boolean;
}

/**
 * Arguments for getRelatedNotes method
 */
export interface GetRelatedNotesArgs extends BaseMcpArgs {
  noteId: number;
  limit?: number;
}

/**
 * Arguments for searchNotesFullText method
 */
export interface SearchNotesFullTextArgs extends BaseMcpArgs {
  query: string;
  limit?: number;
  includeSnippets?: boolean;
  searchFields?: ('title' | 'content' | 'both')[];
  fuzzyMatch?: boolean;
  caseSensitive?: boolean;
  wholeWords?: boolean;
  includeArchived?: boolean;
  includeTrashed?: boolean;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Arguments for getSearchSuggestions method
 */
export interface GetSearchSuggestionsArgs extends BaseMcpArgs {
  partialQuery: string;
  limit?: number;
}

/**
 * Arguments for findSimilarNotes method
 */
export interface FindSimilarNotesArgs extends BaseMcpArgs {
  referenceText: string;
  limit?: number;
  minSimilarity?: number;
  excludeNoteId?: number;
}

/**
 * Arguments for getFileAttachments method
 */
export interface GetFileAttachmentsArgs extends BaseMcpArgs {
  noteId?: number;
  fileType?: string;
  includeMetadata?: boolean;
  limit?: number;
}

/**
 * Arguments for analyzeNoteMetadata method
 */
export interface AnalyzeNoteMetadataArgs extends BaseMcpArgs {
  includeContentAnalysis?: boolean;
  includeLinkAnalysis?: boolean;
  includeStructureAnalysis?: boolean;
}

/**
 * Arguments for getNotesWithMetadata method
 */
export interface GetNotesWithMetadataArgs extends BaseMcpArgs {
  hasAttachments?: boolean;
  hasLinks?: boolean;
  hasImages?: boolean;
  hasTodos?: boolean;
  hasCodeBlocks?: boolean;
  hasTables?: boolean;
  minWordCount?: number;
  maxWordCount?: number;
  createdAfter?: string;
  createdBefore?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  limit?: number;
}

/**
 * Arguments for createNote method
 */
export interface CreateNoteArgs extends BaseMcpArgs {
  title: string;
  content?: string;
  tags?: string[];
  isArchived?: boolean;
  isPinned?: boolean;
}

/**
 * Arguments for updateNote method
 */
export interface UpdateNoteArgs extends BaseMcpArgs {
  noteId: number;
  title?: string;
  content?: string;
  tags?: string[];
  isArchived?: boolean;
  isPinned?: boolean;
  expectedModificationDate?: string;
}

/**
 * Arguments for duplicateNote method
 */
export interface DuplicateNoteArgs extends BaseMcpArgs {
  noteId: number;
  titleSuffix?: string;
  copyTags?: boolean;
}

/**
 * Arguments for archiveNote method
 */
export interface ArchiveNoteArgs extends BaseMcpArgs {
  noteId: number;
  archived: boolean;
}

/**
 * Arguments for triggerHashtagParsing method
 */
export interface TriggerHashtagParsingArgs extends BaseMcpArgs {
  noteId?: string;
  noteTitle?: string;
}

/**
 * Arguments for batchTriggerHashtagParsing method
 */
export interface BatchTriggerHashtagParsingArgs extends BaseMcpArgs {
  tag_filter?: string;
  title_pattern?: string;
  limit?: number;
  created_after?: string;
}

/**
 * Union type of all possible MCP argument types
 */
export type McpArgs = 
  | GetRecentNotesArgs
  | SearchNotesArgs
  | GetNoteByIdArgs
  | GetNoteByTitleArgs
  | GetNotesByTagArgs
  | GetNotesAdvancedArgs
  | GetNotesWithCriteriaArgs
  | GetRelatedNotesArgs
  | SearchNotesFullTextArgs
  | GetSearchSuggestionsArgs
  | FindSimilarNotesArgs
  | GetFileAttachmentsArgs
  | AnalyzeNoteMetadataArgs
  | GetNotesWithMetadataArgs
  | CreateNoteArgs
  | UpdateNoteArgs
  | DuplicateNoteArgs
  | ArchiveNoteArgs
  | TriggerHashtagParsingArgs
  | BatchTriggerHashtagParsingArgs; 