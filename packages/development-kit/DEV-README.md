# Bear MCP Server - Development Kit

This development kit contains everything needed to contribute to the Bear MCP Server project.

## Quick Start
```bash
./setup-dev.sh
npm run dev
```

## Project Structure
- `src/` - TypeScript source code
- `tests/` - Test suites (384 tests)
- `docs/` - Documentation
- `scripts/` - Build and utility scripts

## Architecture
The project uses a service-oriented architecture with 7 specialized services:
- DatabaseService - SQLite database operations
- NoteService - Note CRUD operations
- SearchService - Full-text search capabilities
- TagService - Tag management and operations
- CacheService - LRU caching with TTL
- LoggingService - Structured logging
- HealthService - System health monitoring
- ValidationService - Input validation

## Testing
- **384 tests** across 12 test suites
- Unit tests for all services
- Integration tests for MCP protocol
- Performance tests for optimization

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

See docs/developer-guide.md for detailed contribution guidelines.
