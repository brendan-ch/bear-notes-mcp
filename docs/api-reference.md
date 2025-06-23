# API Reference

Complete reference for all 30 Bear MCP Server tools.

## 📖 Read Operations (26 tools)

### Basic Operations

#### `get_database_stats`
Get comprehensive database statistics and overview.

**Parameters:** None

**Returns:**
```json
{
  "totalNotes": 355,
  "activeNotes": 232,
  "trashedNotes": 123,
  "archivedNotes": 2,
  "encryptedNotes": 3,
  "totalTags": 55,
  "totalAttachments": 97,
  "databaseSize": 15728640,
  "lastModified": "2024-02-18T10:30:00Z"
}
```

**Example:**
```
"Show me my Bear database statistics"
```

---

#### `get_notes`
List notes with basic filtering options.

**Parameters:**
- `includeTrashed` (boolean, optional): Include trashed notes (default: false)
- `includeArchived` (boolean, optional): Include archived notes (default: false)
- `query` (string, optional): Search term for title/content
- `limit` (number, optional): Maximum number of results
- `offset` (number, optional): Skip first N results

**Returns:** Array of note objects with tags

**Example:**
```
"Show me my recent 10 notes"
"Find notes containing 'project' in title or content"
```

---

#### `get_note_by_id`
Get a specific note by its database ID.

**Parameters:**
- `id` (number, required): Note database ID

**Returns:** Single note object with full content and tags

**Example:**
```
"Get note with ID 42"
```

---

#### `get_note_by_title`
Find a note by its exact title.

**Parameters:**
- `title` (string, required): Exact note title

**Returns:** Single note object or null if not found

**Example:**
```
"Find note titled 'Meeting Notes Feb 2024'"
```

---

#### `get_tags`
List all tags with usage statistics.

**Parameters:** None

**Returns:** Array of tag objects with note counts

**Example:**
```
"Show me all my Bear tags"
"What are my most used tags?"
```

---

#### `get_notes_by_tag`
Find all notes with a specific tag.

**Parameters:**
- `tagName` (string, required): Tag name to search for

**Returns:** Array of notes with the specified tag

**Example:**
```
"Show me all notes tagged with 'work'"
```

### Advanced Search

#### `get_notes_advanced`
Advanced note filtering with multiple criteria.

**Parameters:**
- `query` (string, optional): Search term
- `tags` (array, optional): Include notes with any of these tags
- `excludeTags` (array, optional): Exclude notes with these tags
- `dateFrom` (string, optional): ISO date string
- `dateTo` (string, optional): ISO date string
- `modifiedAfter` (string, optional): ISO date string
- `modifiedBefore` (string, optional): ISO date string
- `includeContent` (boolean, optional): Include full content preview
- `includeTrashed` (boolean, optional): Include trashed notes
- `includeArchived` (boolean, optional): Include archived notes
- `includeEncrypted` (boolean, optional): Include encrypted notes
- `sortBy` (string, optional): 'created', 'modified', 'title', 'size'
- `sortOrder` (string, optional): 'asc' or 'desc'
- `limit` (number, optional): Maximum results
- `offset` (number, optional): Skip first N results

**Example:**
```
"Find notes tagged 'project' but not 'archived', created after January 1st, sorted by modification date"
```

---

#### `get_notes_with_criteria`
Multi-criteria search with complex boolean logic.

**Parameters:**
- `titleContains` (array, optional): Terms that must appear in title
- `contentContains` (array, optional): Terms that must appear in content
- `hasAllTags` (array, optional): Notes must have ALL these tags
- `hasAnyTags` (array, optional): Notes must have ANY of these tags
- `createdAfter` (string, optional): ISO date string
- `createdBefore` (string, optional): ISO date string
- `modifiedAfter` (string, optional): ISO date string
- `modifiedBefore` (string, optional): ISO date string
- `minLength` (number, optional): Minimum content length
- `maxLength` (number, optional): Maximum content length
- `isPinned` (boolean, optional): Filter by pinned status
- `isArchived` (boolean, optional): Filter by archived status
- `isTrashed` (boolean, optional): Filter by trashed status
- `isEncrypted` (boolean, optional): Filter by encrypted status

**Example:**
```
"Find notes containing 'API' in title and 'documentation' in content, tagged with both 'work' and 'reference', longer than 1000 characters"
```

---

#### `search_notes_fulltext`
Full-text search with relevance scoring and snippets.

