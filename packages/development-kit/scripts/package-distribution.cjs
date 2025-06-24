#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

/**
 * Package Distribution Script for Bear MCP Server
 * 
 * Creates practical distribution packages for macOS Bear integration:
 * - NPM package for global installation
 * - Standalone executable bundle
 * - Development kit for contributors
 */

const BUILDS_DIR = 'builds';
const DIST_DIR = 'dist';
const PACKAGES_DIR = 'packages';

// Package configurations for practical Bear MCP deployment
const PACKAGE_CONFIGS = {
  npm: {
    name: 'npm-package',
    description: 'NPM package for global installation (npm install -g bear-mcp-server)',
    includes: ['dist', 'package.json', 'README.md', 'LICENSE'],
    postBuild: 'createNpmPackage'
  },
  standalone: {
    name: 'standalone-bundle',
    description: 'Self-contained executable bundle for direct execution',
    includes: ['builds/standalone', 'README.md', 'LICENSE'],
    postBuild: 'createStandaloneBundle'
  },
  development: {
    name: 'development-kit',
    description: 'Complete development environment for contributors',
    includes: ['src', 'tests', 'docs', 'scripts', 'package.json', 'tsconfig.json', 'jest.config.js'],
    postBuild: 'createDevelopmentKit'
  }
};

class PackageDistributor {
  constructor() {
    this.packageDir = PACKAGES_DIR;
    this.buildDir = BUILDS_DIR;
    this.distDir = DIST_DIR;
    this.results = {
      timestamp: new Date().toISOString(),
      packages: [],
      summary: {
        totalPackages: 0,
        successfulPackages: 0,
        failedPackages: 0,
        totalSize: 0
      }
    };
  }

  async run() {
    console.log('🚀 Creating Bear MCP Server distribution packages...\n');
    
    try {
      await this.ensureDirectories();
      await this.createPackages();
      await this.generateChecksums();
      await this.createDistributionReport();
      
      console.log('\n✅ Package distribution completed successfully!');
      this.printSummary();
      
    } catch (error) {
      console.error('\n❌ Package distribution failed:', error.message);
      process.exit(1);
    }
  }

