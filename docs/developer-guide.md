# Developer Guide

This guide provides comprehensive information for developers working with the Bear MCP Server's refactored architecture.

## 🚀 **Getting Started**

### **Development Setup**

1. **Prerequisites**
   ```bash
   # Required
   node --version  # v18+ required
   npm --version   # v8+ required
   
   # macOS specific
   xcode-select --install  # For native modules
   ```

2. **Project Setup**
   ```bash
   git clone <repository-url>
   cd bear-notes-mcp
   npm install
   npm run build
   ```

3. **Development Environment**
   ```bash
   # Copy environment template
   cp env.example .env
   
   # Edit configuration as needed
   vim .env
   ```

4. **Running Tests**
   ```bash
   # Run all tests
   npm test
   
   # Run with coverage
   npm run test:coverage
   
   # Run specific test suite
   npm test -- --testNamePattern="DatabaseService"
   
   # Watch mode for development
   npm run test:watch
   ```

5. **Development Server**
   ```bash
   # Build and run in development mode
   npm run dev
   
   # Build for production
   npm run build
   
   # Run production build
   npm start
   ```

## 🏗️ **Architecture Deep Dive**

### **Service-Oriented Architecture**

The system is built around **7 core services** with clear separation of concerns:

```typescript
// Service dependency graph
ServiceContainer
├── DatabaseService      (foundation)
├── CacheService        (performance)
├── LoggingService      (observability)
├── HealthService       (monitoring)
├── ValidationService   (data integrity)
├── NoteService         (business logic)
├── SearchService       (discovery)
└── TagService          (organization)
```

### **Dependency Injection Pattern**

All services use dependency injection for testability and flexibility:

```typescript
// Service registration in bootstrap.ts
export function bootstrapServices(config: Config): IServiceContainer {
  const container = new ServiceContainer();
  
  // Infrastructure services
  container.registerSingleton('database', () => new DatabaseService(config.database));
  container.registerSingleton('cache', () => new CacheService(config.cache));
  container.registerSingleton('logging', () => new LoggingService(config.logging));
  
  // Business services with dependencies
  container.registerSingleton('notes', () => new NoteService(
    container.resolve('database'),
    container.resolve('cache'),
    container.resolve('logging')
  ));
  
  return container;
}
```

### **Interface-First Development**

Every service implements a well-defined interface:

```typescript
// Example: Adding a new method to NoteService
interface INoteService {
  // Existing methods...
  
  // New method - add to interface first
  exportNote(noteId: number, format: 'markdown' | 'html' | 'pdf'): Promise<ExportResult>;
}

// Then implement in service
class NoteService implements INoteService {
  async exportNote(noteId: number, format: ExportFormat): Promise<ExportResult> {
    // Implementation with error handling, logging, caching
  }
}
```

## 🔧 **Development Patterns**

### **Error Handling Pattern**

Consistent error handling across all services:

```typescript
import { BearError, ErrorCode } from '../types/errors.js';

class MyService {
  async doSomething(param: string): Promise<Result> {
    try {
      // Validate input
      if (!param) {
        throw new BearError('Parameter required', ErrorCode.VALIDATION_ERROR);
      }
      
      // Log operation start
      const timer = this.logger.startTimer('doSomething');
      
      // Perform operation
      const result = await this.performOperation(param);
      
      // Log success
      timer();
      this.logger.info('Operation completed', { param, resultCount: result.length });
      
      return result;
      
    } catch (error) {
      // Log error with context
      this.logger.error('Operation failed', error, { param });
      
      // Re-throw as BearError if not already
      if (error instanceof BearError) {
        throw error;
      }
      throw new BearError('Operation failed', ErrorCode.INTERNAL_ERROR, error);
    }
  }
}
```

### **Caching Pattern**

Consistent caching across services:

```typescript
class SearchService {
  async searchNotes(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // Generate cache key
    const cacheKey = `search:${this.hashQuery(query, options)}`;
    
    // Try cache first
    const cached = await this.cache.get<SearchResult[]>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for search', { query, cacheKey });
      return cached;
    }
    
    // Perform search
    const results = await this.performSearch(query, options);
    
    // Cache results with TTL
    await this.cache.set(cacheKey, results, 300); // 5 minutes
    
    return results;
  }
}
```

### **Testing Pattern**

Comprehensive testing with mocking:

