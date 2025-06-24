# Installation Guide

Complete step-by-step installation guide for the Bear MCP Server.

## 📋 Prerequisites

### Required Software
- **macOS** (Bear is macOS-only)
- **Bear app** - Install from Mac App Store and open at least once
- **Claude Desktop** - Download from [Claude.ai](https://claude.ai/download)
- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)

### Verify Prerequisites
```bash
# Check Node.js version
node --version  # Should be 18.0.0 or higher

# Check if Bear database exists
ls ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/database.sqlite
```

## 🚀 Installation Steps

### Step 1: Get the Bear MCP Server

**Option A: Clone from repository (recommended for development)**
```bash
git clone <repository-url>
cd bear-notes-mcp
```

**Option B: Download release (coming soon)**
```bash
# Download and extract the latest release
curl -L <release-url> -o bear-notes-mcp.zip
unzip bear-notes-mcp.zip
cd bear-notes-mcp
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build the Server
```bash
npm run build
```

### Step 4: Test the Installation
```bash
# Test basic functionality
node dist/index.js --help

# Test database connection (read-only)
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js
```

### Step 5: Configure Claude Desktop

1. **Find Claude Desktop config file:**
```bash
# Create config directory if it doesn't exist
mkdir -p ~/Library/Application\ Support/Claude

# Edit the configuration file
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

2. **Add Bear MCP Server configuration:**
```json
{
  "mcpServers": {
    "bear": {
      "command": "node",
      "args": ["/full/path/to/bear-notes-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

**⚠️ Important:** Replace `/full/path/to/bear-notes-mcp/` with the actual path to your installation.

3. **Find your installation path:**
```bash
pwd  # Run this in your Bear directory to get the full path
```

### Step 6: Restart Claude Desktop
- Quit Claude Desktop completely
- Reopen Claude Desktop
- The Bear MCP Server should now be available

## ✅ Verification

### Test Basic Functionality
Ask Claude any of these questions to verify the installation:

```
"What Bear notes do I have?"
"Show me my Bear database statistics"
"List my Bear tags"
```

### Expected Response
Claude should respond with information about your Bear notes, confirming the MCP server is working.

## 🔧 Configuration Options

### Environment Variables

Create a `.env` file in your Bear MCP Server directory:

```bash
# Optional: Override default database location
BEAR_DB_PATH="/path/to/custom/bear/database.sqlite"

# Optional: Override backup directory
BEAR_BACKUP_DIR="/path/to/custom/backup/directory"

# Optional: Enable debug logging
NODE_ENV=development
```

### Advanced Claude Desktop Configuration

```json
{
  "mcpServers": {
    "bear": {
      "command": "node",
              "args": ["/path/to/bear-notes-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "BEAR_BACKUP_DIR": "/Users/yourname/Documents/Bear-Backups"
      }
    }
  }
}
```

## 🛠 Development Setup

### For Contributors

1. **Clone the repository:**
```bash
git clone <repository-url>
cd bear-notes-mcp
```

2. **Install development dependencies:**
```bash
npm install
```

3. **Run in development mode:**
```bash
npm run dev  # Auto-rebuilds on changes
```

4. **Run tests:**
```bash
npm test
```

### Development Configuration

For development, use this Claude Desktop configuration:

```json
{
  "mcpServers": {
    "bear-dev": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/path/to/bear-notes-mcp",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## 🔍 Troubleshooting Installation

### Common Issues

**❌ "command not found: node"**
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Restart your terminal after installation

**❌ "Cannot find module" errors**
- Run `npm install` in the Bear directory
- Ensure you're in the correct directory

**❌ "Database not found"**
- Open Bear app at least once to create the database
- Verify the database path exists:
  ```bash
  ls ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/
  ```

**❌ "Permission denied"**
- Ensure Claude Desktop has file system access permissions
- Check macOS Privacy & Security settings

**❌ Claude doesn't recognize the MCP server**
- Verify the JSON configuration syntax is correct
- Check the full path to `dist/index.js` is correct
- Restart Claude Desktop completely
- Check Claude Desktop logs for errors

**❌ "Bear is currently running" warnings**
- This is expected for write operations
- Quit Bear before creating or editing notes
- Read operations work fine with Bear running

### Getting Help

1. **Check logs:**
```bash
# Enable debug logging
NODE_ENV=development node dist/index.js
```

2. **Verify configuration:**
```bash
# Test MCP server directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js
```

3. **Check Claude Desktop logs:**
   - Look in Console app for Claude Desktop errors
   - Check for MCP-related error messages

4. **Test with minimal configuration:**
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

## 🔄 Updating

### Update the Server
```bash
cd /path/to/Bear
git pull  # or download new release
npm install
npm run build
```

### Update Configuration
- Check for new configuration options in release notes
- Update your `claude_desktop_config.json` if needed
- Restart Claude Desktop after updates

## 🗑 Uninstallation

### Remove from Claude Desktop
1. Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Remove the "bear" entry from mcpServers
3. Restart Claude Desktop

### Remove Files
```bash
# Remove the Bear MCP Server directory
rm -rf /path/to/Bear

# Remove backups (optional)
rm -rf ~/Documents/Bear\ MCP\ Backups
```

## 📞 Support

- **Documentation**: Check [docs/](../docs/) directory
- **Issues**: Report bugs via GitHub issues
- **Discussions**: Community discussions via GitHub
- **Security**: Report security issues privately

---

**Next Steps**: Check out the [Usage Examples](examples.md) to learn how to use all 30 tools effectively! 