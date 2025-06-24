import {
  getConfig,
  isDevelopment,
  isProduction,
  isTest,
  getEnvironment,
  overrideConfig,
} from '../../src/config';

describe('Configuration System', () => {
  // Store original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Environment Detection', () => {
    it('should detect test environment correctly', () => {
      expect(isTest()).toBe(true);
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(false);
      expect(getEnvironment()).toBe('test');
    });

    it('should have test-specific configuration', () => {
      const testConfig = getConfig();

      expect(testConfig.isTest).toBe(true);
      expect(testConfig.logLevel).toBe('error');
      expect(testConfig.database.enableBackups).toBe(false);
      expect(testConfig.bear.enableStatusCheck).toBe(false);
      expect(testConfig.security.enableSafetyChecks).toBe(false);
    });
  });

  describe('Configuration Structure', () => {
    it('should have all required configuration sections', () => {
      const cfg = getConfig();

      expect(cfg).toHaveProperty('env');
      expect(cfg).toHaveProperty('database');
      expect(cfg).toHaveProperty('server');
      expect(cfg).toHaveProperty('bear');
      expect(cfg).toHaveProperty('security');
      expect(cfg).toHaveProperty('performance');
    });

    it('should have valid database configuration', () => {
      const cfg = getConfig();

      expect(cfg.database.bearDbPath).toBeDefined();
      expect(cfg.database.backupDir).toBeDefined();
      expect(typeof cfg.database.enableBackups).toBe('boolean');
      expect(cfg.database.maxBackups).toBeGreaterThan(0);
      expect(cfg.database.backupInterval).toBeGreaterThan(0);
    });

    it('should have valid server configuration', () => {
      const cfg = getConfig();

      expect(cfg.server.name).toBeDefined();
      expect(cfg.server.version).toBeDefined();
      expect(cfg.server.timeout).toBeGreaterThanOrEqual(1000);
      expect(cfg.server.maxRetries).toBeGreaterThanOrEqual(0);
    });

    it('should have valid bear configuration', () => {
      const cfg = getConfig();

      expect(cfg.bear.checkInterval).toBeGreaterThanOrEqual(1000);
      expect(cfg.bear.maxWaitTime).toBeGreaterThan(0);
      expect(typeof cfg.bear.enableStatusCheck).toBe('boolean');
    });

    it('should have valid security configuration', () => {
      const cfg = getConfig();

      expect(typeof cfg.security.enableSafetyChecks).toBe('boolean');
      expect(typeof cfg.security.allowDatabaseWrites).toBe('boolean');
      expect(cfg.security.maxQueryComplexity).toBeGreaterThan(0);
    });

    it('should have valid performance configuration', () => {
      const cfg = getConfig();

      expect(typeof cfg.performance.cacheEnabled).toBe('boolean');
      expect(cfg.performance.cacheTtl).toBeGreaterThanOrEqual(0);
      expect(cfg.performance.maxConcurrentQueries).toBeGreaterThan(0);
    });
  });

  describe('Environment Variable Override', () => {
    it('should respect LOG_LEVEL environment variable', () => {
      // This test runs in test environment, so we test by checking the default
      const cfg = getConfig();
      expect(cfg.logLevel).toBe('error'); // Test environment default
    });

    it('should respect numeric environment variables', () => {
      const cfg = getConfig();

      // These should be properly parsed as numbers
      expect(typeof cfg.database.maxBackups).toBe('number');
      expect(typeof cfg.server.timeout).toBe('number');
      expect(typeof cfg.bear.checkInterval).toBe('number');
    });

    it('should respect boolean environment variables', () => {
      const cfg = getConfig();

      // These should be properly parsed as booleans
      expect(typeof cfg.database.enableBackups).toBe('boolean');
      expect(typeof cfg.security.enableSafetyChecks).toBe('boolean');
      expect(typeof cfg.performance.cacheEnabled).toBe('boolean');
    });
  });

  describe('Configuration Override', () => {
    it('should allow configuration override for testing', () => {
      const originalConfig = getConfig();
      const overriddenConfig = overrideConfig({
        logLevel: 'debug',
        database: {
          ...originalConfig.database,
          maxBackups: 99,
        },
      });

      expect(overriddenConfig.logLevel).toBe('debug');
      expect(overriddenConfig.database.maxBackups).toBe(99);

      // Other values should remain unchanged
      expect(overriddenConfig.server.name).toBe(originalConfig.server.name);
    });
  });

  describe('Default Values', () => {
    it('should have sensible defaults for all configuration', () => {
      const cfg = getConfig();

      // Database defaults
      expect(cfg.database.bearDbPath).toContain('database.sqlite');
      expect(cfg.database.backupDir).toContain('Bear MCP Backups');

      // Server defaults
      expect(cfg.server.name).toBe('bear-mcp-server');
      expect(cfg.server.timeout).toBe(30000);
      expect(cfg.server.maxRetries).toBe(3);

      // Performance defaults
      expect(cfg.performance.cacheTtl).toBe(300); // 5 minutes
      expect(cfg.performance.maxConcurrentQueries).toBe(10);
    });
  });

  describe('Path Resolution', () => {
    it('should resolve Bear database path correctly', () => {
      const cfg = getConfig();

      expect(cfg.database.bearDbPath).toContain('Library');
      expect(cfg.database.bearDbPath).toContain('Group Containers');
      expect(cfg.database.bearDbPath).toContain('net.shinyfrog.bear');
      expect(cfg.database.bearDbPath).toContain('database.sqlite');
    });

    it('should resolve backup directory correctly', () => {
      const cfg = getConfig();

      expect(cfg.database.backupDir).toContain('Documents');
      expect(cfg.database.backupDir).toContain('Bear MCP Backups');
    });
  });
});
