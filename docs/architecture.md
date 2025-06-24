# Architecture Overview

The Bear MCP Server has been completely refactored from a monolithic design into a modern, service-oriented architecture with comprehensive testing, monitoring, and performance optimization.

## 🏗️ **System Architecture**

### **From Monolith to Microservices**
- **Before**: Single 2,589-line BearService handling everything
- **After**: 7 specialized services with clear responsibilities
- **Result**: ~8,000+ lines of well-structured, testable code

### **Hybrid Sync-Safe Design**
- **Read Operations**: Direct SQLite database access for maximum performance
- **Write Operations**: Bear's x-callback-url API for sync safety
- **Bridge**: Uses `ZUNIQUEIDENTIFIER` to coordinate between approaches

## 🔧 **Service Architecture**

### **Core Services**

#### 1. **DatabaseService** (`IDatabaseService`)
**Responsibility**: Low-level database operations and connection management

**Key Features**:
- Connection pooling and management
- Query execution with parameter binding
- Database integrity checks and backup creation
- Bear process detection
- Schema introspection

**Methods**:
```typescript
connect(readOnly?: boolean): Promise<void>
query<T>(sql: string, params?: SqlParameters): Promise<T[]>
getDatabaseStats(): Promise<DatabaseStats>
checkIntegrity(): Promise<boolean>
createBackup(): Promise<string>
```

#### 2. **NoteService** (`INoteService`)
**Responsibility**: Note CRUD operations and lifecycle management

**Key Features**:
- Hybrid read/write operations (database reads, API writes)
- Conflict detection with modification timestamps
- Tag validation and sanitization
- Note duplication and archiving

**Methods**:
```typescript
getNotes(options?: NoteSearchOptions): Promise<NoteWithTags[]>
createNote(options: CreateNoteOptions): Promise<CreateResult>
updateNote(noteId: number, options: UpdateOptions): Promise<UpdateResult>
duplicateNote(noteId: number, options?: DuplicateOptions): Promise<DuplicateResult>
```

#### 3. **SearchService** (`ISearchService`)
**Responsibility**: Advanced search and content discovery

**Key Features**:
- Full-text search with relevance scoring
- Fuzzy matching and content snippets
- Similarity detection using keyword analysis
- Multi-criteria filtering with boolean logic
- Search suggestions and autocomplete

**Methods**:
```typescript
searchNotesFullText(query: string, options?: FullTextOptions): Promise<SearchResult[]>
findSimilarNotes(referenceText: string, options?: SimilarityOptions): Promise<SimilarNote[]>
getSearchSuggestions(partialQuery: string): Promise<Suggestions>
getNotesAdvanced(options?: AdvancedOptions): Promise<NoteWithTags[]>
```

#### 4. **TagService** (`ITagService`)
**Responsibility**: Tag management and organization

**Key Features**:
- Tag validation and sanitization
- Usage statistics and analytics
- Hashtag parsing integration with Bear
- Batch operations for tag management

**Methods**:
```typescript
getTags(): Promise<TagWithCount[]>
validateAndSanitizeTags(tags: string[]): ValidationResult
triggerHashtagParsing(noteId?: string): Promise<string>
batchTriggerHashtagParsing(options: BatchOptions): Promise<string>
```

### **Infrastructure Services**

#### 5. **CacheService** (`ICacheService`)
**Responsibility**: Performance optimization through intelligent caching

**Key Features**:
- Multi-level caching (memory + disk)
- TTL-based expiration
- Cache warming and invalidation
- Performance metrics tracking

**Methods**:
```typescript
get<T>(key: string): Promise<T | null>
set<T>(key: string, value: T, ttl?: number): Promise<void>
invalidate(pattern: string): Promise<void>
getStats(): Promise<CacheStats>
```

#### 6. **LoggingService** (`ILoggingService`)
**Responsibility**: Structured logging and audit trails

**Key Features**:
- Winston-based structured logging
- Multiple transport support (console, file, remote)
- Child loggers with context
- Performance tracking and metrics
- Security and audit event logging

**Methods**:
```typescript
info(message: string, meta?: Record<string, unknown>): void
child(context: Record<string, unknown>): ILoggingService
startTimer(label: string): () => void
logDatabaseOperation(operation: string, duration: number): void
logSecurityEvent(event: string, details: Record<string, unknown>): void
```

#### 7. **HealthService** (`IHealthService`)
**Responsibility**: System monitoring and health checks

