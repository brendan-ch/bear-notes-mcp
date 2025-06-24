# Bear MCP Server - NPM Package

## Global Installation
```bash
npm install -g bear-mcp-server
```

## Usage
After global installation, you can start the server from anywhere:
```bash
bear-mcp-server
```

## Configuration
The server will automatically look for Bear's database at the standard location:
`~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite`

For custom configuration, create a config file:
```bash
# In your home directory
echo '{"database": {"path": "/custom/path/to/bear.db"}}' > ~/.bear-mcp-config.json
```

## MCP Client Integration
Add to your MCP client configuration:
```json
{
  "mcpServers": {
    "bear": {
      "command": "bear-mcp-server",
      "args": []
    }
  }
}
```

See README.md for detailed configuration options and troubleshooting.