**Parameters:**
- `query` (string, required): Search query
- `limit` (number, optional): Maximum results (default: 20)
- `includeSnippets` (boolean, optional): Include content snippets (default: true)
- `searchFields` (array, optional): ['title', 'content', 'both']
- `fuzzyMatch` (boolean, optional): Enable fuzzy matching (default: false)
- `caseSensitive` (boolean, optional): Case-sensitive search (default: false)
- `wholeWords` (boolean, optional): Match whole words only (default: false)
- `includeArchived` (boolean, optional): Include archived notes
- `includeTrashed` (boolean, optional): Include trashed notes
- `tags` (array, optional): Limit search to notes with these tags
- `dateFrom` (string, optional): ISO date string
- `dateTo` (string, optional): ISO date string

**Returns:** Array of notes with relevance scores, matched terms, and snippets

**Example:**
```
"Search for 'machine learning' with fuzzy matching and content snippets"
```

---

#### `get_search_suggestions`
Get auto-complete suggestions for search queries.

**Parameters:**
- `partialQuery` (string, required): Partial search term
- `limit` (number, optional): Maximum suggestions (default: 10)

**Returns:**
```json
{
  "terms": ["machine", "learning", "algorithm"],
  "titles": ["Machine Learning Basics", "Learning Python"],
  "tags": ["machinelearning", "learning"]
}
```

**Example:**
```
"Get search suggestions for 'mach'"
```

---

#### `find_similar_notes`
Find notes similar to given content using keyword analysis.

**Parameters:**
- `referenceText` (string, required): Text to find similar notes for
- `limit` (number, optional): Maximum results (default: 5)
- `minSimilarity` (number, optional): Minimum similarity score (0-1)
- `excludeNoteId` (number, optional): Exclude specific note from results

**Returns:** Array of notes with similarity scores and common keywords

**Example:**
```
"Find notes similar to this content: 'JavaScript async programming with promises and async/await'"
```

---

#### `get_related_notes`
Find notes related to a specific note by tags and content.

**Parameters:**
- `noteId` (number, required): Reference note ID
- `limit` (number, optional): Maximum results per category (default: 5)

**Returns:**
```json
{
  "byTags": [...],
  "byContent": [...]
}
```

**Example:**
```
"Find notes related to note ID 123"
```

---

#### `get_recent_notes`
Get recently created or modified notes.

**Parameters:**
- `limit` (number, optional): Maximum results (default: 10)
- `sortBy` (string, optional): 'created' or 'modified' (default: 'modified')

**Example:**
```
"Show me my 20 most recently modified notes"
```

---

#### `get_note_counts_by_status`
Get note counts grouped by status.

**Parameters:** None

**Returns:**
```json
{
  "total": 355,
  "active": 232,
  "trashed": 123,
  "archived": 2,
  "encrypted": 3
}
```

### Analytics & Insights

#### `get_note_analytics`
Comprehensive analytics about your note collection.

**Parameters:** None

**Returns:**
```json
{
  "totalNotes": 355,
  "averageLength": 1250,
  "longestNote": {"title": "Research Paper", "length": 15000},
  "shortestNote": {"title": "Quick Note", "length": 25},
  "mostRecentNote": {"title": "Today's Meeting", "date": "2024-02-18T10:30:00Z"},
  "oldestNote": {"title": "First Note", "date": "2020-01-01T10:00:00Z"},
  "notesPerMonth": [
    {"month": "2024-02", "count": 15},
    {"month": "2024-01", "count": 23}
  ],
  "topTags": [
    {"tag": "work", "count": 45},
    {"tag": "personal", "count": 32}
  ],
  "contentStats": {
    "hasImages": 25,
    "hasFiles": 12,
    "hasSourceCode": 18,
    "hasTodos": 34
  }
}
```

**Example:**
```
"Analyze my note-taking patterns and give me insights"
```

---

#### `analyze_note_metadata`
Analyze content patterns and metadata across all notes.

**Parameters:**
- `includeContentAnalysis` (boolean, optional): Analyze markdown usage (default: true)
- `includeLinkAnalysis` (boolean, optional): Analyze links and references (default: true)
- `includeStructureAnalysis` (boolean, optional): Analyze note structure (default: true)

**Returns:** Detailed content analysis including markdown usage, links, and structure patterns

**Example:**
```
"Analyze the structure and content patterns of my notes"
```

---

#### `get_notes_with_metadata`
Find notes based on metadata characteristics.

**Parameters:**
- `hasAttachments` (boolean, optional): Filter by attachment presence
- `hasLinks` (boolean, optional): Filter by link presence
- `hasImages` (boolean, optional): Filter by image presence
- `hasTodos` (boolean, optional): Filter by todo presence
- `hasCodeBlocks` (boolean, optional): Filter by code block presence
- `hasTables` (boolean, optional): Filter by table presence
- `minWordCount` (number, optional): Minimum word count
- `maxWordCount` (number, optional): Maximum word count
- `createdAfter` (string, optional): ISO date string
- `createdBefore` (string, optional): ISO date string
- `modifiedAfter` (string, optional): ISO date string
- `modifiedBefore` (string, optional): ISO date string
- `limit` (number, optional): Maximum results

