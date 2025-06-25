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
 * MCP argument types for Bear service methods
 */

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
  includeContent?: boolean;
  caseSensitive?: boolean;
  tags?: string[];
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
  tag: string;
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
}

/**
 * Arguments for getNotesWithCriteria method
 */
export interface GetNotesWithCriteriaArgs extends BaseMcpArgs {
  titleContains?: string[];
  contentContains?: string[];
  tags?: string[];
  excludeTags?: string[];
  createdAfter?: string;
  createdBefore?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  includeArchived?: boolean;
  includeTrashed?: boolean;
  includeEncrypted?: boolean;
  limit?: number;
  sortBy?: 'created' | 'modified' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Arguments for getRelatedNotes method
 */
export interface GetRelatedNotesArgs extends BaseMcpArgs {
  noteId: number;
  includeContent?: boolean;
  limit?: number;
}

/**
 * Arguments for searchNotesFullText method
 */
export interface SearchNotesFullTextArgs extends BaseMcpArgs {
  query: string;
  includeContent?: boolean;
  caseSensitive?: boolean;
  includeSnippets?: boolean;
  limit?: number;
}

/**
 * Arguments for getSearchSuggestions method
 */
export interface GetSearchSuggestionsArgs extends BaseMcpArgs {
  query: string;
  limit?: number;
}

/**
 * Arguments for findSimilarNotes method
 */
export interface FindSimilarNotesArgs extends BaseMcpArgs {
  noteId: number;
  limit?: number;
}

/**
 * Arguments for getFileAttachments method
 */
export interface GetFileAttachmentsArgs extends BaseMcpArgs {
  includeMetadata?: boolean;
  fileTypes?: string[];
  sortBy?: 'name' | 'size' | 'created' | 'modified';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Arguments for analyzeNoteMetadata method
 */
export interface AnalyzeNoteMetadataArgs extends BaseMcpArgs {
  includeContent?: boolean;
  includeLinks?: boolean;
  includeStructure?: boolean;
}

/**
 * Arguments for getNotesWithMetadata method
 */
export interface GetNotesWithMetadataArgs extends BaseMcpArgs {
  includeWordCount?: boolean;
  includeCharCount?: boolean;
  includeCreationDate?: boolean;
  includeModificationDate?: boolean;
  includeTagCount?: boolean;
  sortBy?: 'created' | 'modified' | 'wordCount' | 'charCount';
  sortOrder?: 'asc' | 'desc';
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
  newTitle?: string;
  includeTags?: boolean;
}

/**
 * Arguments for archiveNote method
 */
export interface ArchiveNoteArgs extends BaseMcpArgs {
  noteId: number;
  archive?: boolean;
}

/**
 * Arguments for triggerHashtagParsing method
 */
export interface TriggerHashtagParsingArgs extends BaseMcpArgs {
  noteId?: number;
  noteTitle?: string;
}

/**
 * Arguments for batchTriggerHashtagParsing method
 */
export interface BatchTriggerHashtagParsingArgs extends BaseMcpArgs {
  title_pattern?: string;
  created_after?: string;
  limit?: number;
}

/**
 * Union type for all possible MCP method arguments
 */
export type MCPMethodArgs =
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
