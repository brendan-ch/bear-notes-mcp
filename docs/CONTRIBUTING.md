# Contributing to Bear MCP Server

Thank you for your interest in contributing! This guide will help you get started with development and contributions.

## 🚀 Quick Start for Developers

### Prerequisites
- **macOS** with Bear app installed
- **Node.js 18+** 
- **Git**
- **Claude Desktop** (for testing)
- **SQLite3** command-line tools

### Development Setup

1. **Fork and clone the repository**:
```bash
git clone https://github.com/your-username/bear-notes-mcp.git
cd bear-notes-mcp
```

2. **Install dependencies**:
```bash
npm install
```

3. **Build the project**:
```bash
npm run build
```

4. **Run in development mode**:
```bash
npm run dev  # Auto-rebuilds on changes
```

5. **Test the server**:
```bash
# Test basic functionality
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js

# Run test suite
npm test
```

## 📁 Project Structure

```
bear-notes-mcp/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── services/
│   │   └── bear-service.ts # Main service layer
│   ├── types/
│   │   └── bear.ts        # TypeScript interfaces
│   └── utils/
│       └── database.ts    # Database utilities
├── docs/                  # Documentation
├── tests/                 # Test files
├── dist/                  # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

### Key Components

#### `src/index.ts`
- MCP server implementation
- Tool registration and routing
- Error handling and protocol compliance

#### `src/services/bear-service.ts`
- Core business logic
- Database operations
- Safety checks and validation

#### `src/types/bear.ts`
- TypeScript interfaces for Bear database entities
- Type definitions for API responses
- Utility types and constants

#### `src/utils/database.ts`
- Database connection management
- Core Data utilities
- Backup and safety operations

## 🛠 Development Workflow

### Making Changes

1. **Create a feature branch**:
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** following the coding standards

3. **Test your changes**:
```bash
npm run build
npm test
```

4. **Test with Claude Desktop**:
```bash
# Update your Claude Desktop config to point to development build
{
  "mcpServers": {
    "bear-dev": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/path/to/bear-notes-mcp",
      "env": {"NODE_ENV": "development"}
    }
  }
}
```

5. **Commit your changes**:
```bash
git add .
git commit -m "feat: add new feature description"
```

6. **Push and create pull request**:
```bash
git push origin feature/your-feature-name
```

### Coding Standards

#### TypeScript Style
- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

```typescript
/**
 * Get notes with advanced filtering options
 * @param options - Filtering and sorting options
 * @returns Promise resolving to array of notes with tags
 */
async getNotesAdvanced(options: AdvancedSearchOptions = {}): Promise<NoteWithTags[]> {
  // Implementation
}
```

#### Error Handling
- Use custom error classes for different error types
- Provide meaningful error messages
- Include context information for debugging

```typescript
if (!noteId) {
  throw new BearDatabaseError(
    'Note ID is required',
    'INVALID_PARAMETER',
    { parameter: 'noteId', value: noteId }
  );
}
```

#### Database Safety
- Always use read-only connections for read operations
- Check Bear process status before write operations
- Create backups before any write operation
- Validate all inputs thoroughly

```typescript
// Always check Bear is not running for write operations
if (await this.isBearRunning()) {
  throw new BearSafetyError('Bear is currently running. Please quit Bear before performing write operations.');
}

// Create backup before write operations
const backupPath = await this.createBackup();
```

### Testing

#### Unit Tests
Create tests for new functionality:

```typescript
// tests/bear-service.test.ts
describe('BearService', () => {
  it('should get database statistics', async () => {
    const service = new BearService();
    const stats = await service.getDatabaseStats();
    
    expect(stats.totalNotes).toBeGreaterThan(0);
    expect(stats.activeNotes).toBeLessThanOrEqual(stats.totalNotes);
  });
});
```

#### Integration Tests
Test with real Bear database:

```typescript
// tests/integration.test.ts
describe('Integration Tests', () => {
  it('should create and retrieve note', async () => {
    const service = new BearService();
    
    // Create test note
    const result = await service.createNote({
      title: 'Test Note',
      content: 'Test content',
      tags: ['test']
    });
    
    // Verify creation
    const note = await service.getNoteById(result.noteId);
    expect(note?.ZTITLE).toBe('Test Note');
    
    // Cleanup
    await service.archiveNote(result.noteId, true);
  });
});
```

#### Manual Testing
Always test with Claude Desktop:

1. Build and start development server
2. Update Claude Desktop configuration
3. Test new functionality through Claude interface
4. Verify error handling and edge cases

## 🔧 Adding New Features

### Adding a New MCP Tool

1. **Define the tool in `src/index.ts`**:
```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ... existing tools
      {
        name: "your_new_tool",
        description: "Description of what your tool does",
        inputSchema: {
          type: "object",
          properties: {
            parameter1: {
              type: "string",
              description: "Description of parameter1"
            }
          },
          required: ["parameter1"]
        }
      }
    ]
  };
});
```

2. **Add the tool handler**:
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    // ... existing cases
    case "your_new_tool":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(await bearService.yourNewMethod(args), null, 2)
          }
        ]
      };
  }
});
```