**Key Features**:
- Multi-service health monitoring
- System resource tracking (CPU, memory, disk)
- Automatic health check intervals
- Configurable thresholds and alerting

**Methods**:
```typescript
checkHealth(): Promise<HealthStatus>
checkDatabaseHealth(): Promise<ServiceHealth>
checkBearHealth(): Promise<ServiceHealth>
setHealthCheckInterval(intervalMs: number): void
```

### **Supporting Services**

#### **ValidationService** (`IValidationService`)
- Input validation and sanitization
- MCP argument validation
- Data schema enforcement
- Error handling and reporting

#### **AnalyticsService** (`IAnalyticsService`)
- Note analytics and insights
- Content analysis and metadata extraction
- File attachment management
- Related note discovery

#### **ServiceContainer** (`IServiceContainer`)
- Dependency injection container
- Service lifecycle management
- Singleton pattern enforcement
- Resource cleanup coordination

## 🔄 **Data Flow Architecture**

### **Read Operations Flow**
```
User Request → MCP Handler → Service Layer → DatabaseService → SQLite → Response
```

### **Write Operations Flow**
```
User Request → MCP Handler → Service Layer → Bear API → Bear App → Database Sync → Response
```

### **Search Operations Flow**
```
Query → SearchService → DatabaseService → Content Analysis → Ranking → Cached Results → Response
```

## 🛡️ **Safety & Reliability Features**

### **Error Handling**
- Comprehensive error types and handling
- Graceful degradation on service failures
- Automatic retry mechanisms
- Circuit breaker patterns for external dependencies

### **Data Integrity**
- Database integrity checks
- Backup creation before major operations
- Conflict detection using modification timestamps
- Tag validation and sanitization

### **Performance Optimization**
- Multi-level caching strategy
- Query optimization and indexing
- Connection pooling
- Lazy loading and pagination

### **Monitoring & Observability**
- Structured logging with correlation IDs
- Performance metrics and timing
- Health check endpoints
- System resource monitoring

## 📊 **Quality Metrics**

### **Test Coverage**
- **384 total tests** across 12 test suites
- **Unit tests**: 100% service coverage
- **Integration tests**: End-to-end workflows
- **Performance tests**: Load and stress testing

### **Code Quality**
- **TypeScript strict mode** enabled
- **ESLint + Prettier** for code consistency
- **50+ `any` types eliminated** for type safety
- **Comprehensive interfaces** for all services

### **Performance Benchmarks**
- **Database queries**: < 50ms average response time
- **Search operations**: < 200ms for complex queries
- **Cache hit ratio**: > 80% for frequently accessed data
- **Memory usage**: < 100MB baseline

## 🔧 **Configuration & Deployment**

### **Environment Configuration**
```typescript
interface Config {
  database: {
    path: string;
    readOnly: boolean;
    connectionTimeout: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file: string;
    console: boolean;
  };
  health: {
    checkInterval: number;
    timeout: number;
  };
}
```

### **Service Bootstrap Process**
1. **Configuration Loading**: Environment variables and defaults
2. **Service Registration**: Dependency injection setup
3. **Database Connection**: SQLite connection establishment
4. **Cache Initialization**: Memory and disk cache setup
5. **Health Checks**: Service monitoring startup
6. **MCP Server**: Protocol handler registration

## 🚀 **Development Workflow**

### **Adding New Features**
1. **Define Interface**: Add method to appropriate service interface
2. **Implement Service**: Add implementation with error handling
3. **Write Tests**: Unit tests with mocking
4. **Update Documentation**: API reference and examples
5. **Integration Testing**: End-to-end validation

### **Service Extension**
- All services implement clear interfaces
- Dependency injection enables easy mocking and testing
- Service container manages lifecycle and dependencies
- Configuration-driven feature toggles

## 🔮 **Future Architecture Considerations**

### **Scalability**
- **Horizontal scaling**: Service separation enables independent scaling
- **Database sharding**: Potential for multi-database support
- **Caching layers**: Redis integration for distributed caching
- **Event sourcing**: Audit trail and change tracking

### **Extensibility**
- **Plugin architecture**: Dynamic service loading
- **API versioning**: Backward compatibility support
- **External integrations**: Other note-taking apps
- **Cloud sync**: Multi-device synchronization

This architecture provides a solid foundation for continued development while maintaining the hybrid sync-safe approach that makes Bear integration both powerful and reliable. 