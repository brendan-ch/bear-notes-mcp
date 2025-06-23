# Bear MCP Server

A Model Context Protocol (MCP) server that provides Claude with direct access to your Bear notes database, enabling comprehensive note management beyond Bear's standard API limitations.

## ⚠️ **Disclaimer**

This tool directly accesses Bear's database. While comprehensive safety measures are implemented:
- Always maintain regular Bear backups
- Test with database copies when experimenting  
- The tool is not affiliated with Bear's developers
- Use at your own risk for production databases

---

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

### 📖 **Read Operations (26 tools)**
- **Search & Discovery**: Full-text search, find similar notes, get suggestions
- **Organization**: Browse by tags, analyze note relationships, get statistics  
- **Content Analysis**: Extract metadata, analyze attachments, find patterns
- **Advanced Queries**: Complex filtering, date ranges, content criteria

### ✏️ **Write Operations (4 tools)**
- **Create Notes**: New notes with title, content, and tags
- **Edit Notes**: Update content, titles, and tag assignments
- **Organize**: Archive/unarchive notes, duplicate notes
- **Tag Management**: Automatic tag creation and linking

### 🛡️ **Safety Features**
- **Bear Process Detection**: Prevents database corruption
- **Automatic Backups**: Every write operation creates a backup
- **Read-Only Mode**: Safe exploration without changes
- **Conflict Detection**: Prevents overwriting concurrent changes

## 📊 **Capabilities Overview**

| Category | Tools | Key Features |
|----------|-------|--------------|
| **Basic Operations** | 6 | Get notes, search, browse tags, database stats |
| **Advanced Search** | 8 | Full-text search, similarity matching, complex queries |
| **Analytics** | 6 | Content analysis, relationship mapping, usage patterns |
| **Metadata** | 6 | File attachments, content structure, organization insights |
| **Write Operations** | 4 | Create, update, duplicate, archive with full safety |

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

## 🔍 **All Available Tools**

<details>
<summary><strong>📖 Read Operations (26 tools)</strong></summary>

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
<summary><strong>✏️ Write Operations (4 tools)</strong></summary>

### Note Management
- `create_note` - Create new notes with content and tags
- `update_note` - Modify existing notes safely
- `duplicate_note` - Clone notes with optional modifications
- `archive_note` - Archive or unarchive notes

**All write operations include:**
- Automatic Bear process detection
- Pre-operation database backup
- Input validation and sanitization  
- Conflict detection and resolution
- Detailed success/error reporting

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
