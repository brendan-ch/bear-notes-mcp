#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Development script for Bear MCP Server
 * Sets up development environment and starts the server with hot reload
 */

console.log('🚀 Starting Bear MCP Server in development mode...\n');

// Check if .env file exists, if not create from example
const envPath = '.env';
const envExamplePath = 'env.example';

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('📝 Creating .env file from example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ .env file created. Please customize it for your environment.\n');
}

// Set development environment
process.env.NODE_ENV = 'development';
process.env.LOG_LEVEL = 'debug';
process.env.VERBOSE = 'true';

console.log('🔧 Development environment configured:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   LOG_LEVEL: ${process.env.LOG_LEVEL}`);
console.log(`   VERBOSE: ${process.env.VERBOSE}\n`);

// Start the development server
console.log('🏃 Starting development server with hot reload...\n');

const devServer = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  devServer.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down development server...');
  devServer.kill('SIGTERM');
  process.exit(0);
});

devServer.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\n❌ Development server exited with code ${code}`);
    process.exit(code);
  }
  console.log('\n✅ Development server stopped');
}); 