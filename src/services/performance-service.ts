import { getConfig } from '../config/index.js';
import { PerformanceMetrics } from '../types/database.js';

export interface QueryPerformance {
  sql: string;
  executionTime: number;
  timestamp: Date;
  resultCount: number;
  cacheHit: boolean;
  parameters?: unknown[];
}

export interface SystemMetrics {
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  uptime: number;
  timestamp: Date;
}

export interface PerformanceReport {
  summary: {
    totalQueries: number;
    averageQueryTime: number;
    slowestQuery: QueryPerformance | null;
    fastestQuery: QueryPerformance | null;
    cacheHitRate: number;
    totalCacheHits: number;
    totalCacheMisses: number;
  };
  slowQueries: QueryPerformance[];
  systemMetrics: SystemMetrics;
  recommendations: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface IPerformanceService {
  recordQuery(query: QueryPerformance): Promise<void>;
  recordSystemMetrics(): Promise<void>;
  getPerformanceReport(since?: Date): Promise<PerformanceReport>;
  getSlowQueries(limit?: number, threshold?: number): Promise<QueryPerformance[]>;
  clearMetrics(): Promise<void>;
  getRecommendations(): Promise<string[]>;
}

/**
 * Performance monitoring and optimization service
 */
export class PerformanceService implements IPerformanceService {
  private queryHistory: QueryPerformance[] = [];
  private systemMetricsHistory: SystemMetrics[] = [];
  private readonly config = getConfig();
  private readonly maxHistorySize = 10000;
  private readonly slowQueryThreshold = 1000; // 1 second
  private metricsInterval?: ReturnType<typeof setInterval>;

  constructor() {
    // Start periodic system metrics collection
    this.startMetricsCollection();
  }

  /**
   * Record a database query performance
   */
  async recordQuery(query: QueryPerformance): Promise<void> {
    this.queryHistory.push(query);

    // Maintain history size limit
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory = this.queryHistory.slice(-this.maxHistorySize);
    }

    // Log slow queries
    if (query.executionTime > this.slowQueryThreshold) {
      console.warn(`Slow query detected (${query.executionTime}ms):`, {
        sql: query.sql.substring(0, 100) + (query.sql.length > 100 ? '...' : ''),
        executionTime: query.executionTime,
        resultCount: query.resultCount,
        cacheHit: query.cacheHit,
      });
    }
  }