```typescript
// tests/unit/note-service.test.ts
import { NoteService } from '../../src/services/note-service.js';
import { createMockDatabaseService, createMockCacheService, createMockLogger } from '../utils/test-helpers.js';

describe('NoteService', () => {
  let noteService: NoteService;
  let mockDatabase: jest.Mocked<IDatabaseService>;
  let mockCache: jest.Mocked<ICacheService>;
  let mockLogger: jest.Mocked<ILoggingService>;

  beforeEach(() => {
    mockDatabase = createMockDatabaseService();
    mockCache = createMockCacheService();
    mockLogger = createMockLogger();
    
    noteService = new NoteService(mockDatabase, mockCache, mockLogger);
  });

  describe('getNoteById', () => {
    it('should return note when found', async () => {
      // Arrange
      const noteId = 123;
      const expectedNote = { id: noteId, title: 'Test Note' };
      mockDatabase.queryOne.mockResolvedValue(expectedNote);

      // Act
      const result = await noteService.getNoteById(noteId);

      // Assert
      expect(result).toEqual(expectedNote);
      expect(mockDatabase.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        { id: noteId }
      );
    });

    it('should handle not found gracefully', async () => {
      // Arrange
      mockDatabase.queryOne.mockResolvedValue(null);

      // Act
      const result = await noteService.getNoteById(999);

      // Assert
      expect(result).toBeNull();
    });
  });
});
```

## 📝 **Adding New Features**

### **Step 1: Define Interface**

Add method to appropriate service interface:

```typescript
// src/services/interfaces/index.ts
export interface INoteService {
  // ... existing methods
  
  /**
   * Export note in specified format
   * @param noteId - Note ID to export
   * @param format - Export format
   * @returns Export result with file path or content
   */
  exportNote(noteId: number, format: 'markdown' | 'html' | 'pdf'): Promise<{
    success: boolean;
    filePath?: string;
    content?: string;
    error?: string;
  }>;
}
```

### **Step 2: Implement Service Method**

Add implementation with full error handling:

```typescript
// src/services/note-service.ts
export class NoteService implements INoteService {
  async exportNote(noteId: number, format: ExportFormat): Promise<ExportResult> {
    const timer = this.logger.startTimer('exportNote');
    
    try {
      // Validate input
      if (!noteId || noteId <= 0) {
        throw new BearError('Invalid note ID', ErrorCode.VALIDATION_ERROR);
      }
      
      // Get note
      const note = await this.getNoteById(noteId);
      if (!note) {
        throw new BearError('Note not found', ErrorCode.NOT_FOUND);
      }
      
      // Export based on format
      let result: ExportResult;
      switch (format) {
        case 'markdown':
          result = await this.exportToMarkdown(note);
          break;
        case 'html':
          result = await this.exportToHtml(note);
          break;
        case 'pdf':
          result = await this.exportToPdf(note);
          break;
        default:
          throw new BearError('Unsupported format', ErrorCode.VALIDATION_ERROR);
      }
      
      timer();
      this.logger.info('Note exported successfully', { 
        noteId, 
        format, 
        success: result.success 
      });
      
      return result;
      
    } catch (error) {
      timer();
      this.logger.error('Note export failed', error, { noteId, format });
      throw error;
    }
  }
}
```

### **Step 3: Add MCP Handler**

Register the new functionality in the MCP server:

```typescript
// src/index.ts
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ... existing tools
      {
        name: 'export_note',
        description: 'Export a note in the specified format',
        inputSchema: {
          type: 'object',
          properties: {
            noteId: { type: 'number', description: 'Note ID to export' },
            format: { 
              type: 'string', 
              enum: ['markdown', 'html', 'pdf'],
              description: 'Export format' 
            }
          },
          required: ['noteId', 'format']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    // ... existing cases
    
    case 'export_note': {
      const { noteId, format } = args as { noteId: number; format: ExportFormat };
      const result = await noteService.exportNote(noteId, format);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  }
});
```

### **Step 4: Write Tests**

Create comprehensive tests:

```typescript
// tests/unit/note-service.test.ts
describe('exportNote', () => {
  it('should export note to markdown', async () => {
    // Arrange
    const noteId = 123;
    const note = { id: noteId, title: 'Test', content: '# Test Note' };
    mockDatabase.queryOne.mockResolvedValue(note);

    // Act
    const result = await noteService.exportNote(noteId, 'markdown');

    // Assert
    expect(result.success).toBe(true);
    expect(result.content).toContain('# Test Note');
  });

  it('should handle invalid note ID', async () => {
    // Act & Assert
    await expect(noteService.exportNote(-1, 'markdown'))
      .rejects.toThrow('Invalid note ID');
  });

  it('should handle note not found', async () => {
    // Arrange
    mockDatabase.queryOne.mockResolvedValue(null);

    // Act & Assert
    await expect(noteService.exportNote(999, 'markdown'))
      .rejects.toThrow('Note not found');
  });
});
```

