# Bear MCP Server

A Model Context Protocol (MCP) server that provides Claude with direct **read-only** access to your Bear notes database, enabling comprehensive note browsing and analysis beyond Bear's standard API limitations.

> **📖 Currently Read-Only**: Write operations are temporarily disabled to prevent iCloud sync conflicts. [Help us solve this!](#-help-wanted-solving-icloud-sync-conflicts)

## ⚠️ **Disclaimer**

This tool directly accesses Bear's database. While comprehensive safety measures are implemented:
- Always maintain regular Bear backups
- Test with database copies when experimenting  
- The tool is not affiliated with Bear's developers
- Use at your own risk for production databases

  


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

### ✏️ **Write Operations (6 tools) - ❌ DISABLED**
- **Create Notes**: ❌ Disabled (use Bear's native interface)
- **Edit Notes**: ❌ Disabled (use Bear's native interface)
- **Organize**: ❌ Disabled (use Bear's native interface)
- **Tag Management**: ❌ Disabled (use Bear's native interface)
- **Hashtag Parsing**: ❌ Disabled (use Bear's native interface)

> **Why disabled?** Direct database writes cause iCloud sync conflicts. [Help us solve this!](#-help-wanted-solving-icloud-sync-conflicts)

### 🛡️ **Safety Features**
- **Bear Process Detection**: Prevents database corruption
- **Automatic Backups**: Every write operation creates a backup
- **Read-Only Mode**: Safe exploration without changes
- **Conflict Detection**: Prevents overwriting concurrent changes
- **Title Consistency**: Titles are handled through content to match Bear's behavior exactly

## 📊 **Capabilities Overview**

| Category | Tools | Status | Key Features |
|----------|-------|--------|--------------|
| **Basic Operations** | 6 | ✅ Active | Get notes, search, browse tags, database stats |
| **Advanced Search** | 8 | ✅ Active | Full-text search, similarity matching, complex queries |
| **Analytics** | 6 | ✅ Active | Content analysis, relationship mapping, usage patterns |
| **Metadata** | 6 | ✅ Active | File attachments, content structure, organization insights |
| **Write Operations** | 6 | ❌ Disabled | iCloud sync conflicts - [help wanted!](#-help-wanted-solving-icloud-sync-conflicts) |

## 🔧 **Configuration**

### Database Location
The server automatically finds your Bear database at:
```
~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite
```

### Backup Location
Automatic backups are stored at:
```
~/Documents/Bear MCP Backups/
```

### Environment Variables
- `BEAR_DB_PATH`: Override default database location
- `BEAR_BACKUP_DIR`: Override default backup directory
- `NODE_ENV`: Set to 'development' for debug logging

## 📚 **Usage Examples**

### Basic Note Management
```
"Show me my recent notes"
"Find all notes tagged with 'project'"  
"Create a new note about today's meeting"
"Search for notes containing 'API documentation'"
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
"Create a backup of my current database"
```

## 🛡️ **Safety & Best Practices**

### ⚠️ **Critical Safety Rules**
1. **Always quit Bear before write operations** - The server detects and prevents this
2. **Backups are automatic** - Every write creates a timestamped backup
3. **Test with copies first** - Use database copies for experimentation
4. **Keep Bear updated** - Ensure schema compatibility

### 💡 **Best Practices**
- Use read operations freely - they're completely safe
- Let the server handle tag creation automatically
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

## 🚨 **IMPORTANT: READ-ONLY MODE**

**⚠️ Write operations are currently DISABLED to prevent iCloud sync conflicts.**

### Why This Change Was Made

During testing, we discovered that **direct database writes cause iCloud sync failures** in Bear. This can lead to:
- iCloud sync getting stuck or failing completely
- Data corruption and note conflicts  
- Notes not syncing between devices
- Bear database inconsistencies
- Potential data loss

**User safety is our top priority**, so we've temporarily disabled all write operations until this issue can be resolved.

### Current Status

- ✅ **All read operations work perfectly** - Browse, search, and analyze your Bear notes safely
- ❌ **Write operations disabled** - Use Bear's native interface for creating/editing notes
- 🔍 **Actively seeking solutions** - See "Help Wanted" section below

### 🆘 **Help Wanted: Solving iCloud Sync Conflicts**

**We need your expertise!** If you have experience with:
- macOS iCloud sync mechanisms
- SQLite database coordination with iCloud
- Bear's internal sync architecture
- Core Data and CloudKit integration

**Please help us solve this issue!** 

**The Problem**: Direct SQLite writes bypass Bear's sync coordination, causing iCloud conflicts.

**Potential Solutions We're Exploring**:
1. **Sync coordination** - Hook into Bear's sync mechanisms
2. **CloudKit integration** - Use CloudKit APIs instead of direct database writes
3. **Bear API expansion** - Work with Bear team to expand their x-callback-url API
4. **Sync detection** - Detect and pause during active sync operations
5. **Alternative approaches** - Other methods that don't interfere with iCloud

**How to Help**:
- 🐛 **Open an issue** with insights about Bear's sync architecture
- 💡 **Share knowledge** about iCloud/CloudKit database coordination
- 🔧 **Contribute code** if you have ideas for sync-safe implementations
- 📧 **Reach out** if you have connections with the Bear development team

**Contact**: Open an issue on GitHub or contribute directly to the project.

**This server is incredibly powerful for read operations - let's work together to make writes safe too!** 🚀

---

## 🤝 **Contributing & Community**

This project needs **your help** to solve the iCloud sync challenge! Whether you're a:

- **macOS/iOS developer** with CloudKit experience
- **Database expert** familiar with sync coordination  
- **Bear power user** with insights about its architecture
- **Developer** wanting to contribute to MCP ecosystem

**Your contribution can help thousands of Bear users safely integrate with AI assistants!**

### Current Priorities

1. 🔧 **Solve iCloud sync conflicts** - Enable safe write operations
2. 📖 **Improve documentation** - Help others understand and contribute  
3. 🧪 **Expand test coverage** - Ensure reliability across Bear versions
4. 🚀 **Add new read features** - More ways to analyze and explore notes

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
<summary><strong>✏️ Write Operations (6 tools) - ❌ DISABLED</strong></summary>

### Note Management - TEMPORARILY DISABLED
- `create_note` - ❌ Disabled (iCloud sync conflicts)
- `update_note` - ❌ Disabled (iCloud sync conflicts)
- `duplicate_note` - ❌ Disabled (iCloud sync conflicts)
- `archive_note` - ❌ Disabled (iCloud sync conflicts)
- `trigger_hashtag_parsing` - ❌ Disabled (iCloud sync conflicts)
- `batch_trigger_hashtag_parsing` - ❌ Disabled (iCloud sync conflicts)

**⚠️ These operations are disabled to prevent:**
- iCloud sync failures and conflicts
- Database corruption and inconsistencies
- Note data loss or duplication
- Bear app stability issues

**Use Bear's native interface for all write operations.**

</details>

## 🔧 **Troubleshooting**

### Common Issues

**"Bear is currently running" error:**
- Quit Bear completely before write operations
- Check Activity Monitor for Bear processes

**"Database not found" error:**
- Verify Bear is installed and has been opened at least once
- Check database path: `~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/`

**"Permission denied" error:**
- Ensure Claude Desktop has necessary file system permissions
- Check that the database file is readable

**Slow performance:**
- Large databases (10,000+ notes) may take longer
- Use specific search terms instead of broad queries
- Consider using pagination with `limit` parameters

### Getting Help
1. Check the [troubleshooting guide](docs/troubleshooting.md)
2. Review [common usage patterns](docs/examples.md)  
3. Enable debug logging with `NODE_ENV=development`
4. Check backup directory for automatic backups

## 📈 **Performance**

- **Typical response time**: Under 2 seconds for most operations
- **Large databases**: Tested with 10,000+ notes
- **Memory usage**: ~50MB typical, ~100MB for complex operations
- **Concurrent operations**: Read operations can run simultaneously
- **Write operations**: Queued for safety

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.


---

**Made with ❤️ for the Bear community** 
