/**
 * HealthService Unit Tests
 * Tests for health monitoring, system metrics, and service health checks
 */

import { HealthService } from '../../src/services/health-service.js';
import {
  IHealthService,
  IDatabaseService,
  ICacheService,
} from '../../src/services/interfaces/index.js';

// Mock os module
jest.mock('os', () => ({
  totalmem: jest.fn(() => 8000000000), // 8GB
  freemem: jest.fn(() => 2000000000), // 2GB free
  loadavg: jest.fn(() => [0.5, 0.3, 0.2]), // Load averages
}));

describe('HealthService', () => {
  let healthService: HealthService;
  let mockDatabaseService: jest.Mocked<IDatabaseService>;
  let mockCacheService: jest.Mocked<ICacheService>;

  beforeEach(() => {
    // Create mock database service
    mockDatabaseService = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      query: jest.fn(),
      queryOne: jest.fn(),
      getDatabaseStats: jest.fn(),
      getSchema: jest.fn(),
      checkIntegrity: jest.fn(),
      verifyAccess: jest.fn().mockResolvedValue(undefined),
      createBackup: jest.fn(),
      isBearRunning: jest.fn().mockResolvedValue(true),
    };

    // Create mock cache service
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      has: jest.fn(),
      getStats: jest.fn(),
      invalidatePattern: jest.fn(),
      warmup: jest.fn(),
    };

    healthService = new HealthService({}, mockDatabaseService, mockCacheService);
  });

  afterEach(() => {
    healthService.dispose();
    jest.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should create HealthService with default configuration', () => {
      expect(healthService).toBeInstanceOf(HealthService);
    });

    it('should create HealthService with custom configuration', () => {
      const customConfig = {
        checkInterval: 60000,
        healthyThreshold: 200,
        degradedThreshold: 2000,
      };

      const customService = new HealthService(customConfig);
      expect(customService.getConfig()).toEqual(expect.objectContaining(customConfig));
    });

    it('should create HealthService without dependencies', () => {
      const service = new HealthService();
      expect(service).toBeInstanceOf(HealthService);
    });

    it('should merge custom config with defaults', () => {
      const customService = new HealthService({
        checkInterval: 45000,
        enableAutoChecks: true,
      });

      const config = customService.getConfig();
      expect(config.checkInterval).toBe(45000);
      expect(config.enableAutoChecks).toBe(true);
      expect(config.healthyThreshold).toBe(100); // default value
    });
  });

  describe('Overall Health Check', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should perform comprehensive health check', async () => {
      const result = await healthService.checkHealth();

      expect(result).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          timestamp: expect.any(Date),
          uptime: expect.any(Number),
          services: expect.any(Object),
          system: expect.any(Object),
        })
      );

      expect(result.services).toHaveProperty('database');
      expect(result.services).toHaveProperty('bear');
      expect(result.services).toHaveProperty('cache');
    });

    it('should return healthy status when all services are healthy', async () => {
      mockDatabaseService.verifyAccess.mockResolvedValue(undefined);
      mockDatabaseService.isBearRunning.mockResolvedValue(true);
      mockCacheService.get.mockResolvedValue({ timestamp: Date.now() });

      const result = await healthService.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.services.database.status).toBe('healthy');
      expect(result.services.bear.status).toBe('healthy');
      expect(result.services.cache.status).toBe('healthy');
    });

    it('should return unhealthy status when a service fails', async () => {
      mockDatabaseService.verifyAccess.mockRejectedValue(new Error('Database connection failed'));

      const result = await healthService.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('unhealthy');
      expect(result.services.database.error).toContain('Database connection failed');
    });

    it('should return degraded status when Bear is not running', async () => {
      mockDatabaseService.isBearRunning.mockResolvedValue(false);

      const result = await healthService.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.services.bear.status).toBe('degraded');
      expect(result.services.bear.error).toContain('Bear application is not running');
    });

    it('should include system metrics in health check', async () => {
      const result = await healthService.checkHealth();

      expect(result.system).toEqual(
        expect.objectContaining({
          memory: expect.objectContaining({
            used: expect.any(Number),
            total: expect.any(Number),
            percentage: expect.any(Number),
          }),
          cpu: expect.objectContaining({
            usage: expect.any(Number),
          }),
        })
      );
    });

    it('should calculate uptime correctly', async () => {
      // Advance time by 5 seconds
      jest.advanceTimersByTime(5000);

      const result = await healthService.checkHealth();

      expect(result.uptime).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('Database Health Check', () => {
    it('should check database health successfully', async () => {
      mockDatabaseService.verifyAccess.mockResolvedValue(undefined);

      const result = await healthService.checkDatabaseHealth();

      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.lastCheck).toBeInstanceOf(Date);
      expect(mockDatabaseService.verifyAccess).toHaveBeenCalled();
    });

    it('should handle database connection failure', async () => {
      const error = new Error('Connection refused');
      mockDatabaseService.verifyAccess.mockRejectedValue(error);

      const result = await healthService.checkDatabaseHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Connection refused');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return degraded when database service is not configured', async () => {
      const serviceWithoutDb = new HealthService();

      const result = await serviceWithoutDb.checkDatabaseHealth();

      expect(result.status).toBe('degraded');
      expect(result.error).toContain('Database service not configured');
      expect(result.responseTime).toBe(0);
    });

    it('should mark as degraded for slow database response', async () => {
      // Mock slow response
      mockDatabaseService.verifyAccess.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1500))
      );

      const result = await healthService.checkDatabaseHealth();

      expect(result.status).toBe('degraded');
      expect(result.responseTime).toBeGreaterThan(1000);
    });
  });

  describe('Bear Health Check', () => {
    it('should check Bear health successfully', async () => {
      mockDatabaseService.isBearRunning.mockResolvedValue(true);

      const result = await healthService.checkBearHealth();

      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(mockDatabaseService.isBearRunning).toHaveBeenCalled();
    });

    it('should return degraded when Bear is not running', async () => {
      mockDatabaseService.isBearRunning.mockResolvedValue(false);

      const result = await healthService.checkBearHealth();

      expect(result.status).toBe('degraded');
      expect(result.error).toContain('Bear application is not running');
    });

    it('should handle Bear check failure', async () => {
      const error = new Error('Process check failed');
      mockDatabaseService.isBearRunning.mockRejectedValue(error);

      const result = await healthService.checkBearHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Process check failed');
    });

    it('should return degraded when database service is not configured', async () => {
      const serviceWithoutDb = new HealthService();

      const result = await serviceWithoutDb.checkBearHealth();

      expect(result.status).toBe('degraded');
      expect(result.error).toContain('Database service not configured for Bear health check');
    });
  });

  describe('Cache Health Check', () => {
    it('should check cache health successfully', async () => {
      mockCacheService.get.mockResolvedValue({ timestamp: Date.now() });
      mockCacheService.delete.mockResolvedValue(true);

      const result = await healthService.checkCacheHealth();

      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockCacheService.delete).toHaveBeenCalled();
    });

    it('should return healthy when cache service is not configured', async () => {
      const serviceWithoutCache = new HealthService({}, mockDatabaseService);

      const result = await serviceWithoutCache.checkCacheHealth();

      expect(result.status).toBe('healthy');
      expect(result.error).toContain('Cache service not configured (optional)');
    });

    it('should return degraded when cache operation fails', async () => {
      mockCacheService.get.mockResolvedValue(null); // Cache miss

      const result = await healthService.checkCacheHealth();

      expect(result.status).toBe('degraded');
      expect(result.error).toContain('Cache set/get operation failed');
    });

    it('should handle cache service errors', async () => {
      const error = new Error('Cache unavailable');
      mockCacheService.set.mockRejectedValue(error);

      const result = await healthService.checkCacheHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Cache unavailable');
    });
  });

  describe('System Metrics', () => {
    it('should return system metrics', async () => {
      const result = await healthService.checkHealth();
      const { system } = result;

      expect(system.memory.used).toBe(6000000000); // 8GB - 2GB
      expect(system.memory.total).toBe(8000000000);
      expect(system.memory.percentage).toBe(75); // 6GB/8GB * 100
      expect(system.cpu.usage).toBe(50); // 0.5 * 100
    });

    it('should cap CPU usage at 100%', async () => {
      const os = require('os');
      os.loadavg.mockReturnValue([2.5, 2.0, 1.8]); // High load

      const result = await healthService.checkHealth();

      expect(result.system.cpu.usage).toBe(100); // Capped at 100%
    });

    it('should return degraded status for high memory usage', async () => {
      const os = require('os');
      os.freemem.mockReturnValue(400000000); // Only 400MB free (95% used)

      const result = await healthService.checkHealth();

      expect(result.status).toBe('degraded');
    });

    it('should return degraded status for high CPU usage', async () => {
      const os = require('os');
      os.loadavg.mockReturnValue([1.2, 1.0, 0.8]); // High CPU load (120%)

      const result = await healthService.checkHealth();

      expect(result.status).toBe('degraded');
    });
  });

  describe('Health Check Intervals', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start automatic health checks', () => {
      const spy = jest.spyOn(healthService, 'checkHealth').mockResolvedValue({} as any);

      healthService.startHealthChecks();

      // Fast-forward past the interval
      jest.advanceTimersByTime(30000);

      expect(spy).toHaveBeenCalled();
    });

    it('should stop automatic health checks', () => {
      healthService.startHealthChecks();
      healthService.stopHealthChecks();

      const spy = jest.spyOn(healthService, 'checkHealth');

      // Fast-forward past the interval
      jest.advanceTimersByTime(30000);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should update health check interval', () => {
      const spy = jest.spyOn(healthService, 'checkHealth').mockResolvedValue({} as any);

      healthService.setHealthCheckInterval(60000);
      healthService.startHealthChecks();

      // Advance by old interval (should not trigger)
      jest.advanceTimersByTime(30000);
      expect(spy).not.toHaveBeenCalled();

      // Advance by new interval (should trigger)
      jest.advanceTimersByTime(30000);
      expect(spy).toHaveBeenCalled();
    });

    it('should restart health checks when interval is changed during active monitoring', () => {
      const spy = jest.spyOn(healthService, 'stopHealthChecks');

      healthService.startHealthChecks();
      healthService.setHealthCheckInterval(45000);

      expect(spy).toHaveBeenCalled();
    });

    it('should handle health check errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(healthService, 'checkHealth').mockRejectedValue(new Error('Health check failed'));

      healthService.startHealthChecks();

      // Fast-forward past the interval and wait for promise to resolve
      jest.advanceTimersByTime(30000);
      await Promise.resolve(); // Let the promise rejection be handled

      // Should not throw, but should log error
      expect(consoleSpy).toHaveBeenCalledWith('Automatic health check failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = healthService.getConfig();

      expect(config).toEqual(
        expect.objectContaining({
          checkInterval: expect.any(Number),
          enableAutoChecks: expect.any(Boolean),
          healthyThreshold: expect.any(Number),
          degradedThreshold: expect.any(Number),
          timeoutMs: expect.any(Number),
        })
      );
    });

    it('should update configuration', () => {
      const newConfig = {
        checkInterval: 45000,
        healthyThreshold: 200,
      };

      healthService.updateConfig(newConfig);

      const config = healthService.getConfig();
      expect(config.checkInterval).toBe(45000);
      expect(config.healthyThreshold).toBe(200);
    });

    it('should preserve other config values when updating', () => {
      const originalConfig = healthService.getConfig();

      healthService.updateConfig({ checkInterval: 45000 });

      const updatedConfig = healthService.getConfig();
      expect(updatedConfig.checkInterval).toBe(45000);
      expect(updatedConfig.degradedThreshold).toBe(originalConfig.degradedThreshold);
      expect(updatedConfig.timeoutMs).toBe(originalConfig.timeoutMs);
    });
  });

  describe('Last Health Check', () => {
    it('should return undefined when no health check has been performed', () => {
      const lastCheck = healthService.getLastHealthCheck();
      expect(lastCheck).toBeUndefined();
    });

    it('should return last health check result', async () => {
      const result = await healthService.checkHealth();
      const lastCheck = healthService.getLastHealthCheck();

      expect(lastCheck).toEqual(result);
      expect(lastCheck?.timestamp).toBeInstanceOf(Date);
    });

    it('should update last health check on subsequent checks', async () => {
      const first = await healthService.checkHealth();

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 10));

      const second = await healthService.checkHealth();
      const lastCheck = healthService.getLastHealthCheck();

      expect(lastCheck).toEqual(second);
      expect(lastCheck?.timestamp.getTime()).toBeGreaterThan(first.timestamp.getTime());
    });
  });

  describe('Resource Cleanup', () => {
    it('should dispose resources', () => {
      const stopSpy = jest.spyOn(healthService, 'stopHealthChecks');

      healthService.dispose();

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should stop health checks on dispose', () => {
      healthService.startHealthChecks();

      const config = healthService.getConfig();
      expect(config.enableAutoChecks).toBe(true);

      healthService.dispose();

      const updatedConfig = healthService.getConfig();
      expect(updatedConfig.enableAutoChecks).toBe(false);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement IHealthService interface', () => {
      expect(healthService).toEqual(
        expect.objectContaining({
          checkHealth: expect.any(Function),
          checkDatabaseHealth: expect.any(Function),
          checkBearHealth: expect.any(Function),
          checkCacheHealth: expect.any(Function),
          setHealthCheckInterval: expect.any(Function),
          startHealthChecks: expect.any(Function),
          stopHealthChecks: expect.any(Function),
        })
      );
    });

    it('should satisfy IHealthService type', () => {
      // This test ensures TypeScript compatibility
      const service: IHealthService = healthService;
      expect(service).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle service check errors without crashing', async () => {
      mockDatabaseService.verifyAccess.mockRejectedValue(new Error('Database error'));
      mockDatabaseService.isBearRunning.mockRejectedValue(new Error('Bear error'));
      mockCacheService.set.mockRejectedValue(new Error('Cache error'));

      const result = await healthService.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('unhealthy');
      expect(result.services.bear.status).toBe('unhealthy');
      expect(result.services.cache.status).toBe('unhealthy');
    });

    it('should provide meaningful error messages', async () => {
      const dbError = new Error('Connection timeout');
      mockDatabaseService.verifyAccess.mockRejectedValue(dbError);

      const result = await healthService.checkHealth();

      expect(result.services.database.error).toBe('Connection timeout');
    });

    it('should handle unknown error types', async () => {
      mockDatabaseService.verifyAccess.mockRejectedValue('String error');

      const result = await healthService.checkHealth();

      expect(result.services.database.error).toBe('Database health check failed');
    });
  });
});