3. **Implement the method in `BearService`**:
```typescript
/**
 * Your new method description
 */
async yourNewMethod(options: YourOptionsType): Promise<YourReturnType> {
  await this.database.connect(true); // Read-only for read operations
  
  try {
    // Implementation
    const result = await this.database.query(sql, params);
    return result;
  } finally {
    await this.database.disconnect();
  }
}
```

4. **Add TypeScript types**:
```typescript
// src/types/bear.ts
export interface YourOptionsType {
  parameter1: string;
  parameter2?: number;
}

export interface YourReturnType {
  // Define return structure
}
```

5. **Write tests**:
```typescript
describe('yourNewMethod', () => {
  it('should handle valid input', async () => {
    const service = new BearService();
    const result = await service.yourNewMethod({ parameter1: 'test' });
    expect(result).toBeDefined();
  });
});
```

6. **Update documentation**:
- Add to API reference
- Include usage examples
- Update README if needed

### Database Schema Changes

If Bear updates its schema:

1. **Analyze new schema**:
```bash
sqlite3 ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/database.sqlite ".schema"
```

2. **Update TypeScript interfaces** in `src/types/bear.ts`

3. **Update queries** in `src/services/bear-service.ts`

4. **Test with both old and new Bear versions** if possible

5. **Update documentation** with schema changes

## 🐛 Bug Fixes

### Reporting Bugs
When reporting bugs, include:

1. **Environment information**:
   - macOS version
   - Bear version
   - Node.js version
   - Bear MCP Server version

2. **Steps to reproduce**

3. **Expected vs actual behavior**

4. **Logs and error messages**:
```bash
NODE_ENV=development node dist/index.js 2>&1 | head -50
```

### Fixing Bugs

1. **Create a test that reproduces the bug**

2. **Fix the issue** following coding standards

3. **Verify the test passes**

4. **Test edge cases** and related functionality

5. **Update documentation** if behavior changes

## 📚 Documentation

### Code Documentation
- Use JSDoc for all public methods
- Include parameter descriptions and types
- Document complex algorithms and business logic
- Add examples for non-obvious usage

### User Documentation
When adding features, update:
- `README.md` - Overview and quick start
- `docs/api-reference.md` - Detailed API documentation
- `docs/examples.md` - Usage examples
- `docs/troubleshooting.md` - Known issues and solutions

## 🔒 Security Considerations

### Database Access
- Never expose raw SQL queries to users
- Validate all inputs thoroughly
- Use parameterized queries to prevent injection
- Limit database access to necessary operations

### File System Access
- Restrict access to Bear database directory only
- Validate file paths to prevent directory traversal
- Use appropriate file permissions

### Error Handling
- Don't expose sensitive information in error messages
- Log security-relevant events
- Fail securely (deny by default)

## 🚀 Release Process

### Version Numbering
Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version number bumped
- [ ] Changelog updated
- [ ] Security review completed
- [ ] Performance impact assessed

### Creating a Release
1. **Update version**:
```bash
npm version major|minor|patch
```

2. **Update CHANGELOG.md**

3. **Create release PR**

4. **Tag release** after merge:
```bash
git tag v1.2.3
git push origin v1.2.3
```

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Help others learn and contribute
- Focus on constructive feedback
- Celebrate contributions of all sizes

### Pull Request Guidelines
- Keep PRs focused and atomic
- Write clear commit messages
- Include tests for new functionality
- Update documentation as needed
- Respond to review feedback promptly

### Issue Guidelines
- Use issue templates when available
- Provide detailed reproduction steps
- Search existing issues before creating new ones
- Use appropriate labels and milestones

## 📞 Getting Help

### Development Questions
- Check existing documentation first
- Search GitHub issues and discussions
- Join community discussions
- Ask specific, detailed questions

### Technical Support
- Use GitHub issues for bugs
- Use discussions for feature requests
- Include debug information
- Be patient and respectful

---

**Thank you for contributing to the Bear MCP Server!** Your contributions help make Bear more powerful and accessible for everyone. 