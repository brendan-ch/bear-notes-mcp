/**
 * Build Configuration for Bear MCP Server
 * 
 * Advanced build settings for optimization, bundling, and distribution
 */

const path = require('path');

// Base configuration
const baseConfig = {
  // Source and output directories
  srcDir: 'src',
  buildDir: 'dist',
  buildsDir: 'builds',
  
  // TypeScript configuration
  typescript: {
    target: 'ES2022',
    module: 'ESNext',
    strict: true,
    declaration: true,
    sourceMap: true
  },
  
  // Bundle optimization
  optimization: {
    minify: true,
    treeShaking: true,
    sourcemap: true,
    target: 'node18',
    platform: 'node'
  },
  
  // External dependencies (not bundled)
  external: [
    'sqlite3',
    'better-sqlite3',
    // Node.js built-ins
    'fs',
    'path',
    'os',
    'crypto',
    'util',
    'events',
    'stream',
    'buffer',
    'url',
    'querystring',
    'http',
    'https',
    'net',
    'tls',
    'child_process'
  ],
  
  // Assets to copy
  assets: [
    'README.md',
    'LICENSE',
    'docs'
  ]
};

// Build targets configuration
const buildTargets = {
  // Modern ESM build
  esm: {
    ...baseConfig.optimization,
    format: 'esm',
    outfile: path.join(baseConfig.buildsDir, 'esm', 'index.js'),
    external: baseConfig.external,
    banner: {
      js: '#!/usr/bin/env node'
    },
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.BUILD_TARGET': '"esm"'
    }
  },
  
  // CommonJS build for compatibility
  cjs: {
    ...baseConfig.optimization,
    format: 'cjs',
    outfile: path.join(baseConfig.buildsDir, 'cjs', 'index.js'),
    external: baseConfig.external,
    banner: {
      js: '#!/usr/bin/env node'
    },
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.BUILD_TARGET': '"cjs"'
    }
  },
  
  // Standalone build with minimal externals
  standalone: {
    ...baseConfig.optimization,
    format: 'cjs',
    outfile: path.join(baseConfig.buildsDir, 'standalone', 'bear-mcp-server.js'),
    external: ['sqlite3'], // Only truly native modules
    banner: {
      js: '#!/usr/bin/env node'
    },
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.BUILD_TARGET': '"standalone"'
    }
  },
  
  // Development build with debugging
  dev: {
    ...baseConfig.optimization,
    minify: false,
    treeShaking: false,
    format: 'cjs',
    outfile: path.join(baseConfig.buildsDir, 'dev', 'index.js'),
    external: baseConfig.external,
    sourcemap: 'inline',
    banner: {
      js: '#!/usr/bin/env node'
    },
    define: {
      'process.env.NODE_ENV': '"development"',
      'process.env.BUILD_TARGET': '"dev"'
    }
  }
};

// Performance thresholds
const performanceThresholds = {
  // Bundle size limits (in bytes)
  maxBundleSize: {
    esm: 2 * 1024 * 1024,      // 2MB
    cjs: 2 * 1024 * 1024,      // 2MB
    standalone: 5 * 1024 * 1024, // 5MB (includes more dependencies)
    dev: 10 * 1024 * 1024      // 10MB (unminified)
  },
  
  // Build time limits (in milliseconds)
  maxBuildTime: {
    esm: 30000,        // 30 seconds
    cjs: 30000,        // 30 seconds
    standalone: 60000, // 60 seconds
    dev: 15000         // 15 seconds
  },
  
  // Runtime performance
  maxStartupTime: 5000,    // 5 seconds
  maxMemoryUsage: 100 * 1024 * 1024 // 100MB
};



// Validation configuration
const validationConfig = {
  timeout: 30000, // 30 seconds
  tests: {
    syntax: true,
    version: true,
    help: true,
    bundleIntegrity: true,
    performance: true
  },
  
  // Commands to test
  testCommands: [
    ['--version'],
    ['--help'],
    ['--health-check']
  ]
};

module.exports = {
  baseConfig,
  buildTargets,
  performanceThresholds,
  validationConfig
}; 