  async ensureDirectories() {
    console.log('📁 Setting up distribution directories...');
    
    if (fs.existsSync(this.packageDir)) {
      fs.rmSync(this.packageDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.packageDir, { recursive: true });
    
    console.log(`   Created: ${this.packageDir}`);
  }

  async createPackages() {
    console.log('\n📦 Creating distribution packages...');
    
    for (const [configKey, config] of Object.entries(PACKAGE_CONFIGS)) {
      console.log(`\n   Creating ${config.name}...`);
      
      try {
        const packageResult = await this.createPackage(configKey, config);
        this.results.packages.push(packageResult);
        this.results.summary.successfulPackages++;
        
        console.log(`   ✅ ${config.name}: ${packageResult.sizeFormatted}`);
        
      } catch (error) {
        console.error(`   ❌ ${config.name}: ${error.message}`);
        this.results.packages.push({
          name: config.name,
          success: false,
          error: error.message,
          size: 0,
          sizeFormatted: '0 B'
        });
        this.results.summary.failedPackages++;
      }
    }
    
    this.results.summary.totalPackages = this.results.packages.length;
  }

  async createPackage(configKey, config) {
    const packagePath = path.join(this.packageDir, config.name);
    fs.mkdirSync(packagePath, { recursive: true });
    
    let totalSize = 0;
    
    // Copy included files/directories
    for (const include of config.includes) {
      if (fs.existsSync(include)) {
        const stat = fs.statSync(include);
        const targetPath = path.join(packagePath, path.basename(include));
        
        if (stat.isDirectory()) {
          this.copyDirectory(include, targetPath);
        } else {
          fs.copyFileSync(include, targetPath);
        }
        
        totalSize += this.getDirectorySize(stat.isDirectory() ? targetPath : targetPath);
      }
    }
    
    // Run post-build processing
    if (config.postBuild && this[config.postBuild]) {
      await this[config.postBuild](packagePath, config);
    }
    
    // Create archive
    const archivePath = await this.createArchive(packagePath, config.name);
    const archiveSize = fs.statSync(archivePath).size;
    
    return {
      name: config.name,
      description: config.description,
      success: true,
      path: archivePath,
      size: archiveSize,
      sizeFormatted: this.formatBytes(archiveSize),
      contentSize: totalSize,
      contentSizeFormatted: this.formatBytes(totalSize)
    };
  }

  async createNpmPackage(packagePath, config) {
    // Create package-specific package.json for global installation
    const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const packageJson = {
      ...originalPackage,
      preferGlobal: true,
      bin: {
        'bear-mcp-server': 'dist/index.js'
      },
      files: ['dist/**/*', 'README.md', 'LICENSE'],
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        start: originalPackage.scripts.start,
        test: originalPackage.scripts.test
      },
      keywords: [
        ...originalPackage.keywords || [],
        'bear',
        'notes',
        'mcp',
        'model-context-protocol',
        'macos',
        'productivity'
      ]
    };
    
    fs.writeFileSync(
      path.join(packagePath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create installation and usage instructions
    const installInstructions = `# Bear MCP Server - NPM Package

## Global Installation
\`\`\`bash
npm install -g bear-mcp-server
\`\`\`

## Usage
After global installation, you can start the server from anywhere:
\`\`\`bash
bear-mcp-server
\`\`\`

## Configuration
The server will automatically look for Bear's database at the standard location:
\`~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite\`

For custom configuration, create a config file:
\`\`\`bash
# In your home directory
echo '{"database": {"path": "/custom/path/to/bear.db"}}' > ~/.bear-mcp-config.json
\`\`\`

## MCP Client Integration
Add to your MCP client configuration:
\`\`\`json
{
  "mcpServers": {
    "bear": {
      "command": "bear-mcp-server",
      "args": []
    }
  }
}
\`\`\`

See README.md for detailed configuration options and troubleshooting.
`;
    
    fs.writeFileSync(path.join(packagePath, 'INSTALL.md'), installInstructions);
  }

  async createStandaloneBundle(packagePath, config) {
    // Create macOS executable script
    const macosScript = `#!/bin/bash
# Bear MCP Server Standalone Bundle
# Self-contained execution for macOS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_PATH="$SCRIPT_DIR/builds/standalone/bear-mcp-server.js"

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: Bear MCP Server requires macOS (Bear is macOS-only)"
    echo "   Bear Notes is only available on macOS"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is required but not installed."
    echo "   Please install Node.js from https://nodejs.org/"
    echo "   Recommended: Node.js 18.0.0 or higher"
    exit 1
fi

# Check if Bear is installed
BEAR_APP="/Applications/Bear.app"
if [ ! -d "$BEAR_APP" ]; then
    echo "⚠️  Warning: Bear.app not found in /Applications/"
    echo "   Please install Bear from the Mac App Store"
    echo "   The server will still start but won't find any notes"
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d 'v' -f 2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)

if [ "$MAJOR_VERSION" -lt 18 ]; then
    echo "⚠️  Warning: Node.js version $NODE_VERSION detected"
    echo "   Recommended: Node.js 18.0.0 or higher for best performance"
fi

echo "🐻 Starting Bear MCP Server..."
echo "   Server: $SERVER_PATH"
echo "   Node.js: $(node --version)"
echo ""

# Run the server
exec node "$SERVER_PATH" "$@"
`;
    
    fs.writeFileSync(path.join(packagePath, 'bear-mcp-server'), macosScript);
    fs.chmodSync(path.join(packagePath, 'bear-mcp-server'), '755');
    
    // Create usage instructions
    const usageInstructions = `# Bear MCP Server - Standalone Bundle

## Quick Start (macOS only)
\`\`\`bash
./bear-mcp-server
\`\`\`

## Requirements
- **macOS** (Bear Notes is macOS-only)
- **Node.js 18.0.0+** (download from https://nodejs.org/)
- **Bear Notes** (from Mac App Store)

## Installation
1. Download and extract this bundle
2. Open Terminal and navigate to the extracted folder
3. Run: \`./bear-mcp-server\`

## MCP Client Integration
Add to your MCP client configuration:
\`\`\`json
{
  "mcpServers": {
    "bear": {
      "command": "/path/to/bear-mcp-server",
      "args": []
    }
  }
}
\`\`\`

## Configuration
The server automatically detects Bear's database location. For custom settings:

1. Create \`bear-mcp-config.json\` in the same directory as the executable
2. Or place it in your home directory as \`~/.bear-mcp-config.json\`

Example configuration:
\`\`\`json
{
  "database": {
    "path": "~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite"
  },
  "logging": {
    "level": "info",
    "file": "./bear-mcp-server.log"
  }
}
\`\`\`

## Troubleshooting
- **"Bear.app not found"**: Install Bear from the Mac App Store
- **"Node.js required"**: Install Node.js from https://nodejs.org/
- **"Permission denied"**: Run \`chmod +x bear-mcp-server\`
- **Database not found**: Check Bear is installed and has been opened at least once

See README.md for detailed documentation.
`;
    
    fs.writeFileSync(path.join(packagePath, 'USAGE.md'), usageInstructions);
  }

  async createDevelopmentKit(packagePath, config) {
    // Create development setup script
    const devSetup = `#!/bin/bash
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
`;
    
    fs.writeFileSync(path.join(packagePath, 'setup-dev.sh'), devSetup);
    fs.chmodSync(path.join(packagePath, 'setup-dev.sh'), '755');
    
    // Create development configuration
    const devConfig = {
      database: {
        path: "./data/bear-dev.db",
        timeout: 5000,
        readonly: false
      },
      server: {
        port: 3001,
        host: "localhost"
      },
      logging: {
        level: "debug",
        file: "./logs/bear-mcp-dev.log",
        console: true
      },
      cache: {
        enabled: true,
        maxSize: 100,
        ttl: 300000
      },
      development: {
        hotReload: true,
        mockData: true,
        verbose: true
      }
    };
    
    fs.writeFileSync(
      path.join(packagePath, 'bear-mcp-config.dev.json'),
      JSON.stringify(devConfig, null, 2)
    );
    
    // Create development README
    const devReadme = `# Bear MCP Server - Development Kit

This development kit contains everything needed to contribute to the Bear MCP Server project.

## Quick Start
\`\`\`bash
./setup-dev.sh
npm run dev
\`\`\`

## Project Structure
- \`src/\` - TypeScript source code
- \`tests/\` - Test suites (384 tests)
- \`docs/\` - Documentation
- \`scripts/\` - Build and utility scripts

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
4. Run tests: \`npm test\`
5. Submit a pull request

See docs/developer-guide.md for detailed contribution guidelines.
`;
    
    fs.writeFileSync(path.join(packagePath, 'DEV-README.md'), devReadme);
  }

  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  getDirectorySize(dirPath) {
    let totalSize = 0;
    
    if (fs.statSync(dirPath).isFile()) {
      return fs.statSync(dirPath).size;
    }
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        totalSize += this.getDirectorySize(fullPath);
      } else {
        totalSize += fs.statSync(fullPath).size;
      }
    }
    
    return totalSize;
  }

