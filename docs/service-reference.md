# Service Reference

Complete reference for all services in the Bear MCP Server's refactored architecture.

## 🏗️ **Service Overview**

The Bear MCP Server uses a **service-oriented architecture** with 7 specialized services, each with clear responsibilities and comprehensive interfaces.

### **Service Dependency Graph**
```
ServiceContainer (Dependency Injection)
├── DatabaseService      (Foundation - SQLite operations)
├── CacheService        (Performance - Intelligent caching)
├── LoggingService      (Observability - Structured logging)
├── HealthService       (Monitoring - System health checks)
├── ValidationService   (Data Integrity - Input validation)
├── NoteService         (Business Logic - Note operations)
├── SearchService       (Discovery - Advanced search)
└── TagService          (Organization - Tag management)
```

---

## 📊 **Core Services**

### **1. DatabaseService** (`IDatabaseService`)

**Responsibility**: Low-level database operations and connection management

**Features**:
- SQLite connection pooling and lifecycle management
- Query execution with parameter binding and type safety
- Database integrity checks and schema introspection
- Backup creation and Bear process detection
- Connection state management and error handling

**Key Methods**:

#### `connect(readOnly?: boolean): Promise<void>`
Establishes connection to Bear's SQLite database.
- **readOnly**: Optional read-only mode (default: true)
- **Throws**: `BearError` if connection fails

#### `query<T>(sql: string, params?: SqlParameters): Promise<T[]>`
Executes SQL query with parameter binding.
- **sql**: SQL query string
- **params**: Optional parameters for prepared statements
- **Returns**: Array of typed results

#### `queryOne<T>(sql: string, params?: SqlParameters): Promise<T | null>`
Executes SQL query expecting single result.
- **Returns**: Single typed result or null

#### `getDatabaseStats(): Promise<DatabaseStats>`
Retrieves comprehensive database statistics.
- **Returns**: Complete database metrics including size, counts, and timestamps

#### `checkIntegrity(): Promise<boolean>`
Verifies database integrity using SQLite's integrity check.
- **Returns**: Boolean indicating database health

#### `createBackup(): Promise<string>`
Creates timestamped backup of Bear database.
- **Returns**: Path to created backup file

---

### **2. NoteService** (`INoteService`)

**Responsibility**: Note CRUD operations and lifecycle management using hybrid approach

**Features**:
- Hybrid read/write operations (database reads, Bear API writes)
- Conflict detection using modification timestamps
- Tag validation and sanitization
- Note duplication and archiving
- Batch operations support

**Key Methods**:

#### `getNotes(options?: NoteSearchOptions): Promise<NoteWithTags[]>`
Retrieves notes with optional filtering.
- **options**: Search criteria, pagination, sorting
- **Returns**: Array of notes with associated tags

#### `getNoteById(id: number): Promise<NoteWithTags | null>`
Retrieves specific note by database ID.
- **id**: Note database ID
- **Returns**: Note with tags or null if not found

#### `createNote(options: CreateNoteOptions): Promise<CreateResult>`
Creates new note via Bear API (sync-safe).
```typescript
interface CreateNoteOptions {
  title: string;
  content?: string;
  tags?: string[];
  isArchived?: boolean;
  isPinned?: boolean;
}

interface CreateResult {
  noteId: string;        // Bear's unique identifier
  success: boolean;
  tagWarnings?: string[]; // Tag sanitization warnings
}
```

#### `updateNote(noteId: number, options: UpdateOptions): Promise<UpdateResult>`
Updates existing note via Bear API with conflict detection.
```typescript
interface UpdateOptions {
  title?: string;
  content?: string;
  tags?: string[];
  isArchived?: boolean;
  isPinned?: boolean;
  expectedModificationDate?: Date; // For conflict detection
}

interface UpdateResult {
  success: boolean;
  conflictDetected?: boolean;
  tagWarnings?: string[];
}
```

#### `duplicateNote(noteId: number, options?: DuplicateOptions): Promise<DuplicateResult>`
Creates duplicate of existing note.
```typescript
interface DuplicateOptions {
  titleSuffix?: string;
  copyTags?: boolean;
}
```

---

### **3. SearchService** (`ISearchService`)

