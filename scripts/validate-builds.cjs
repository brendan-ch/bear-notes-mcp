#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Build Validation Script
 * 
 * Validates all build outputs to ensure they work correctly
 * across different environments and use cases.
 */

const BUILDS_DIR = 'builds';
const VALIDATION_TIMEOUT = 30000; // 30 seconds

// Test configurations
const VALIDATION_TESTS = [
  {
    name: 'ESM Build',
    path: `${BUILDS_DIR}/esm/index.js`,
    type: 'module',
    tests: ['version', 'help', 'syntax']
  },
  {
    name: 'CommonJS Build',
    path: `${BUILDS_DIR}/cjs/index.js`,
    type: 'commonjs',
    tests: ['version', 'help', 'syntax']
  },
  {
    name: 'Standalone Build',
    path: `${BUILDS_DIR}/standalone/bear-mcp-server.js`,
    type: 'commonjs',
    tests: ['version', 'help', 'syntax', 'bundle-integrity']
  }
];

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      timeout: VALIDATION_TIMEOUT,
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: code === 0
      });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function validateSyntax(buildPath) {
  console.log('     🔍 Checking syntax...');
  
  try {
    const result = await runCommand('node', ['--check', buildPath]);
    if (result.success) {
      console.log('       ✅ Syntax validation passed');
      return true;
    } else {
      console.log('       ❌ Syntax validation failed:', result.stderr);
      return false;
    }
  } catch (error) {
    console.log('       ❌ Syntax validation error:', error.message);
    return false;
  }
}

async function validateVersion(buildPath) {
  console.log('     🏷️  Checking version command...');
  
  try {
    const result = await runCommand('node', [buildPath, '--version']);
    if (result.success && result.stdout) {
      console.log(`       ✅ Version: ${result.stdout}`);
      return true;
    } else {
      console.log('       ❌ Version command failed');
      return false;
    }
  } catch (error) {
    console.log('       ❌ Version command error:', error.message);
    return false;
  }
}

async function validateHelp(buildPath) {
  console.log('     ❓ Checking help command...');
  
  try {
    const result = await runCommand('node', [buildPath, '--help']);
    if (result.success && result.stdout) {
      console.log('       ✅ Help command works');
      return true;
    } else {
      console.log('       ❌ Help command failed');
      return false;
    }
  } catch (error) {
    console.log('       ❌ Help command error:', error.message);
    return false;
  }
}

async function validateBundleIntegrity(buildPath) {
  console.log('     📦 Checking bundle integrity...');
  
  try {
    // Check if all required dependencies are bundled or available
    const content = fs.readFileSync(buildPath, 'utf8');
    
    // Check for common import/require patterns that might indicate missing dependencies
    const missingDeps = [];
    
    // Check for unbundled requires (should be minimal in standalone build)
    const requireMatches = content.match(/require\(['"`]([^'"`]+)['"`]\)/g) || [];
    const allowedExternals = ['sqlite3', 'fs', 'path', 'os', 'crypto', 'util', 'events'];
    
    for (const match of requireMatches) {
      const dep = match.match(/require\(['"`]([^'"`]+)['"`]\)/)[1];
      if (!dep.startsWith('.') && !allowedExternals.includes(dep) && !dep.startsWith('node:')) {
        missingDeps.push(dep);
      }
    }
    
    if (missingDeps.length === 0) {
      console.log('       ✅ Bundle integrity check passed');
      return true;
    } else {
      console.log('       ⚠️  Potential external dependencies found:', missingDeps.slice(0, 5).join(', '));
      return true; // Don't fail for this, just warn
    }
  } catch (error) {
    console.log('       ❌ Bundle integrity check error:', error.message);
    return false;
  }
}

async function validateBuild(config) {
  console.log(`\n🧪 Validating ${config.name}...`);
  
  // Check if build exists
  if (!fs.existsSync(config.path)) {
    console.log(`   ❌ Build file not found: ${config.path}`);
    return {
      name: config.name,
      success: false,
      error: 'Build file not found'
    };
  }
  
  const fileSize = getFileSize(config.path);
  console.log(`   📊 File size: ${formatBytes(fileSize)}`);
  
  // Check if executable
  const stats = fs.statSync(config.path);
  if (!(stats.mode & 0o111)) {
    console.log('   ⚠️  Build file is not executable');
  }
  
  let testsPassed = 0;
  let testsTotal = config.tests.length;
  
  // Run validation tests
  for (const test of config.tests) {
    let passed = false;
    
    switch (test) {
      case 'syntax':
        passed = await validateSyntax(config.path);
        break;
      case 'version':
        passed = await validateVersion(config.path);
        break;
      case 'help':
        passed = await validateHelp(config.path);
        break;
      case 'bundle-integrity':
        passed = await validateBundleIntegrity(config.path);
        break;
      default:
        console.log(`     ❓ Unknown test: ${test}`);
    }
    
    if (passed) testsPassed++;
  }
  
  const success = testsPassed === testsTotal;
  console.log(`   📊 Tests passed: ${testsPassed}/${testsTotal}`);
  
  if (success) {
    console.log(`   ✅ ${config.name} validation passed`);
  } else {
    console.log(`   ❌ ${config.name} validation failed`);
  }
  
  return {
    name: config.name,
    success,
    testsPassed,
    testsTotal,
    fileSize
  };
}



async function generateValidationReport(results) {
  console.log('\n📊 Generating validation report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalBuilds: results.length,
      successfulBuilds: results.filter(r => r.success).length,
      failedBuilds: results.filter(r => !r.success).length
    },
    builds: results.map(result => ({
      name: result.name,
      success: result.success,
      testsPassed: result.testsPassed || 0,
      testsTotal: result.testsTotal || 0,
      fileSize: result.fileSize || 0,
      fileSizeFormatted: formatBytes(result.fileSize || 0),
      error: result.error
    }))
  };
  
  // Ensure builds directory exists
  if (!fs.existsSync(BUILDS_DIR)) {
    fs.mkdirSync(BUILDS_DIR, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(BUILDS_DIR, 'validation-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('   ✅ Validation report saved to builds/validation-report.json');
  return report;
}

// Main validation process
async function main() {
  console.log('🔍 Build Validation Starting...\n');
  
  const startTime = Date.now();
  
  try {
    // Check if builds directory exists
    if (!fs.existsSync(BUILDS_DIR)) {
      console.error('❌ Builds directory not found. Run npm run build:advanced first.');
      process.exit(1);
    }
    
    // Validate all builds
    const results = [];
    for (const config of VALIDATION_TESTS) {
      const result = await validateBuild(config);
      results.push(result);
    }
    
    // Generate report
    const report = await generateValidationReport(results);
    
    const totalTime = Date.now() - startTime;
    
    // Final summary
    console.log('\n🎉 Build Validation Completed!');
    console.log('═'.repeat(50));
    console.log(`⏱️  Total validation time: ${totalTime}ms`);
    console.log(`📊 Successful builds: ${report.summary.successfulBuilds}/${report.summary.totalBuilds}`);
    
    if (report.summary.failedBuilds > 0) {
      console.log(`❌ Failed builds: ${report.summary.failedBuilds}`);
      
      const failedBuilds = results.filter(r => !r.success);
      failedBuilds.forEach(build => {
        console.log(`   • ${build.name}: ${build.error || 'Validation failed'}`);
      });
      
      process.exit(1);
    } else {
      console.log('✅ All builds validated successfully!');
    }
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Run validation
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal validation error:', error);
    process.exit(1);
  });
}

module.exports = { main, VALIDATION_TESTS, validateBuild }; 