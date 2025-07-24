# Bear MCP Server - Simple Setup

Connect Claude Desktop to your Bear notes with this standalone MCP server.

## Quick Setup

### 1. Build the Server
```bash
npm install
npm run build
```

### 2. Configure Claude Desktop

Add this to your Claude Desktop config file:
**Location:** `~/Library/Application Support/Claude/claude_desktop_config.json`

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

**⚠️ Important:** Replace `/path/to/bear-notes-mcp` with your actual installation path.

### 3. Grant Permissions

1. Open **System Preferences** → **Privacy & Security** → **Full Disk Access**
2. Click **"+"** and add **Claude Desktop**  
3. Enable the checkbox
4. **Restart Claude Desktop**

### 4. Test

Ask Claude about your Bear notes - it should work!

## Why No DXT Package?

We removed the DXT packaging approach because:
- ❌ Complex permission handling
- ❌ Installation issues  
- ❌ Packaging errors
- ❌ Claude Desktop compatibility problems

The standalone approach is:
- ✅ Simple and reliable
- ✅ Standard MCP server pattern
- ✅ Direct file system access
- ✅ Easy to debug and maintain

## Troubleshooting

**Server won't connect:**
- Check the file path in your configuration
- Ensure Claude Desktop has Full Disk Access
- Restart Claude Desktop after changes

**Permission errors:**
- The server will guide you through permission setup
- Follow the on-screen instructions