import { config as loadEnv } from 'dotenv';
import * as os from 'os';
import * as path from 'path';

// Load environment variables from .env file
loadEnv();

/**
 * Environment types supported by the application
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * Log levels for application logging
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Configuration interface for the Bear MCP Server
 */
export interface Config {
  // Environment
  env: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;

  // Logging
  logLevel: LogLevel;
  enableVerboseLogging: boolean;

  // Database
  database: {
    bearDbPath: string;
    backupDir: string;
    enableBackups: boolean;
    maxBackups: number;
    backupInterval: number; // in hours
  };

  // MCP Server
  server: {
    name: string;
    version: string;
    timeout: number; // in milliseconds
    maxRetries: number;
  };

  // Bear Application
  bear: {
    checkInterval: number; // in milliseconds
    maxWaitTime: number; // in milliseconds
    enableStatusCheck: boolean;
  };

  // Security
  security: {
    enableSafetyChecks: boolean;
    allowDatabaseWrites: boolean;
    maxQueryComplexity: number;
  };

  // Performance
  performance: {
    cacheEnabled: boolean;
    cacheTtl: number; // in seconds
    maxConcurrentQueries: number;
  };
}

/**
 * Default configuration values
 */
const defaultConfig: Config = {
  // Environment
  env: (process.env.NODE_ENV as Environment) || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Logging
  logLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
  enableVerboseLogging: process.env.VERBOSE === 'true' || process.env.DEBUG === 'true',

  // Database
  database: {
    bearDbPath:
      process.env.BEAR_DB_PATH ||
      path.join(
        os.homedir(),
        'Library',
        'Group Containers',
        'net.shinyfrog.bear',
        'Application Data',
        'database.sqlite'
      ),
    backupDir: process.env.BACKUP_DIR || path.join(os.homedir(), 'Documents', 'Bear MCP Backups'),
    enableBackups: process.env.ENABLE_BACKUPS !== 'false',
    maxBackups: parseInt(process.env.MAX_BACKUPS || '10', 10),
    backupInterval: parseInt(process.env.BACKUP_INTERVAL || '24', 10),
  },

  // MCP Server
  server: {
    name: process.env.SERVER_NAME || 'bear-mcp-server',
    version: process.env.npm_package_version || '1.0.0',
    timeout: parseInt(process.env.SERVER_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  },

  // Bear Application
  bear: {
    checkInterval: parseInt(process.env.BEAR_CHECK_INTERVAL || '5000', 10),
    maxWaitTime: parseInt(process.env.BEAR_MAX_WAIT || '30000', 10),
    enableStatusCheck: process.env.BEAR_STATUS_CHECK !== 'false',
  },

  // Security
  security: {
    enableSafetyChecks: process.env.SAFETY_CHECKS !== 'false',
    allowDatabaseWrites: process.env.ALLOW_DB_WRITES === 'true',
    maxQueryComplexity: parseInt(process.env.MAX_QUERY_COMPLEXITY || '100', 10),
  },

  // Performance
  performance: {
    cacheEnabled: process.env.CACHE_ENABLED !== 'false',
    cacheTtl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes
    maxConcurrentQueries: parseInt(process.env.MAX_CONCURRENT_QUERIES || '10', 10),
  },
};

/**
 * Validates the configuration and throws errors for invalid values
 */
function validateConfig(config: Config): void {
  const errors: string[] = [];

  // Validate log level
  if (!['error', 'warn', 'info', 'debug'].includes(config.logLevel)) {
    errors.push(`Invalid log level: ${config.logLevel}`);
  }

  // Validate numeric values
  if (config.database.maxBackups < 1) {
    errors.push('Max backups must be at least 1');
  }

  if (config.database.backupInterval < 1) {
    errors.push('Backup interval must be at least 1 hour');
  }

  if (config.server.timeout < 1000) {
    errors.push('Server timeout must be at least 1000ms');
  }

  if (config.server.maxRetries < 0) {
    errors.push('Max retries cannot be negative');
  }

  if (config.bear.checkInterval < 1000) {
    errors.push('Bear check interval must be at least 1000ms');
  }

  if (config.security.maxQueryComplexity < 1) {
    errors.push('Max query complexity must be at least 1');
  }

  if (config.performance.cacheTtl < 0) {
    errors.push('Cache TTL cannot be negative');
  }

  if (config.performance.maxConcurrentQueries < 1) {
    errors.push('Max concurrent queries must be at least 1');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Creates and validates the application configuration
 */
function createConfig(): Config {
  const config = { ...defaultConfig };

  // Override with environment-specific settings
  if (config.isTest) {
    config.logLevel = 'error'; // Reduce noise in tests
    config.database.enableBackups = false; // No backups in tests
    config.bear.enableStatusCheck = false; // Skip Bear checks in tests
    config.security.enableSafetyChecks = false; // Allow more flexibility in tests
  }

  if (config.isDevelopment) {
    config.enableVerboseLogging = true;
    config.logLevel = 'debug';
  }

  if (config.isProduction) {
    config.logLevel = 'warn';
    config.enableVerboseLogging = false;
  }

  validateConfig(config);
  return config;
}

/**
 * Global configuration instance
 */
export const config = createConfig();

/**
 * Get environment-specific configuration
 */
export function getConfig(): Config {
  return config;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return config.isDevelopment;
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return config.isProduction;
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return config.isTest;
}

/**
 * Get the current environment
 */
export function getEnvironment(): Environment {
  return config.env;
}

/**
 * Utility to override configuration for testing
 */
export function overrideConfig(overrides: Partial<Config>): Config {
  return { ...config, ...overrides };
}
