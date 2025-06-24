#!/bin/bash
# Bear MCP Server Development Kit Setup

echo "🚀 Setting up Bear MCP Server development environment..."

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  Warning: Development is recommended on macOS (target platform)"
    echo "   Some tests may fail on other platforms"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run initial build
echo "🔨 Running initial build..."
npm run build

# Run tests
echo "🧪 Running test suite..."
npm test

# Create development database (if Bear not available)
echo "🗄️ Setting up development database..."
mkdir -p data
if [ ! -f "data/bear-dev.db" ]; then
    touch data/bear-dev.db
    echo "   Created development database: data/bear-dev.db"
fi

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "📚 Available commands:"
echo "  npm run dev              - Start development server with hot reload"
echo "  npm run build            - Build TypeScript to JavaScript"
echo "  npm run build:advanced   - Create optimized builds"
echo "  npm test                 - Run test suite"
echo "  npm run test:watch       - Run tests in watch mode"
echo "  npm run lint             - Run ESLint"
echo "  npm run format           - Format code with Prettier"
echo ""
echo "📖 Documentation:"
echo "  docs/developer-guide.md  - Complete development guide"
echo "  docs/architecture.md     - System architecture overview"
echo "  docs/api-reference.md    - API documentation"
echo ""
echo "🐻 Bear Integration:"
echo "  Make sure Bear.app is installed for full functionality"
echo "  Database location: ~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/"
echo ""
echo "Happy coding! 🎉"