**Returns:** Array of notes with metadata analysis

**Example:**
```
"Find notes with attachments and todos, created in the last month"
```

---

#### `get_file_attachments`
Manage and analyze file attachments.

**Parameters:**
- `noteId` (number, optional): Get attachments for specific note
- `fileType` (string, optional): Filter by file type
- `includeMetadata` (boolean, optional): Include detailed metadata
- `limit` (number, optional): Maximum results

**Returns:**
```json
{
  "totalAttachments": 97,
  "attachments": [
    {
      "id": 1,
      "filename": "document.pdf",
      "fileType": "pdf",
      "fileSize": 1024000,
      "createdAt": "2024-02-18T10:30:00Z",
      "modifiedAt": "2024-02-18T10:30:00Z",
      "noteId": 123,
      "noteTitle": "Meeting Notes",
      "filePath": "/path/to/file",
      "contentType": "application/pdf",
      "metadata": {...}
    }
  ],
  "attachmentsByType": [
    {"type": "pdf", "count": 25, "totalSize": 50000000},
    {"type": "image", "count": 45, "totalSize": 25000000}
  ]
}
```

**Example:**
```
"Show me all PDF attachments with their metadata"
```

### Tag Management (Read-Only)

#### `get_tag_hierarchy`
Analyze tag relationships and hierarchy.

**Parameters:** None

**Returns:** Tag hierarchy analysis with parent/child relationships

**Example:**
```
"Show me my tag hierarchy and relationships"
```

---

#### `get_tag_analytics`
Detailed tag usage statistics and patterns.

**Parameters:** None

**Returns:** Comprehensive tag analytics including usage patterns and combinations

**Example:**
```
"Analyze my tag usage patterns"
```

---

#### `analyze_tag_relationships`
Suggest tag optimizations and find relationships.

**Parameters:** None

**Returns:** Tag optimization suggestions and relationship analysis

**Example:**
```
"Suggest improvements to my tag organization"
```

---

#### `get_tag_usage_trends`
Analyze tag usage trends over time.

**Parameters:** None

**Returns:** Tag usage trends with monthly breakdowns

**Example:**
```
"Show me how my tag usage has changed over time"
```

## ✏️ Write Operations (4 tools)

### Note Management

#### `create_note`
Create a new note with content and tags.

**Parameters:**
- `title` (string, required): Note title
- `content` (string, optional): Note content in markdown
- `tags` (array, optional): Array of tag names
- `isArchived` (boolean, optional): Create as archived (default: false)
- `isPinned` (boolean, optional): Create as pinned (default: false)

**Returns:**
```json
{
  "noteId": 456,
  "success": true,
  "backupPath": "/Users/user/Documents/Bear MCP Backups/backup_20240218_103000.sqlite"
}
```

**Safety Features:**
- Automatic Bear process detection
- Pre-operation database backup
- Input validation and sanitization
- **Tag validation and sanitization** (see Tag Validation Rules below)
- Automatic tag creation if they don't exist
- **Title consistency**: Titles are embedded in content as markdown headers; Bear extracts them automatically to prevent database/display inconsistencies

**Example:**
```
"Create a new note titled 'Meeting Notes' with content 'Discussed project timeline' and tags 'work' and 'meetings'"
```

**Note**: Tags are embedded as hashtags in the note content. Bear will parse them automatically when it next starts. If Bear is running during creation, restart Bear to see tags in the sidebar.

---

#### `update_note`
Update an existing note's content, title, or tags.

**Parameters:**
- `noteId` (number, required): Note ID to update
- `title` (string, optional): New title
- `content` (string, optional): New content
- `tags` (array, optional): New tag array (replaces existing tags)
- `isArchived` (boolean, optional): Archive status
- `isPinned` (boolean, optional): Pinned status
- `expectedModificationDate` (string, optional): ISO date for conflict detection

**Returns:**
```json
{
  "success": true,
  "backupPath": "/path/to/backup.sqlite",
  "conflictDetected": false
}
```

**Safety Features:**
- Conflict detection using modification dates
- Automatic backup before changes
- Comprehensive input validation
- **Tag validation and sanitization** (see Tag Validation Rules below)
- Tag management with automatic creation
- **Title consistency**: Title changes update the content's first line; Bear re-extracts the title automatically

**Example:**
```
"Update note 123 to add 'urgent' tag and change title to 'Urgent Meeting Notes'"
```

**Note**: Tag changes are embedded in the note content. Restart Bear to see updated tags in the sidebar.

---

#### `duplicate_note`
Create a copy of an existing note.

