# Bear Notes MCP Server - Setup Guide

Connect Claude to your Bear notes with this standalone MCP server.

## 🚀 Quick Setup

### 1. Copy Configuration
Copy the configuration from `claude_desktop_config.json` to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "bear-notes": {
      "command": "node",
      "args": ["/path/to/bear-notes-mcp/dist/index.js"],
      "env": {
        "BEAR_DB_PATH": "~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### 2. Update Path
Replace `/path/to/bear-notes-mcp/dist/index.js` with your actual installation path.

### 3. Restart Claude Desktop
Restart Claude Desktop to load the new configuration.

## 📁 Files in This Folder

- **`claude_desktop_config.json`** - Ready-to-use configuration
- **`INSTALLATION.md`** - Detailed installation guide  
- **`SETUP.md`** - Quick setup reference

## ✅ Why Standalone MCP Server?

- **Simple and reliable** - No permission complexity
- **Direct file system access** - Works with standard macOS permissions
- **Full control** - Customize environment variables and paths
- **Universal compatibility** - Works with any MCP client
- **Proven approach** - Standard MCP server deployment method

## 🔧 Customization

Edit the `env` section to customize behavior:

```json
"env": {
  "BEAR_DB_PATH": "~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite",
  "BACKUP_DIR": "~/Documents/MyBearBackups",
  "LOG_LEVEL": "debug"
}
```

## 🆘 Need Help?

- **Installation Guide**: `INSTALLATION.md`
- **Troubleshooting**: Check the main `docs/` folder
- **Issues**: https://github.com/bejaminjones/bear-notes-mcp/issues