  async createArchive(sourcePath, name) {
    const tarPath = path.join(this.packageDir, `${name}.tar.gz`);
    const zipPath = path.join(this.packageDir, `${name}.zip`);
    
    try {
      // Try tar first (common on macOS)
      execSync(`tar -czf "${tarPath}" -C "${path.dirname(sourcePath)}" "${path.basename(sourcePath)}"`, {
        stdio: 'pipe'
      });
      return tarPath;
    } catch (error) {
      try {
        // Fallback to zip
        execSync(`cd "${path.dirname(sourcePath)}" && zip -r "${zipPath}" "${path.basename(sourcePath)}"`, {
          stdio: 'pipe'
        });
        return zipPath;
      } catch (zipError) {
        throw new Error(`Failed to create archive: ${error.message}`);
      }
    }
  }

  async generateChecksums() {
    console.log('\n🔐 Generating checksums...');
    
    const checksumFile = path.join(this.packageDir, 'checksums.txt');
    const checksums = [];
    
    for (const pkg of this.results.packages) {
      if (pkg.success && pkg.path) {
        const fileContent = fs.readFileSync(pkg.path);
        const hash = createHash('sha256').update(fileContent).digest('hex');
        checksums.push(`${hash}  ${path.basename(pkg.path)}`);
        
        // Add checksum to package result
        pkg.checksum = hash;
      }
    }
    
    fs.writeFileSync(checksumFile, checksums.join('\n') + '\n');
    console.log(`   Generated: ${checksumFile}`);
  }

  async createDistributionReport() {
    const reportPath = path.join(this.packageDir, 'distribution-report.json');
    
    // Calculate total size
    this.results.summary.totalSize = this.results.packages
      .filter(pkg => pkg.success)
      .reduce((sum, pkg) => sum + pkg.size, 0);
    
    this.results.summary.totalSizeFormatted = this.formatBytes(this.results.summary.totalSize);
    
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  printSummary() {
    console.log('\n📊 Distribution Summary:');
    console.log(`   Total packages: ${this.results.summary.totalPackages}`);
    console.log(`   Successful: ${this.results.summary.successfulPackages}`);
    console.log(`   Failed: ${this.results.summary.failedPackages}`);
    console.log(`   Total size: ${this.results.summary.totalSizeFormatted}`);
    
    console.log('\n📦 Package Details:');
    for (const pkg of this.results.packages) {
      if (pkg.success) {
        console.log(`   ✅ ${pkg.name}: ${pkg.sizeFormatted}`);
        console.log(`      ${pkg.description}`);
      } else {
        console.log(`   ❌ ${pkg.name}: ${pkg.error}`);
      }
    }
    
    console.log(`\n📁 Distribution packages created in: ${this.packageDir}/`);
    console.log('\n🐻 Ready for Bear integration on macOS!');
  }
}

// Main execution
async function main() {
  const distributor = new PackageDistributor();
  await distributor.run();
}

// Export for testing
module.exports = { PackageDistributor, main };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
} 