**Parameters:**
- `noteId` (number, required): Note ID to duplicate
- `titleSuffix` (string, optional): Suffix to add to title (default: " (Copy)")
- `copyTags` (boolean, optional): Copy tags from original (default: true)

**Returns:**
```json
{
  "newNoteId": 457,
  "success": true,
  "backupPath": "/path/to/backup.sqlite"
}
```

**Example:**
```
"Duplicate note 123 with title suffix ' - Draft'"
```

---

#### `archive_note`
Archive or unarchive a note.

**Parameters:**
- `noteId` (number, required): Note ID to archive/unarchive
- `archived` (boolean, required): true to archive, false to unarchive

**Returns:**
```json
{
  "success": true,
  "backupPath": "/path/to/backup.sqlite"
}
```

**Example:**
```
"Archive note 123"
"Unarchive note 123"
```

## 🏷️ Tag Validation Rules

All tag inputs are automatically validated and sanitized according to Bear's requirements:

| Input Example | Output | Rule Applied |
|---------------|--------|--------------|
| `Project` | `project` | Lowercase conversion |
| `tagname` | `tagname` | ✅ No changes needed |
| `tag name` | `tagname` | Space removal |
| `tag_name` | `tagname` | Underscore removal |
| `tag,name` | `tagname` | Comma removal |
| `project/alpha` | `project/alpha` | ✅ Forward slashes preserved (nested tags) |

### Tag Validation Response

When tags are modified during validation, operations return `tagWarnings` in the response:

```json
{
  "noteId": 456,
  "success": true,
  "backupPath": "/path/to/backup.sqlite",
  "tagWarnings": [
    "Tag \"Project Name\" was sanitized to \"projectname\"",
    "Tag \"tag with spaces\" was sanitized to \"tagwithspaces\""
  ]
}
```

### Valid Tag Examples
- ✅ `project` - Simple lowercase tag
- ✅ `work` - Single word
- ✅ `project/alpha` - Nested tag with forward slash
- ✅ `meeting2024` - Numbers allowed
- ❌ `Project Name` - Will become `projectname`
- ❌ `tag with spaces` - Will become `tagwithspaces`
- ❌ `tag_name` - Will become `tagname`

## 🛡️ Safety Features

All write operations include:

### Automatic Safety Checks
- **Bear Process Detection**: Prevents database corruption by detecting running Bear processes
- **Database Backup**: Creates timestamped backup before every write operation
- **Input Validation**: Comprehensive validation of all parameters
- **Conflict Detection**: Prevents overwriting concurrent changes using modification dates

### Error Handling
- **Graceful Failures**: All errors return detailed error messages
- **Rollback Capability**: Backups enable easy rollback if needed
- **Validation Errors**: Clear messages for invalid inputs
- **Safety Violations**: Explicit warnings for unsafe operations

### Backup System
- **Automatic Backups**: Every write operation creates a backup
- **Timestamped Files**: Backups named with creation timestamp
- **Configurable Location**: Default: `~/Documents/Bear MCP Backups/`
- **Backup Verification**: Backups are tested for integrity

## 📊 Response Formats

### Standard Note Object
```json
{
  "Z_PK": 123,
  "ZTITLE": "Note Title",
  "ZTEXT": "Note content in markdown",
  "ZCREATIONDATE": 760349412.183326,
  "ZMODIFICATIONDATE": 760349412.183326,
  "ZTRASHED": 0,
  "ZARCHIVED": 0,
  "ZPINNED": 0,
  "ZENCRYPTED": 0,
  "tags": ["tag1", "tag2"]
}
```

### Standard Tag Object
```json
{
  "Z_PK": 1,
  "ZTITLE": "work",
  "ZCREATIONDATE": 760349412.183326,
  "ZMODIFICATIONDATE": 760349412.183326,
  "noteCount": 45
}
```

### Error Response
```json
{
  "error": "Bear is currently running. Please quit Bear before performing write operations.",
  "code": "BEAR_RUNNING",
  "details": "Write operations require exclusive database access for safety."
}
```

## 🔍 Usage Tips

### Efficient Querying
- Use specific search terms instead of broad queries
- Utilize pagination for large result sets
- Combine multiple criteria for precise filtering
- Use tag-based filtering for better performance

### Best Practices
- Always test write operations with non-critical notes first
- Use read operations freely - they're completely safe
- Let the server handle tag creation automatically
- Archive notes instead of deleting when possible
- Keep Bear updated for schema compatibility

### Performance Optimization
- Use `limit` parameter for large databases
- Combine related operations when possible
- Use specific date ranges instead of open-ended queries
- Consider using tag-based filtering for better performance

---

**Next**: Check out [Usage Examples](examples.md) for practical scenarios and workflows! 