  /**
   * Record current system metrics
   */
  async recordSystemMetrics(): Promise<void> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metrics: SystemMetrics = {
      memoryUsage: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
      },
      cpuUsage: {
        user: cpuUsage.user / 1000000, // Convert to seconds
        system: cpuUsage.system / 1000000,
      },
      uptime: process.uptime(),
      timestamp: new Date(),
    };

    this.systemMetricsHistory.push(metrics);

    // Maintain history size limit
    if (this.systemMetricsHistory.length > this.maxHistorySize) {
      this.systemMetricsHistory = this.systemMetricsHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get comprehensive performance report
   */
  async getPerformanceReport(since?: Date): Promise<PerformanceReport> {
    const cutoffDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    const relevantQueries = this.queryHistory.filter(q => q.timestamp >= cutoffDate);
    const relevantMetrics = this.systemMetricsHistory.filter(m => m.timestamp >= cutoffDate);

    // Calculate summary statistics
    const totalQueries = relevantQueries.length;
    const totalExecutionTime = relevantQueries.reduce((sum, q) => sum + q.executionTime, 0);
    const averageQueryTime = totalQueries > 0 ? totalExecutionTime / totalQueries : 0;

    const slowestQuery = relevantQueries.reduce(
      (slowest, current) =>
        !slowest || current.executionTime > slowest.executionTime ? current : slowest,
      null as QueryPerformance | null
    );

    const fastestQuery = relevantQueries.reduce(
      (fastest, current) =>
        !fastest || current.executionTime < fastest.executionTime ? current : fastest,
      null as QueryPerformance | null
    );

    const cacheHits = relevantQueries.filter(q => q.cacheHit).length;
    const cacheMisses = relevantQueries.filter(q => !q.cacheHit).length;
    const cacheHitRate = totalQueries > 0 ? cacheHits / totalQueries : 0;

    // Get slow queries
    const slowQueries = relevantQueries
      .filter(q => q.executionTime > this.slowQueryThreshold)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    // Get latest system metrics
    const latestMetrics = relevantMetrics[relevantMetrics.length - 1] || {
      memoryUsage: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 },
      cpuUsage: { user: 0, system: 0 },
      uptime: 0,
      timestamp: new Date(),
    };

    // Generate recommendations
    const recommendations = await this.generateRecommendations(relevantQueries, latestMetrics, {
      averageQueryTime,
      cacheHitRate,
      slowQueries: slowQueries.length,
    });

    return {
      summary: {
        totalQueries,
        averageQueryTime,
        slowestQuery,
        fastestQuery,
        cacheHitRate,
        totalCacheHits: cacheHits,
        totalCacheMisses: cacheMisses,
      },
      slowQueries,
      systemMetrics: latestMetrics,
      recommendations,
      timeRange: {
        start: cutoffDate,
        end: new Date(),
      },
    };
  }

  /**
   * Get slow queries above threshold
   */
  async getSlowQueries(
    limit: number = 10,
    threshold: number = this.slowQueryThreshold
  ): Promise<QueryPerformance[]> {
    return this.queryHistory
      .filter(q => q.executionTime > threshold)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * Clear all performance metrics
   */
  async clearMetrics(): Promise<void> {
    this.queryHistory = [];
    this.systemMetricsHistory = [];
  }

  /**
   * Get optimization recommendations
   */
  async getRecommendations(): Promise<string[]> {
    const report = await this.getPerformanceReport();
    return report.recommendations;
  }

  /**
   * Generate performance optimization recommendations
   */
  private async generateRecommendations(
    queries: QueryPerformance[],
    systemMetrics: SystemMetrics,
    summary: { averageQueryTime: number; cacheHitRate: number; slowQueries: number }
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Query performance recommendations
    if (summary.averageQueryTime > 500) {
      recommendations.push(
        `Average query time is high (${summary.averageQueryTime.toFixed(1)}ms). Consider adding database indexes or optimizing query patterns.`
      );
    }

    if (summary.slowQueries > 0) {
      recommendations.push(
        `Found ${summary.slowQueries} slow queries (>1s). Review and optimize these queries or add appropriate indexes.`
      );
    }

    // Cache recommendations
    if (summary.cacheHitRate < 0.7) {
      recommendations.push(
        `Cache hit rate is low (${(summary.cacheHitRate * 100).toFixed(1)}%). Consider increasing cache TTL or cache size.`
      );
    }

    if (summary.cacheHitRate < 0.3) {
      recommendations.push(
        'Very low cache hit rate detected. Review caching strategy and ensure frequently accessed data is cached.'
      );
    }

    // Memory recommendations
    const heapUsageRatio = systemMetrics.memoryUsage.heapUsed / systemMetrics.memoryUsage.heapTotal;
    if (heapUsageRatio > 0.8) {
      recommendations.push(
        `High heap usage detected (${(heapUsageRatio * 100).toFixed(1)}%). Consider reducing cache size or optimizing memory usage.`
      );
    }

    const totalMemoryMB = systemMetrics.memoryUsage.rss / 1024 / 1024;
    if (totalMemoryMB > 500) {
      recommendations.push(
        `High memory usage detected (${totalMemoryMB.toFixed(1)}MB). Monitor for memory leaks and optimize data structures.`
      );
    }

    // Query pattern recommendations
    const searchQueries = queries.filter(q => q.sql.toLowerCase().includes('like'));
    if (searchQueries.length > queries.length * 0.5) {
      recommendations.push(
        'High number of LIKE queries detected. Consider implementing full-text search for better performance.'
      );
    }

    const countQueries = queries.filter(q => q.sql.toLowerCase().includes('count('));
    if (countQueries.length > 10) {
      recommendations.push(
        'Many COUNT queries detected. Consider caching count results or using estimated counts where exact counts are not required.'
      );
    }

    // Connection recommendations
    const uniqueQueries = new Set(queries.map(q => q.sql)).size;
    const totalQueries = queries.length;
    if (uniqueQueries < totalQueries * 0.3) {
      recommendations.push(
        'Many repeated queries detected. Ensure proper caching is enabled for frequently executed queries.'
      );
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        'Performance looks good! No specific optimizations recommended at this time.'
      );
    }

    return recommendations;
  }

  /**
   * Start periodic system metrics collection
   */
  private startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.recordSystemMetrics().catch(error => {
        console.error('Error collecting system metrics:', error);
      });
    }, 30000);
  }

  /**
   * Create a performance tracking wrapper for functions
   */
  static createPerformanceWrapper<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    operationName: string,
    performanceService?: PerformanceService
  ): T {
    return (async (...args: Parameters<T>) => {
      const startTime = Date.now();
      let resultCount = 0;
      let error: Error | null = null;

      try {
        const result = await fn(...args);

        // Try to determine result count
        if (Array.isArray(result)) {
          resultCount = result.length;
        } else if (result && typeof result === 'object' && 'length' in result) {
          resultCount = (result as { length: number }).length;
        } else if (result) {
          resultCount = 1;
        }

        return result;
      } catch (err) {
        error = err as Error;
        throw err;
      } finally {
        const executionTime = Date.now() - startTime;

        if (performanceService) {
          await performanceService.recordQuery({
            sql: operationName,
            executionTime,
            timestamp: new Date(),
            resultCount,
            cacheHit: false, // This would be determined by the actual implementation
            parameters: args,
          });
        }

        // Log performance for debugging
        if (executionTime > 1000 || error) {
          console.log(`Performance: ${operationName} took ${executionTime}ms`, {
            resultCount,
            error: error?.message,
            args: args.length,
          });
        }
      }
    }) as T;
  }

  /**
   * Cleanup resources and stop background tasks
   */
  dispose(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
  }
}
