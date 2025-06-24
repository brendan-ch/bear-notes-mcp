/**
 * Health Service Implementation
 * Provides health monitoring for system and individual services
 */

import os from 'os';
import { IHealthService, IDatabaseService, ICacheService } from './interfaces/index.js';

/**
 * Health status types
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

/**
 * Individual service health check result
 */
export interface ServiceHealthResult {
  status: HealthStatus;
  responseTime: number;
  error?: string;
  lastCheck: Date;
}

/**
 * System health metrics
 */
export interface SystemHealth {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  disk?: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * Complete health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  services: Record<string, ServiceHealthResult>;
  system: SystemHealth;
}

/**
 * Health service configuration
 */
export interface HealthConfig {
  checkInterval: number;
  enableAutoChecks: boolean;
  healthyThreshold: number;
  degradedThreshold: number;
  timeoutMs: number;
}

/**
 * Default health service configuration
 */
const DEFAULT_HEALTH_CONFIG: HealthConfig = {
  checkInterval: 30000, // 30 seconds
  enableAutoChecks: false,
  healthyThreshold: 100, // ms
  degradedThreshold: 1000, // ms
  timeoutMs: 5000, // 5 seconds
};

/**
 * HealthService implementation
 */
export class HealthService implements IHealthService {
  private config: HealthConfig;
  private startTime: number = Date.now();
  private intervalId?: NodeJS.Timeout;
  private lastHealthCheck?: HealthCheckResult;
  private databaseService?: IDatabaseService;
  private cacheService?: ICacheService;

  constructor(
    config: Partial<HealthConfig> = {},
    databaseService?: IDatabaseService,
    cacheService?: ICacheService
  ) {
    this.config = { ...DEFAULT_HEALTH_CONFIG, ...config };
    this.databaseService = databaseService;
    this.cacheService = cacheService;
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const timestamp = new Date();
    const uptime = Date.now() - this.startTime;
    
    const services: Record<string, ServiceHealthResult> = {};
    
    // Check individual services
    try {
      services.database = await this.checkDatabaseHealth();
    } catch (error) {
      services.database = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: timestamp,
      };
    }

    try {
      services.bear = await this.checkBearHealth();
    } catch (error) {
      services.bear = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: timestamp,
      };
    }

    try {
      services.cache = await this.checkCacheHealth();
    } catch (error) {
      services.cache = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: timestamp,
      };
    }

    // Get system metrics
    const system = await this.getSystemMetrics();

    // Determine overall health status
    const overallStatus = this.determineOverallStatus(services, system);

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp,
      uptime,
      services,
      system,
    };

    this.lastHealthCheck = result;
    return result;
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth(): Promise<ServiceHealthResult> {
    const startTime = Date.now();
    
    try {
      if (!this.databaseService) {
        return {
          status: 'degraded',
          responseTime: 0,
          error: 'Database service not configured',
          lastCheck: new Date(),
        };
      }

      // Test database connectivity and basic query
      await this.databaseService.verifyAccess();
      const responseTime = Date.now() - startTime;

      let status: HealthStatus = 'healthy';
      if (responseTime > this.config.degradedThreshold) {
        status = 'degraded';
      } else if (responseTime > this.config.healthyThreshold) {
        status = 'degraded';
      }

      return {
        status,
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database health check failed',
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check Bear application health
   */
  async checkBearHealth(): Promise<ServiceHealthResult> {
    const startTime = Date.now();
    
    try {
      if (!this.databaseService) {
        return {
          status: 'degraded',
          responseTime: 0,
          error: 'Database service not configured for Bear health check',
          lastCheck: new Date(),
        };
      }

      // Check if Bear is running
      const isBearRunning = await this.databaseService.isBearRunning();
      const responseTime = Date.now() - startTime;

      if (!isBearRunning) {
        return {
          status: 'degraded',
          responseTime,
          error: 'Bear application is not running',
          lastCheck: new Date(),
        };
      }

      let status: HealthStatus = 'healthy';
      if (responseTime > this.config.degradedThreshold) {
        status = 'degraded';
      }

      return {
        status,
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Bear health check failed',
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check cache service health
   */
  async checkCacheHealth(): Promise<ServiceHealthResult> {
    const startTime = Date.now();
    
    try {
      if (!this.cacheService) {
        return {
          status: 'healthy',
          responseTime: 0,
          error: 'Cache service not configured (optional)',
          lastCheck: new Date(),
        };
      }

      // Test cache with a simple operation
      const testKey = '__health_check__';
      const testValue = { timestamp: Date.now() };
      
      await this.cacheService.set(testKey, testValue, { ttl: 1000 }); // 1 second TTL
      const retrieved = await this.cacheService.get(testKey);
      await this.cacheService.delete(testKey);

      const responseTime = Date.now() - startTime;

      if (!retrieved) {
        return {
          status: 'degraded',
          responseTime,
          error: 'Cache set/get operation failed',
          lastCheck: new Date(),
        };
      }

      let status: HealthStatus = 'healthy';
      if (responseTime > this.config.degradedThreshold) {
        status = 'degraded';
      }

      return {
        status,
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Cache health check failed',
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<SystemHealth> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Get CPU usage (simplified - would need more sophisticated monitoring for accurate CPU usage)
    const cpuUsage = os.loadavg()[0]; // 1-minute load average as proxy for CPU usage

    return {
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100,
      },
      cpu: {
        usage: Math.min(cpuUsage * 100, 100), // Convert to percentage, cap at 100%
      },
      // Disk usage would require additional dependencies or filesystem calls
      // Omitting for now as it's optional in the interface
    };
  }

  /**
   * Determine overall health status based on service and system health
   */
  private determineOverallStatus(
    services: Record<string, ServiceHealthResult>,
    system: SystemHealth
  ): HealthStatus {
    const serviceStatuses = Object.values(services).map(s => s.status);
    
    // If any critical service is unhealthy, overall is unhealthy
    if (serviceStatuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    // Check system resources
    if (system.memory.percentage > 90 || system.cpu.usage > 90) {
      return 'degraded';
    }

    // If any service is degraded, overall is degraded
    if (serviceStatuses.includes('degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Set health check interval
   */
  setHealthCheckInterval(intervalMs: number): void {
    this.config.checkInterval = intervalMs;
    
    if (this.intervalId) {
      this.stopHealthChecks();
      if (this.config.enableAutoChecks) {
        this.startHealthChecks();
      }
    }
  }

  /**
   * Start automatic health checks
   */
  startHealthChecks(): void {
    if (this.intervalId) {
      this.stopHealthChecks();
    }

    this.config.enableAutoChecks = true;
    this.intervalId = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        // Health check failed, but don't throw - just log internally
        console.error('Automatic health check failed:', error);
      }
    }, this.config.checkInterval);
  }

  /**
   * Stop automatic health checks
   */
  stopHealthChecks(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.config.enableAutoChecks = false;
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Get health service configuration
   */
  getConfig(): HealthConfig {
    return { ...this.config };
  }

  /**
   * Update health service configuration
   */
  updateConfig(config: Partial<HealthConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopHealthChecks();
  }
}

/**
 * Export types for external use
 */
export type { IHealthService }; 