**Responsibility**: Advanced search and content discovery

**Features**:
- Full-text search with relevance scoring
- Fuzzy matching and content snippet extraction
- Similarity detection using keyword analysis
- Multi-criteria filtering with boolean logic
- Search suggestions and autocomplete
- Caching for performance optimization

**Key Methods**:

#### `searchNotesFullText(query: string, options?: FullTextOptions): Promise<SearchResult[]>`
Advanced full-text search with ranking.
```typescript
interface FullTextOptions {
  limit?: number;
  includeSnippets?: boolean;
  searchFields?: ('title' | 'content' | 'both')[];
  fuzzyMatch?: boolean;
  caseSensitive?: boolean;
  wholeWords?: boolean;
  includeArchived?: boolean;
  includeTrashed?: boolean;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

interface SearchResult extends NoteWithTags {
  relevanceScore: number;
  matchedTerms: string[];
  snippets: string[];
  titleMatches: number;
  contentMatches: number;
}
```

#### `findSimilarNotes(referenceText: string, options?: SimilarityOptions): Promise<SimilarNote[]>`
Finds notes similar to reference text using keyword analysis.
```typescript
interface SimilarityOptions {
  limit?: number;
  minSimilarity?: number;
  excludeNoteId?: number;
}

interface SimilarNote extends NoteWithTags {
  similarityScore: number;
  commonKeywords: string[];
}
```

#### `getSearchSuggestions(partialQuery: string, limit?: number): Promise<Suggestions>`
Provides search autocomplete suggestions.
```typescript
interface Suggestions {
  terms: string[];   // Content-based suggestions
  titles: string[];  // Title-based suggestions
  tags: string[];    // Tag-based suggestions
}
```

#### `getNotesAdvanced(options?: AdvancedOptions): Promise<NoteWithTags[]>`
Multi-criteria search with complex filtering.

#### `getNotesWithCriteria(criteria: SearchCriteria): Promise<NoteWithTags[]>`
Boolean logic search with detailed criteria.

---

### **4. TagService** (`ITagService`)

**Responsibility**: Tag management and organization

**Features**:
- Tag validation and sanitization
- Usage statistics and analytics
- Hashtag parsing integration with Bear
- Batch operations for tag management
- Tag hierarchy and organization

**Key Methods**:

#### `getTags(): Promise<TagWithCount[]>`
Retrieves all tags with usage statistics.
```typescript
interface TagWithCount {
  name: string;
  count: number;
  lastUsed: Date;
}
```

#### `getNotesByTag(tagName: string): Promise<NoteWithTags[]>`
Finds all notes with specific tag.

#### `validateAndSanitizeTags(tags: string[]): ValidationResult`
Validates and sanitizes tag array.
```typescript
interface ValidationResult {
  sanitized: string[];  // Cleaned tag names
  warnings: string[];   // Sanitization warnings
}
```

#### `triggerHashtagParsing(noteId?: string, noteTitle?: string): Promise<string>`
Triggers Bear's hashtag parsing for note.

#### `batchTriggerHashtagParsing(options: BatchOptions): Promise<string>`
Batch hashtag parsing with filtering options.

---

## 🛠️ **Infrastructure Services**

### **5. CacheService** (`ICacheService`)

**Responsibility**: Performance optimization through intelligent caching

**Features**:
- Multi-level caching (memory + disk)
- TTL-based expiration and cache warming
- Pattern-based invalidation
- Performance metrics and monitoring
- Configurable cache strategies

**Key Methods**:

#### `get<T>(key: string): Promise<T | null>`
Retrieves cached value by key.

#### `set<T>(key: string, value: T, ttl?: number): Promise<void>`
Stores value in cache with optional TTL.

#### `invalidate(pattern: string): Promise<void>`
Invalidates cache entries matching pattern.

#### `getStats(): Promise<CacheStats>`
Retrieves cache performance statistics.
```typescript
interface CacheStats {
  hitCount: number;
  missCount: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
}
```

---

### **6. LoggingService** (`ILoggingService`)

**Responsibility**: Structured logging and audit trails

**Features**:
- Winston-based structured logging
- Multiple transport support (console, file, remote)
- Child loggers with contextual information
- Performance tracking and timing
- Security and audit event logging
- Configurable log levels and formats