### **Step 5: Update Documentation**

Add to API reference and examples:

```markdown
# docs/api-reference.md

### `export_note`
Export a note in the specified format.

**Parameters:**
- `noteId` (number, required): Note ID to export
- `format` (string, required): Export format ('markdown', 'html', 'pdf')

**Returns:**
```json
{
  "success": true,
  "filePath": "/path/to/exported/file.md",
  "content": "# Exported content..."
}
```

**Example:**
```
"Export note 123 as markdown"
```
```

## 🧪 **Testing Strategy**

### **Test Structure**

```
tests/
├── unit/                 # Unit tests for individual services
│   ├── database-service.test.ts
│   ├── note-service.test.ts
│   └── search-service.test.ts
├── integration/          # Integration tests for workflows
│   ├── bear-service.test.ts
│   └── end-to-end.test.ts
├── fixtures/            # Test data and fixtures
│   └── bear-data.ts
├── utils/               # Test utilities and helpers
│   └── test-helpers.ts
└── setup.ts            # Global test setup
```

### **Test Utilities**

```typescript
// tests/utils/test-helpers.ts
export function createMockDatabaseService(): jest.Mocked<IDatabaseService> {
  return {
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
    query: jest.fn(),
    queryOne: jest.fn(),
    getDatabaseStats: jest.fn(),
    checkIntegrity: jest.fn().mockResolvedValue(true),
    verifyAccess: jest.fn(),
    createBackup: jest.fn(),
    isBearRunning: jest.fn().mockResolvedValue(false)
  };
}

export function createTestNote(overrides: Partial<BearNote> = {}): BearNote {
  return {
    id: 1,
    title: 'Test Note',
    content: 'Test content',
    created: new Date(),
    modified: new Date(),
    archived: false,
    trashed: false,
    pinned: false,
    encrypted: false,
    ...overrides
  };
}
```

### **Running Tests**

```bash
# All tests
npm test

# Specific test file
npm test -- note-service.test.ts

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Debug mode
npm test -- --verbose --no-cache
```

## 🔍 **Debugging**

### **Logging Configuration**

```typescript
// Development logging
const config = {
  logging: {
    level: 'debug',
    console: true,
    file: './logs/bear-mcp.log',
    format: 'pretty' // or 'json' for production
  }
};
```

### **Debug Patterns**

1. **Service-level debugging**:
   ```typescript
   const childLogger = this.logger.child({ service: 'NoteService', method: 'getNotes' });
   childLogger.debug('Starting note retrieval', { options });
   ```

2. **Performance debugging**:
   ```typescript
   const timer = this.logger.startTimer('database-query');
   const result = await this.database.query(sql, params);
   timer(); // Logs execution time
   ```

3. **Error context**:
   ```typescript
   this.logger.error('Database query failed', error, {
     sql: sql.substring(0, 100),
     params,
     connectionStatus: this.database.isConnected()
   });
   ```

### **Common Debug Scenarios**

1. **Database Connection Issues**:
   ```bash
   # Check Bear database path
   ls -la ~/Library/Group\ Containers/9K33E3U3T4.net.shinyfrog.bear/Application\ Data/
   
   # Verify permissions
   sqlite3 database.sqlite ".schema" 
   ```

2. **Bear API Issues**:
   ```bash
   # Check if Bear is running
   ps aux | grep Bear
   
   # Test x-callback-url manually
   open "bear://x-callback-url/ping"
   ```

3. **Performance Issues**:
   ```typescript
   // Enable query logging
   const result = await this.database.query(sql, params);
   this.logger.debug('Query executed', { 
     sql, 
     params, 
     rowCount: result.length,
     executionTime: Date.now() - startTime 
   });
   ```

## 🚀 **Deployment**

### **Build Process**

```bash
# Clean build
npm run clean
npm run build

# Verify build
node dist/index.js --version
```

### **Environment Configuration**

```bash
# Production environment
NODE_ENV=production
BEAR_DB_PATH=/path/to/bear/database.sqlite
LOG_LEVEL=info
CACHE_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

### **Production Considerations**

1. **Resource Limits**:
   - Memory: ~100MB baseline
   - CPU: Low usage except during large operations
   - Disk: Log rotation and cache cleanup

2. **Monitoring**:
   - Health check endpoint
   - Performance metrics logging
   - Error rate monitoring

3. **Backup Strategy**:
   - Automatic database backups before major operations
   - Log file rotation and archival
   - Configuration backup

This developer guide provides the foundation for working with the refactored Bear MCP Server architecture. The service-oriented design makes it easy to extend, test, and maintain while preserving the hybrid sync-safe approach that makes Bear integration reliable. 