# Troubleshooting Guide

Solutions for common issues with the Bear MCP Server.

## 🚨 **IMPORTANT: READ-ONLY MODE**

**⚠️ This server is currently in READ-ONLY mode to prevent iCloud sync conflicts.**

All write operations are disabled for safety:
- `create_note` - ❌ Disabled
- `update_note` - ❌ Disabled  
- `duplicate_note` - ❌ Disabled
- `archive_note` - ❌ Disabled
- `trigger_hashtag_parsing` - ❌ Disabled
- `batch_trigger_hashtag_parsing` - ❌ Disabled

**Use Bear's native interface for creating and editing notes.**

## 🚨 Common Issues

### Installation Problems

#### ❌ "command not found: node"
**Symptoms**: Terminal shows "command not found" when running node commands

**Cause**: Node.js not installed or not in PATH

**Solution**:
1. Install Node.js from [nodejs.org](https://nodejs.org/)
2. Restart your terminal
3. Verify installation: `node --version`

**Alternative**: Use Node Version Manager (nvm)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install latest Node.js
nvm install node
nvm use node
```

---

#### ❌ "Cannot find module" errors
**Symptoms**: Errors about missing modules when running the server

**Cause**: Dependencies not installed or corrupted node_modules

**Solution**:
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Verify build works
npm run build
```

**If still failing**:
```bash
# Check npm cache
npm cache clean --force

# Try with different Node version
nvm install 18
nvm use 18
npm install
```

---

#### ❌ "Database not found"
**Symptoms**: Server can't locate Bear database file

**Cause**: Bear not installed, never opened, or database in non-standard location

**Solution**:
1. **Ensure Bear is installed**: Download from Mac App Store
2. **Open Bear at least once**: This creates the database
3. **Verify database exists**:
   ```bash
   ls ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/database.sqlite
   ```

**If database is in different location**:
```bash
# Find Bear database
find ~/Library -name "database.sqlite" -path "*bear*" 2>/dev/null

# Set custom path in environment
export BEAR_DB_PATH="/path/to/your/database.sqlite"
```

---

### Claude Desktop Integration Issues

#### ❌ Claude doesn't recognize MCP server
**Symptoms**: Bear tools not available in Claude Desktop

**Cause**: Configuration errors or Claude Desktop not restarted

**Solution**:
1. **Verify configuration file location**:
   ```bash
   ls ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Check JSON syntax**:
   ```bash
   # Validate JSON syntax
   python -m json.tool ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. **Verify path is correct**:
   ```bash
   # Get full path to your Bear MCP Server
   cd /path/to/Bear && pwd
   ls dist/index.js  # Should exist
   ```

4. **Test server directly**:
   ```bash
   echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js
   ```

5. **Restart Claude Desktop completely**:
   - Quit Claude Desktop
   - Wait 5 seconds
   - Reopen Claude Desktop

**Minimal test configuration**:
```json
{
  "mcpServers": {
    "bear-test": {
      "command": "node",
              "args": ["/full/path/to/bear-notes-mcp/dist/index.js"]
    }
  }
}
```

---

#### ❌ "Permission denied" errors
**Symptoms**: File system access errors

**Cause**: macOS security restrictions

**Solution**:
1. **Grant Claude Desktop file access**:
   - System Preferences → Security & Privacy → Privacy
   - Select "Files and Folders" or "Full Disk Access"
   - Add Claude Desktop

2. **Check file permissions**:
   ```bash
   # Verify database is readable
   ls -la ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/database.sqlite
   
   # Verify Bear MCP Server is executable
   ls -la /path/to/bear-notes-mcp/dist/index.js
   ```

3. **Test with reduced permissions**:
   ```bash
   # Try running server manually
   node /path/to/bear-notes-mcp/dist/index.js
   ```

---

### Tag Validation Issues

#### ❌ "Tag warnings" in responses
**Symptoms**: Responses include `tagWarnings` array with tag modification messages

**Cause**: Tags were automatically sanitized to meet Bear's requirements (this is normal)

**What this means**:
- ✅ **This is expected behavior** - tags are automatically cleaned up
- ✅ **Your tags were created successfully** - just in a Bear-compatible format
- ✅ **No action needed** - the warnings are informational

**Example**:
```json
{
  "noteId": 456,
  "success": true,
  "tagWarnings": [
    "Tag \"Project Alpha\" was sanitized to \"projectalpha\"",
    "Tag \"work meeting\" was sanitized to \"workmeeting\""
  ]
}
```

**Understanding tag sanitization**:
- `Project Alpha` → `projectalpha` (removed spaces, made lowercase)
- `work meeting` → `workmeeting` (removed spaces)
- `tag_name` → `tagname` (removed underscores)
- `project/alpha` → `project/alpha` (✅ forward slashes preserved)

**Best practices**:
- Use the suggested format from warnings for future tags
- Nested tags with forward slashes work perfectly: `work/projects/alpha`
- Keep tags simple: lowercase, no special characters except forward slashes

---

#### ❌ Note titles showing inconsistently
**Symptoms**: Note title in Bear's note list doesn't match the title shown when viewing the note

**Cause**: This was an issue in earlier versions where the database title field didn't match the content title

**Solution**: 
✅ **Fixed in current version** - The server now lets Bear extract titles from content automatically:
- Titles are always embedded as markdown headers (`# Title`) in the note content
- The database title field (`ZTITLE`) is cleared so Bear re-extracts it from content
- This ensures perfect consistency between the note list and note content

**If you have old notes with inconsistent titles**:
1. Update the note (even with a small change) - this will trigger title re-extraction
2. Or restart Bear to refresh the note list display

---

#### ❌ Tags not appearing in Bear sidebar
**Symptoms**: Tags exist in database but don't show in Bear's tag sidebar

**Cause**: Bear needs to reparse the note content to recognize hashtags when notes are created via direct database writes

**Solution**:
1. **Restart Bear** (most reliable solution):
   ```bash
   osascript -e 'tell application "Bear" to quit'
   # Wait a moment
   open -a Bear
   ```
   Bear will automatically parse all hashtags when it starts.

2. **Use the hashtag parsing trigger** (Bear must be running):
   ```
   "Trigger hashtag parsing for note titled 'My Note'"
   ```

3. **Manual trigger**:
   - Open the note in Bear
   - Make a small edit (add a space)
   - Delete the space
   - Bear will reparse the hashtags

**Why this happens**:
- When Bear is closed, we write directly to the database for safety
- Bear parses hashtags when it starts or when content is edited
- This is normal behavior - tags will appear after Bear restart

**Best practice**: After creating/updating notes, restart Bear to see all tags in the sidebar.

---

### Runtime Issues

#### ❌ "Bear is currently running" warnings
**Symptoms**: Write operations blocked with Bear running message

**Cause**: Bear app is open (this is intentional safety feature)

**Solution**:
This is **expected behavior** for safety:
1. **For read operations**: Continue normally (Bear can be running)
2. **For write operations**: 
   - Quit Bear completely
   - Perform write operations
   - Reopen Bear

**To quit Bear properly**:
```bash
# Quit Bear gracefully
osascript -e 'tell application "Bear" to quit'

# Force quit if needed
pkill -f "Bear"

# Verify no Bear processes
ps aux | grep -i bear | grep -v grep
```

---

#### ❌ Slow performance
**Symptoms**: Long response times, timeouts

**Cause**: Large database, inefficient queries, or system resources

**Solution**:
1. **Use pagination**:
   ```
   Instead of: "Show me all my notes"
   Try: "Show me my first 20 notes"
   ```

2. **Use specific filters**:
   ```
   Instead of: "Search for notes"
   Try: "Search for notes tagged 'work' created this month"
   ```

3. **Check database size**:
   ```bash
   ls -lh ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/database.sqlite
   ```

4. **Monitor system resources**:
   ```bash
   # Check memory usage
   top -pid $(pgrep -f "node.*Bear")
   
   # Check disk I/O
   iostat 1 5
   ```

5. **Enable debug logging**:
   ```bash
   NODE_ENV=development node dist/index.js
   ```

---

#### ❌ Memory issues or crashes
**Symptoms**: Server crashes, out of memory errors

**Cause**: Large result sets, memory leaks, or insufficient system memory

**Solution**:
1. **Reduce query scope**:
   ```
   # Use smaller limits
   "Show me 10 recent notes" instead of "Show me all notes"
   ```

2. **Check memory usage**:
   ```bash
   # Monitor Node.js memory
   node --max-old-space-size=4096 dist/index.js
   ```

3. **Restart server periodically**:
   ```bash
   # Kill and restart server
   pkill -f "node dist/index.js"
   node dist/index.js &
   ```

4. **Check for memory leaks**:
   ```bash
   # Enable memory debugging
   node --inspect dist/index.js
   ```

---

### Data Issues

#### ❌ Unexpected search results
**Symptoms**: Search returns wrong or irrelevant notes

**Cause**: Unclear search terms, encoding issues, or data corruption

**Solution**:
1. **Use more specific terms**:
   ```
   Instead of: "find notes about work"
   Try: "find notes tagged 'work' containing 'project'"
   ```

2. **Check for encoding issues**:
   ```bash
   # Verify database encoding
   file ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/database.sqlite
   ```

3. **Test with known content**:
   ```
   "Find note with exact title 'Known Note Title'"
   ```

4. **Check database integrity**:
   ```bash
   sqlite3 ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/database.sqlite "PRAGMA integrity_check;"
   ```

---

#### ❌ Missing notes or tags
**Symptoms**: Expected notes or tags don't appear in results

**Cause**: Filters excluding results, case sensitivity, or data issues

**Solution**:
1. **Check filters**:
   ```
   # Include all statuses
   "Show me all notes including trashed and archived"
   ```

2. **Verify case sensitivity**:
   ```
   # Try different cases
   "Find notes tagged 'Work'" vs "Find notes tagged 'work'"
   ```

3. **Check note status**:
   ```
   "Show me database statistics" # Check total counts
   "Find note by exact title including trashed notes"
   ```

4. **Verify database state**:
   ```bash
   # Count notes directly
   sqlite3 ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/database.sqlite "SELECT COUNT(*) FROM ZSFNOTE;"
   ```

---

## 🔧 Debugging Tools

### Enable Debug Logging
```bash
# Set debug environment
export NODE_ENV=development

# Run with debug output
node dist/index.js
```

### Test Server Directly
```bash
# Test tool listing
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js

# Test simple query
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_database_stats", "arguments": {}}}' | node dist/index.js
```

### Check Database Health
```bash
# SQLite integrity check
sqlite3 ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/database.sqlite "PRAGMA integrity_check;"

# Count records
sqlite3 ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/database.sqlite "SELECT 'Notes:', COUNT(*) FROM ZSFNOTE UNION SELECT 'Tags:', COUNT(*) FROM ZSFNOTETAG;"
```

### Monitor System Resources
```bash
# CPU and memory usage
top -pid $(pgrep -f "node.*Bear")

# Disk I/O
iostat -d 1 5

# Network connections
lsof -p $(pgrep -f "node.*Bear")
```

---

## 🆘 Recovery Procedures

### Restore from Backup
If write operations cause issues:

1. **Find latest backup**:
   ```bash
   ls -lt ~/Documents/Bear\ MCP\ Backups/
   ```

2. **Stop Bear and server**:
   ```bash
   pkill -f "Bear"
   pkill -f "node dist/index.js"
   ```

3. **Restore database**:
   ```bash
   cp ~/Documents/Bear\ MCP\ Backups/backup_YYYYMMDD_HHMMSS.sqlite ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/database.sqlite
   ```

4. **Restart Bear**:
   ```bash
   open -a Bear
   ```

### Reset Configuration
If Claude Desktop integration fails:

1. **Backup current config**:
   ```bash
   cp ~/Library/Application\ Support/Claude/claude_desktop_config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup
   ```

2. **Create minimal config**:
   ```json
   {
     "mcpServers": {
       "bear": {
         "command": "node",
         "args": ["/full/path/to/bear-notes-mcp/dist/index.js"]
       }
     }
   }
   ```

3. **Restart Claude Desktop**

### Reinstall Server
If server is corrupted:

1. **Backup any custom configurations**
2. **Remove current installation**:
   ```bash
   rm -rf /path/to/Bear
   ```

3. **Fresh installation**:
   ```bash
   git clone <repository-url>
   cd bear-notes-mcp
   npm install
   npm run build
   ```

4. **Update Claude Desktop configuration**

---

## 📞 Getting Help

### Self-Diagnosis Checklist
Before seeking help, try these steps:

- [ ] Node.js version 18+ installed
- [ ] Bear app installed and opened at least once
- [ ] Database file exists and is readable
- [ ] Bear MCP Server builds without errors
- [ ] Claude Desktop configuration is valid JSON
- [ ] Claude Desktop has been restarted
- [ ] Server responds to direct testing

### Collect Debug Information
When reporting issues, include:

1. **System information**:
   ```bash
   uname -a
   node --version
   npm --version
   ```

2. **Bear information**:
   ```bash
   ls -la ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/
   ```

3. **Server logs**:
   ```bash
   NODE_ENV=development node dist/index.js 2>&1 | head -50
   ```

4. **Configuration**:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

### Community Resources
- **Documentation**: Check all files in `docs/` directory
- **GitHub Issues**: Search existing issues before creating new ones
- **Discussions**: Community help and feature requests

### Emergency Contacts
- **Critical bugs**: Create GitHub issue with "bug" label
- **Security issues**: Report privately via GitHub security advisories
- **Data loss**: Include backup information and steps to reproduce

---

**Remember**: The Bear MCP Server includes comprehensive safety features. Most issues can be resolved without data loss by following the procedures in this guide. 