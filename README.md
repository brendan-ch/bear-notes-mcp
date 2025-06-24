# Bear MCP Server

A Model Context Protocol (MCP) server that provides Claude with comprehensive access to your Bear notes using a **hybrid sync-safe approach** - combining direct database reads with Bear's API for writes.

> **🔄 Sync-Safe Hybrid Mode**: All operations now work safely with iCloud sync!

## ⚠️ **Disclaimer**

This tool uses a hybrid approach: direct database reads + Bear API writes. While comprehensive safety measures are implemented:
- Read operations access Bear's database directly (read-only, safe)
- Write operations use Bear's official API (sync-safe)
- The tool is not affiliated with Bear's developers
- Always maintain regular Bear backups as good practice

  


## 🚀 Quick Start (5 minutes)

### Prerequisites
- Bear app installed on macOS
- Claude Desktop app
- Node.js 18+ installed

### Installation

1. **Clone and setup:**
```bash
git clone <repository-url>
cd bear-notes-mcp
npm install
npm run build
```

2. **Add to Claude Desktop configuration:**
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "bear": {
      "command": "node",
      "args": ["/path/to/bear-notes-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

3. **Start using:**
- Restart Claude Desktop
- Ask Claude: "What Bear notes do I have?"
- Begin managing your notes with natural language!

## ✨ What You Can Do

### 📖 **Read Operations (26 tools) - ✅ ACTIVE**
- **Search & Discovery**: Full-text search, find similar notes, get suggestions
- **Organization**: Browse by tags, analyze note relationships, get statistics  
- **Content Analysis**: Extract metadata, analyze attachments, find patterns
- **Advanced Queries**: Complex filtering, date ranges, content criteria

### ✏️ **Write Operations (6 tools) - ✅ ACTIVE (Sync-Safe)**
- **Create Notes**: ✅ Via Bear API (sync-safe)
- **Edit Notes**: ✅ Via Bear API (sync-safe)
- **Organize**: ✅ Via Bear API (sync-safe)
- **Tag Management**: ✅ Via Bear API (sync-safe)
- **Hashtag Parsing**: ✅ Via Bear API (sync-safe)

> **How it works**: Uses Bear's x-callback-url API for writes, database for reads!

### 🛡️ **Safety Features**
- **Hybrid Architecture**: Database reads + API writes for maximum safety
- **iCloud Sync Safe**: All write operations use Bear's API
- **Conflict Detection**: Prevents overwriting concurrent changes
- **Tag Validation**: Automatic tag sanitization with warnings
- **Error Handling**: Robust error management for all operations

## 📊 **Capabilities Overview**

| Category | Tools | Status | Key Features |
|----------|-------|--------|--------------|
| **Basic Operations** | 6 | ✅ Active | Get notes, search, browse tags, database stats |
| **Advanced Search** | 8 | ✅ Active | Full-text search, similarity matching, complex queries |
| **Analytics** | 6 | ✅ Active | Content analysis, relationship mapping, usage patterns |
| **Metadata** | 6 | ✅ Active | File attachments, content structure, organization insights |
| **Write Operations** | 6 | ✅ Active | Sync-safe via Bear API - full write capability restored! |

## 🔧 **Configuration**

### Database Location
The server automatically finds your Bear database at:
```
~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite
```

### Environment Variables
- `BEAR_DB_PATH`: Override default database location (for reads)
- `NODE_ENV`: Set to 'development' for debug logging

## 📚 **Usage Examples**

### Basic Note Management
```
"Show me my recent notes"
"Find all notes tagged with 'project'"  
"Create a new note about today's meeting"
"Search for notes containing 'API documentation'"
"Update my project notes with the latest status"
```

### Advanced Operations
```
"Analyze my note-taking patterns this month"
"Find notes similar to my current project"
"Show me notes with attachments"
"What are my most-used tags?"
```

### Organization & Cleanup
```
"Archive old notes from last year"
"Find duplicate or similar notes"
"Show me notes that might need better tags"
"Duplicate this note with a new title"
"Add tags to organize my notes better"
```

## 🛡️ **Safety & Best Practices**

### ⚠️ **Safety Guidelines**
1. **Bear can run during operations** - Write operations use Bear's API safely
2. **Automatic tag validation** - Tags are sanitized with warnings
3. **iCloud sync compatible** - No conflicts or sync issues
4. **Keep Bear updated** - Ensure API compatibility

### 💡 **Best Practices**
- **Read operations** are instant - direct database access
- **Write operations** work with Bear running or closed
- **Tag warnings** show when tags are auto-corrected
- Use specific search terms for better results
- Archive notes instead of deleting when possible

### 🏷️ **Tag Formatting Guidelines**

**✅ RECOMMENDED TAG FORMATS:**
- Simple tags: `work`, `personal`, `urgent`, `meeting`
- Nested categories: `work/projects`, `personal/health`, `study/math`
- Time-based: `2024`, `january`, `q1`
- Project codes: `proj001`, `alpha`, `beta`

**❌ AVOID THESE FORMATS (auto-corrected):**
- **Hyphens**: `project-alpha` → becomes `projectalpha`
- **Spaces**: `work meeting` → becomes `workmeeting`  
- **Underscores**: `tag_name` → becomes `tagname`
- **Mixed case**: `ProjectAlpha` → becomes `projectalpha`

**🔧 Automatic Tag Sanitization:**
The server automatically validates and sanitizes all tags:
- **Lowercase only**: `Project` → `project`
- **No spaces**: `tag name` → `tagname`
- **No underscores**: `tag_name` → `tagname`
- **No hyphens**: `project-alpha` → `projectalpha`
- **No commas**: `tag,name` → `tagname`
- **✅ Forward slashes preserved**: `project/alpha` → `project/alpha` (for nested tags)

**Tag warnings** are returned when tags are modified, so you'll know exactly what changes were made.

## 🔄 **HYBRID SYNC-SAFE ARCHITECTURE**

**✅ All operations now work safely with iCloud sync!**

### How the Hybrid Approach Works

We've implemented a **best-of-both-worlds solution** that eliminates iCloud sync conflicts:

**📖 Read Operations (Database)**
- Direct SQLite access for maximum speed and functionality
- All 26 read tools work at full performance
- Complete access to Bear's data structure

**✏️ Write Operations (Bear API)**  
- Uses Bear's x-callback-url API for sync-safe writes
- Respects Bear's internal sync coordination
- No iCloud conflicts or data corruption

**🔗 Seamless Bridge**
- Uses `ZUNIQUEIDENTIFIER` to connect database reads with API writes
- Reads from database, writes through Bear's API
- Perfect coordination between both approaches

### Why This Solution Works

**The Problem**: Direct database writes bypass Bear's sync coordination, causing iCloud conflicts.

**The Solution**: Let Bear handle all writes through its API while keeping fast database reads.

**The Result**: 
- ✅ **No iCloud sync conflicts** - Bear manages all writes
- ✅ **Full functionality restored** - All 32 tools now work
- ✅ **Maximum performance** - Database reads remain fast
- ✅ **Complete safety** - No risk of data corruption

### Current Status

- ✅ **All read operations** - Direct database access (26 tools)
- ✅ **All write operations** - Sync-safe Bear API (6 tools)
- ✅ **Full feature parity** - Everything works as designed
- ✅ **iCloud sync compatible** - No conflicts or issues
- ✅ **Duplicate title fix** - Notes display titles correctly (no duplication)

### 🙏 **Thanks to Bear Team**

Special thanks to **Danilo from the Bear team** who provided the key insight that led to this solution!

---

## 🤝 **Contributing & Community**

The **iCloud sync challenge has been solved!** 🎉 Now we're focused on making this the best Bear integration possible. Whether you're a:

- **macOS/iOS developer** with API experience
- **Database expert** familiar with SQLite optimization
- **Bear power user** with workflow insights
- **Developer** wanting to contribute to MCP ecosystem

**Your contribution can help thousands of Bear users get even more from their AI assistants!**

### Current Priorities

1. 🚀 **Add new features** - More ways to analyze and work with notes
2. 📖 **Improve documentation** - Help others understand and contribute  
3. 🧪 **Expand test coverage** - Ensure reliability across Bear versions
4. ⚡ **Performance optimization** - Make operations even faster

### Quick Ways to Help

- ⭐ **Star the repo** if you find it useful
- 🐛 **Report issues** you encounter
- 💡 **Share ideas** for new features or solutions
- 🔗 **Spread the word** to developers who might help
- 📝 **Contribute documentation** improvements

**Together, we can build the most powerful Bear integration for AI assistants!**

## 🔍 **All Available Tools**

<details>
<summary><strong>📖 Read Operations (26 tools) - ✅ ACTIVE</strong></summary>

### Basic Operations (6 tools)
- `get_database_stats` - Overview of your Bear database
- `get_notes` - List notes with filtering options  
- `get_note_by_id` - Get specific note by ID
- `get_note_by_title` - Find note by exact title
- `get_tags` - List all tags with usage counts
- `get_notes_by_tag` - Find notes with specific tag

### Advanced Search (8 tools)  
- `get_notes_advanced` - Complex filtering and sorting
- `get_notes_with_criteria` - Multi-criteria search
- `search_notes_fulltext` - Full-text search with relevance scoring
- `get_search_suggestions` - Auto-complete for searches
- `find_similar_notes` - Content similarity matching
- `get_related_notes` - Find related notes by tags and content
- `get_recent_notes` - Recently created or modified notes
- `get_note_counts_by_status` - Statistics by note status

### Analytics & Insights (6 tools)
- `get_note_analytics` - Comprehensive note statistics
- `analyze_note_metadata` - Content pattern analysis
- `get_notes_with_metadata` - Filter by content characteristics
- `get_file_attachments` - File attachment management
- `get_tag_hierarchy` - Tag relationship analysis  
- `get_tag_analytics` - Tag usage patterns

### Content Analysis (6 tools)
- `analyze_tag_relationships` - Tag optimization suggestions
- `get_tag_usage_trends` - Tag usage over time
- `search_notes_regex` - Pattern matching (when available)
- Advanced content categorization
- Link and reference analysis
- Writing pattern insights

</details>

<details>
<summary><strong>✏️ Write Operations (6 tools) - ✅ ACTIVE (Sync-Safe)</strong></summary>

### Note Management - SYNC-SAFE VIA BEAR API
- `create_note` - ✅ Create new notes with tags and content
- `update_note` - ✅ Update existing notes safely
- `duplicate_note` - ✅ Create copies of existing notes
- `archive_note` - ✅ Archive/unarchive notes
- `trigger_hashtag_parsing` - ✅ Force hashtag reprocessing
- `batch_trigger_hashtag_parsing` - ✅ Bulk hashtag processing

**✅ All operations are now sync-safe:**
- Uses Bear's x-callback-url API for all writes
- No iCloud sync conflicts or data corruption
- Respects Bear's internal sync coordination
- Full write functionality restored

**Perfect integration between database reads and API writes!**

</details>

## 🔧 **Troubleshooting**

### Common Issues

**"Database not found" error:**
- Verify Bear is installed and has been opened at least once
- Check database path: `~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/`

**"Permission denied" error:**
- Ensure Claude Desktop has necessary file system permissions
- Check that the database file is readable

**Write operations not working:**
- Ensure Bear app is installed and has been opened at least once
- Check that Bear's x-callback-url functionality is enabled
- Try opening Bear manually to verify it's working

**Slow performance:**
- Large databases (10,000+ notes) may take longer for reads
- Use specific search terms instead of broad queries
- Consider using pagination with `limit` parameters

### Getting Help
1. Check the [troubleshooting guide](docs/troubleshooting.md)
2. Review [common usage patterns](docs/examples.md)  
3. Enable debug logging with `NODE_ENV=development`
4. Test Bear's API directly: `open "bear://x-callback-url/create?title=Test"`

## 📈 **Performance**

- **Read operations**: Instant (direct database access)
- **Write operations**: 1-2 seconds (Bear API processing)
- **Large databases**: Tested with 10,000+ notes
- **Memory usage**: ~50MB typical, ~100MB for complex operations
- **Concurrent operations**: Read operations can run simultaneously
- **API operations**: Processed through Bear's URL scheme

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.


---

**Made with ❤️ for the Bear community** 