**Key Methods**:

#### Core Logging
```typescript
debug(message: string, meta?: Record<string, unknown>): void
info(message: string, meta?: Record<string, unknown>): void
warn(message: string, meta?: Record<string, unknown>): void
error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void
```

#### `child(context: Record<string, unknown>): ILoggingService`
Creates child logger with additional context.

#### `startTimer(label: string): () => void`
Creates performance timer that logs execution time when called.

#### `logPerformance(operation: string, duration: number, meta?: Record<string, unknown>): void`
Logs performance metrics for operations.

#### Specialized Logging
```typescript
logHealthCheck(service: string, status: 'healthy' | 'unhealthy' | 'degraded', details?: Record<string, unknown>): void
logDatabaseOperation(operation: string, duration: number, rowsAffected?: number, error?: Error): void
logSecurityEvent(event: string, details: Record<string, unknown>): void
logAuditEvent(action: string, resource: string, user?: string, details?: Record<string, unknown>): void
```

---

### **7. HealthService** (`IHealthService`)

**Responsibility**: System monitoring and health checks

**Features**:
- Multi-service health monitoring
- System resource tracking (CPU, memory, disk)
- Automatic health check intervals
- Configurable thresholds and alerting
- Health status aggregation and reporting

**Key Methods**:

#### `checkHealth(): Promise<HealthStatus>`
Comprehensive system health check.
```typescript
interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  uptime: number;
  services: Record<string, ServiceHealth>;
  system: SystemMetrics;
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  lastCheck: Date;
}

interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  disk?: {
    used: number;
    total: number;
    percentage: number;
  };
}
```

#### Individual Service Health Checks
```typescript
checkDatabaseHealth(): Promise<ServiceHealth>
checkBearHealth(): Promise<ServiceHealth>
checkCacheHealth(): Promise<ServiceHealth>
```

#### `setHealthCheckInterval(intervalMs: number): void`
Configures automatic health check frequency.

#### `startHealthChecks(): void` / `stopHealthChecks(): void`
Controls automatic health monitoring.

---

## 🔧 **Supporting Services**

### **ValidationService** (`IValidationService`)

**Responsibility**: Input validation and data sanitization

**Features**:
- Schema-based validation
- MCP argument validation
- Data sanitization and normalization
- Error reporting and context

### **AnalyticsService** (`IAnalyticsService`)

**Responsibility**: Note analytics and insights

**Features**:
- Content analysis and metadata extraction
- File attachment management
- Related note discovery
- Usage pattern analysis

### **ServiceContainer** (`IServiceContainer`)

**Responsibility**: Dependency injection and service lifecycle

**Features**:
- Service registration and resolution
- Singleton pattern enforcement
- Lifecycle management and cleanup
- Dependency graph management

---

## 🔄 **Service Integration Patterns**

### **Dependency Injection**
```typescript
// Service registration
container.registerSingleton('database', () => new DatabaseService(config.database));
container.registerSingleton('cache', () => new CacheService(config.cache));

// Service resolution with dependencies
container.registerSingleton('notes', () => new NoteService(
  container.resolve('database'),
  container.resolve('cache'),
  container.resolve('logging')
));
```

### **Error Handling**
All services use consistent error handling:
```typescript
try {
  const result = await this.performOperation();
  this.logger.info('Operation completed', { result });
  return result;
} catch (error) {
  this.logger.error('Operation failed', error);
  throw new BearError('Operation failed', ErrorCode.INTERNAL_ERROR, error);
}
```

### **Performance Monitoring**
```typescript
const timer = this.logger.startTimer('operation');
const result = await this.performOperation();
timer(); // Automatically logs execution time
```

### **Caching Pattern**
```typescript
const cacheKey = `operation:${this.hashParams(params)}`;
const cached = await this.cache.get(cacheKey);
if (cached) return cached;

const result = await this.performOperation(params);
await this.cache.set(cacheKey, result, 300); // 5 minutes TTL
return result;
```

This service architecture provides a robust, testable, and maintainable foundation for the Bear MCP Server while preserving the hybrid sync-safe approach that ensures reliable Bear integration. 