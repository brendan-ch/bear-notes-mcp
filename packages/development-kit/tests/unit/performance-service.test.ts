import { PerformanceService, QueryPerformance, SystemMetrics } from '../../src/services/performance-service.js';

describe('PerformanceService', () => {
  let performanceService: PerformanceService;

  beforeEach(() => {
    performanceService = new PerformanceService();
  });

  afterEach(async () => {
    await performanceService.clearMetrics();
  });

  describe('Query Performance Tracking', () => {
    it('should record query performance', async () => {
      const queryPerf: QueryPerformance = {
        sql: 'SELECT * FROM ZSFNOTE',
        executionTime: 150,
        timestamp: new Date(),
        resultCount: 10,
        cacheHit: false,
        parameters: [],
      };

      await performanceService.recordQuery(queryPerf);

      const report = await performanceService.getPerformanceReport();
      expect(report.summary.totalQueries).toBe(1);
      expect(report.summary.averageQueryTime).toBe(150);
    });

    it('should track multiple queries', async () => {
      const queries: QueryPerformance[] = [
        {
          sql: 'SELECT * FROM ZSFNOTE',
          executionTime: 100,
          timestamp: new Date(),
          resultCount: 5,
          cacheHit: false,
        },
        {
          sql: 'SELECT * FROM ZSFNOTETAG',
          executionTime: 200,
          timestamp: new Date(),
          resultCount: 3,
          cacheHit: true,
        },
        {
          sql: 'SELECT COUNT(*) FROM ZSFNOTE',
          executionTime: 50,
          timestamp: new Date(),
          resultCount: 1,
          cacheHit: false,
        },
      ];

      for (const query of queries) {
        await performanceService.recordQuery(query);
      }

      const report = await performanceService.getPerformanceReport();
      expect(report.summary.totalQueries).toBe(3);
      expect(report.summary.averageQueryTime).toBeCloseTo(116.67, 2); // (100+200+50)/3
      expect(report.summary.cacheHitRate).toBe(1/3); // 1 hit out of 3
    });

    it('should identify slowest and fastest queries', async () => {
      const queries: QueryPerformance[] = [
        {
          sql: 'FAST QUERY',
          executionTime: 10,
          timestamp: new Date(),
          resultCount: 1,
          cacheHit: false,
        },
        {
          sql: 'SLOW QUERY',
          executionTime: 2000,
          timestamp: new Date(),
          resultCount: 100,
          cacheHit: false,
        },
        {
          sql: 'MEDIUM QUERY',
          executionTime: 500,
          timestamp: new Date(),
          resultCount: 50,
          cacheHit: false,
        },
      ];

      for (const query of queries) {
        await performanceService.recordQuery(query);
      }

      const report = await performanceService.getPerformanceReport();
      expect(report.summary.slowestQuery?.sql).toBe('SLOW QUERY');
      expect(report.summary.slowestQuery?.executionTime).toBe(2000);
      expect(report.summary.fastestQuery?.sql).toBe('FAST QUERY');
      expect(report.summary.fastestQuery?.executionTime).toBe(10);
    });

    it('should track cache hit rates', async () => {
      const queries: QueryPerformance[] = [
        { sql: 'Q1', executionTime: 100, timestamp: new Date(), resultCount: 1, cacheHit: true },
        { sql: 'Q2', executionTime: 100, timestamp: new Date(), resultCount: 1, cacheHit: true },
        { sql: 'Q3', executionTime: 100, timestamp: new Date(), resultCount: 1, cacheHit: false },
        { sql: 'Q4', executionTime: 100, timestamp: new Date(), resultCount: 1, cacheHit: false },
      ];

      for (const query of queries) {
        await performanceService.recordQuery(query);
      }

      const report = await performanceService.getPerformanceReport();
      expect(report.summary.totalCacheHits).toBe(2);
      expect(report.summary.totalCacheMisses).toBe(2);
      expect(report.summary.cacheHitRate).toBe(0.5);
    });
  });

  describe('Slow Query Detection', () => {
    it('should identify slow queries', async () => {
      const queries: QueryPerformance[] = [
        {
          sql: 'FAST QUERY',
          executionTime: 100,
          timestamp: new Date(),
          resultCount: 1,
          cacheHit: false,
        },
        {
          sql: 'SLOW QUERY 1',
          executionTime: 1500,
          timestamp: new Date(),
          resultCount: 100,
          cacheHit: false,
        },
        {
          sql: 'SLOW QUERY 2',
          executionTime: 2000,
          timestamp: new Date(),
          resultCount: 200,
          cacheHit: false,
        },
      ];

      for (const query of queries) {
        await performanceService.recordQuery(query);
      }

      const slowQueries = await performanceService.getSlowQueries(10, 1000);
      expect(slowQueries).toHaveLength(2);
      expect(slowQueries[0].sql).toBe('SLOW QUERY 2'); // Sorted by execution time desc
      expect(slowQueries[1].sql).toBe('SLOW QUERY 1');
    });

    it('should limit slow query results', async () => {
      for (let i = 1; i <= 5; i++) {
        await performanceService.recordQuery({
          sql: `SLOW QUERY ${i}`,
          executionTime: 1000 + i * 100,
          timestamp: new Date(),
          resultCount: 10,
          cacheHit: false,
        });
      }

      const slowQueries = await performanceService.getSlowQueries(3);
      expect(slowQueries).toHaveLength(3);
      expect(slowQueries[0].sql).toBe('SLOW QUERY 5'); // Slowest first
    });

    it('should respect custom threshold', async () => {
      await performanceService.recordQuery({
        sql: 'MEDIUM QUERY',
        executionTime: 800,
        timestamp: new Date(),
        resultCount: 10,
        cacheHit: false,
      });

      const slowQueries1 = await performanceService.getSlowQueries(10, 1000);
      const slowQueries2 = await performanceService.getSlowQueries(10, 500);

      expect(slowQueries1).toHaveLength(0); // 800ms < 1000ms threshold
      expect(slowQueries2).toHaveLength(1); // 800ms > 500ms threshold
    });
  });

  describe('System Metrics', () => {
    it('should record system metrics', async () => {
      await performanceService.recordSystemMetrics();

      const report = await performanceService.getPerformanceReport();
      expect(report.systemMetrics).toBeDefined();
      expect(report.systemMetrics.memoryUsage).toBeDefined();
      expect(report.systemMetrics.cpuUsage).toBeDefined();
      expect(report.systemMetrics.uptime).toBeGreaterThan(0);
    });

    it('should track memory usage', async () => {
      await performanceService.recordSystemMetrics();

      const report = await performanceService.getPerformanceReport();
      const memory = report.systemMetrics.memoryUsage;

      expect(memory.rss).toBeGreaterThan(0);
      expect(memory.heapUsed).toBeGreaterThan(0);
      expect(memory.heapTotal).toBeGreaterThan(0);
      expect(memory.external).toBeGreaterThanOrEqual(0);
    });

    it('should track CPU usage', async () => {
      await performanceService.recordSystemMetrics();

      const report = await performanceService.getPerformanceReport();
      const cpu = report.systemMetrics.cpuUsage;

      expect(cpu.user).toBeGreaterThanOrEqual(0);
      expect(cpu.system).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Reports', () => {
    it('should generate comprehensive performance report', async () => {
      // Add some test data
      await performanceService.recordQuery({
        sql: 'SELECT * FROM ZSFNOTE',
        executionTime: 150,
        timestamp: new Date(),
        resultCount: 10,
        cacheHit: false,
      });

      await performanceService.recordSystemMetrics();

      const report = await performanceService.getPerformanceReport();

      expect(report.summary).toBeDefined();
      expect(report.slowQueries).toBeDefined();
      expect(report.systemMetrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.timeRange).toBeDefined();
      expect(report.timeRange.start).toBeInstanceOf(Date);
      expect(report.timeRange.end).toBeInstanceOf(Date);
    });

    it('should filter by time range', async () => {
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      // Add old query
      await performanceService.recordQuery({
        sql: 'OLD QUERY',
        executionTime: 100,
        timestamp: oldDate,
        resultCount: 1,
        cacheHit: false,
      });

      // Add recent query
      await performanceService.recordQuery({
        sql: 'RECENT QUERY',
        executionTime: 200,
        timestamp: recentDate,
        resultCount: 1,
        cacheHit: false,
      });

      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const report = await performanceService.getPerformanceReport(cutoff);

      expect(report.summary.totalQueries).toBe(1); // Only recent query
    });

    it('should handle empty data gracefully', async () => {
      const report = await performanceService.getPerformanceReport();

      expect(report.summary.totalQueries).toBe(0);
      expect(report.summary.averageQueryTime).toBe(0);
      expect(report.summary.slowestQuery).toBeNull();
      expect(report.summary.fastestQuery).toBeNull();
      expect(report.slowQueries).toHaveLength(0);
    });
  });

  describe('Optimization Recommendations', () => {
    it('should recommend optimizations for high average query time', async () => {
      // Add slow queries
      for (let i = 0; i < 5; i++) {
        await performanceService.recordQuery({
          sql: `SLOW QUERY ${i}`,
          executionTime: 800, // High average
          timestamp: new Date(),
          resultCount: 10,
          cacheHit: false,
        });
      }

      const recommendations = await performanceService.getRecommendations();
      const hasQueryTimeRecommendation = recommendations.some(r => 
        r.includes('Average query time is high')
      );

      expect(hasQueryTimeRecommendation).toBe(true);
    });

    it('should recommend optimizations for slow queries', async () => {
      await performanceService.recordQuery({
        sql: 'VERY SLOW QUERY',
        executionTime: 2000, // Above 1s threshold
        timestamp: new Date(),
        resultCount: 100,
        cacheHit: false,
      });

      const recommendations = await performanceService.getRecommendations();
      const hasSlowQueryRecommendation = recommendations.some(r => 
        r.includes('slow queries')
      );

      expect(hasSlowQueryRecommendation).toBe(true);
    });

    it('should recommend cache improvements for low hit rate', async () => {
      // Add queries with low cache hit rate
      for (let i = 0; i < 10; i++) {
        await performanceService.recordQuery({
          sql: `QUERY ${i}`,
          executionTime: 100,
          timestamp: new Date(),
          resultCount: 5,
          cacheHit: i < 2, // Only 20% hit rate
        });
      }

      const recommendations = await performanceService.getRecommendations();
      const hasCacheRecommendation = recommendations.some(r => 
        r.includes('Cache hit rate is low')
      );

      expect(hasCacheRecommendation).toBe(true);
    });

    it('should recommend LIKE query optimizations', async () => {
      // Add many LIKE queries
      for (let i = 0; i < 10; i++) {
        await performanceService.recordQuery({
          sql: `SELECT * FROM notes WHERE title LIKE '%search%'`,
          executionTime: 100,
          timestamp: new Date(),
          resultCount: 5,
          cacheHit: false,
        });
      }

      const recommendations = await performanceService.getRecommendations();
      const hasLikeRecommendation = recommendations.some(r => 
        r.includes('LIKE queries detected')
      );

      expect(hasLikeRecommendation).toBe(true);
    });

    it('should recommend COUNT query optimizations', async () => {
      // Add many COUNT queries
      for (let i = 0; i < 15; i++) {
        await performanceService.recordQuery({
          sql: `SELECT COUNT(*) FROM notes`,
          executionTime: 100,
          timestamp: new Date(),
          resultCount: 1,
          cacheHit: false,
        });
      }

      const recommendations = await performanceService.getRecommendations();
      const hasCountRecommendation = recommendations.some(r => 
        r.includes('COUNT queries detected')
      );

      expect(hasCountRecommendation).toBe(true);
    });

    it('should detect repeated queries', async () => {
      // Add many identical queries
      for (let i = 0; i < 10; i++) {
        await performanceService.recordQuery({
          sql: 'SELECT * FROM notes WHERE id = 1',
          executionTime: 100,
          timestamp: new Date(),
          resultCount: 1,
          cacheHit: false,
        });
      }

      const recommendations = await performanceService.getRecommendations();
      const hasRepeatedQueryRecommendation = recommendations.some(r => 
        r.includes('repeated queries detected')
      );

      expect(hasRepeatedQueryRecommendation).toBe(true);
    });

    it('should provide positive feedback for good performance', async () => {
      // Add a few fast queries with good cache hit rate
      for (let i = 0; i < 3; i++) {
        await performanceService.recordQuery({
          sql: `FAST QUERY ${i}`,
          executionTime: 50, // Fast
          timestamp: new Date(),
          resultCount: 5,
          cacheHit: true, // Good cache hit rate
        });
      }

      await performanceService.recordSystemMetrics();

      const recommendations = await performanceService.getRecommendations();
      const hasPositiveFeedback = recommendations.some(r => 
        r.includes('Performance looks good')
      );

      expect(hasPositiveFeedback).toBe(true);
    });
  });

  describe('Performance Wrapper', () => {
    it('should create performance tracking wrapper', async () => {
      let executionCount = 0;
      
      const testFunction = async (...args: unknown[]): Promise<string[]> => {
        executionCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
        const [arg1, arg2] = args as [string, number];
        return [`${arg1}_${arg2}`];
      };

      const wrappedFunction = PerformanceService.createPerformanceWrapper(
        testFunction,
        'testOperation',
        performanceService
      );

      const result = await wrappedFunction('test', 123);

      expect(result).toEqual(['test_123']);
      expect(executionCount).toBe(1);

      // Check that performance was recorded
      const report = await performanceService.getPerformanceReport();
      expect(report.summary.totalQueries).toBe(1);
      expect(report.summary.averageQueryTime).toBeGreaterThan(90); // Should be around 100ms
    });

    it('should handle function errors in wrapper', async () => {
      const errorFunction = async (): Promise<void> => {
        throw new Error('Test error');
      };

      const wrappedFunction = PerformanceService.createPerformanceWrapper(
        errorFunction,
        'errorOperation',
        performanceService
      );

      await expect(wrappedFunction()).rejects.toThrow('Test error');

      // Performance should still be recorded
      const report = await performanceService.getPerformanceReport();
      expect(report.summary.totalQueries).toBe(1);
    });

    it('should work without performance service', async () => {
      const testFunction = async (): Promise<string> => {
        return 'result';
      };

      const wrappedFunction = PerformanceService.createPerformanceWrapper(
        testFunction,
        'testOperation'
        // No performance service provided
      );

      const result = await wrappedFunction();
      expect(result).toBe('result');
    });
  });

  describe('Metrics Management', () => {
    it('should clear all metrics', async () => {
      // Add some data
      await performanceService.recordQuery({
        sql: 'TEST QUERY',
        executionTime: 100,
        timestamp: new Date(),
        resultCount: 1,
        cacheHit: false,
      });

      await performanceService.recordSystemMetrics();

      // Verify data exists
      let report = await performanceService.getPerformanceReport();
      expect(report.summary.totalQueries).toBe(1);

      // Clear and verify
      await performanceService.clearMetrics();
      report = await performanceService.getPerformanceReport();
      expect(report.summary.totalQueries).toBe(0);
    });

    it('should maintain history size limits', async () => {
      // This test would need access to private properties to fully verify
      // For now, we just ensure it doesn't crash with many entries
      for (let i = 0; i < 100; i++) {
        await performanceService.recordQuery({
          sql: `QUERY ${i}`,
          executionTime: 100,
          timestamp: new Date(),
          resultCount: 1,
          cacheHit: false,
        });
      }

      const report = await performanceService.getPerformanceReport();
      expect(report.summary.totalQueries).toBe(100);
    });
  });
}); 