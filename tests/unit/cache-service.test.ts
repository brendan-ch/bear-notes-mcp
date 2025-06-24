import { CacheService } from '../../src/services/cache-service.js';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService({
      maxSize: 5,
      ttl: 1000, // 1 second for testing
      enableMetrics: true,
    });
  });

  afterEach(async () => {
    await cacheService.clear();
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await cacheService.set('key1', 'value1');
      const result = await cacheService.get('key1');

      expect(result).toBe('value1');
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheService.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      await cacheService.set('key1', 'value1');
      const deleted = await cacheService.delete('key1');
      const result = await cacheService.get('key1');

      expect(deleted).toBe(true);
      expect(result).toBeNull();
    });

    it('should return false when deleting non-existent keys', async () => {
      const deleted = await cacheService.delete('nonexistent');

      expect(deleted).toBe(false);
    });

    it('should check if keys exist', async () => {
      await cacheService.set('key1', 'value1');

      expect(await cacheService.has('key1')).toBe(true);
      expect(await cacheService.has('nonexistent')).toBe(false);
    });

    it('should clear all values', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');

      await cacheService.clear();

      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      await cacheService.set('key1', 'value1', { ttl: 100 }); // 100ms

      expect(await cacheService.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(await cacheService.get('key1')).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      await cacheService.set('key1', 'value1');

      expect(await cacheService.get('key1')).toBe('value1');

      // Wait for default TTL (1 second)
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(await cacheService.get('key1')).toBeNull();
    });

    it('should handle custom TTL per entry', async () => {
      await cacheService.set('short', 'value1', { ttl: 100 });
      await cacheService.set('long', 'value2', { ttl: 2000 });

      // Wait for short TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(await cacheService.get('short')).toBeNull();
      expect(await cacheService.get('long')).toBe('value2');
    });

    it('should return false for has() on expired entries', async () => {
      await cacheService.set('key1', 'value1', { ttl: 100 });

      expect(await cacheService.has('key1')).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(await cacheService.has('key1')).toBe(false);
    });
  });

  describe('LRU (Least Recently Used) Eviction', () => {
    it('should evict least recently used entries when max size exceeded', async () => {
      // Fill cache to max size (5)
      for (let i = 1; i <= 5; i++) {
        await cacheService.set(`key${i}`, `value${i}`);
      }

      // All entries should be present
      for (let i = 1; i <= 5; i++) {
        expect(await cacheService.get(`key${i}`)).toBe(`value${i}`);
      }

      // Add one more entry, should evict key1 (oldest)
      await cacheService.set('key6', 'value6');

      expect(await cacheService.get('key1')).toBeNull(); // Evicted
      expect(await cacheService.get('key6')).toBe('value6'); // New entry
      expect(await cacheService.get('key2')).toBe('value2'); // Still present
    });

    it('should update LRU order on access', async () => {
      // Fill cache
      for (let i = 1; i <= 5; i++) {
        await cacheService.set(`key${i}`, `value${i}`);
      }

      // Access key1 to make it recently used
      await cacheService.get('key1');

      // Add new entry, should evict key2 (now oldest)
      await cacheService.set('key6', 'value6');

      expect(await cacheService.get('key1')).toBe('value1'); // Should still be present
      expect(await cacheService.get('key2')).toBeNull(); // Should be evicted
    });
  });

  describe('Statistics and Metrics', () => {
    it('should track cache statistics', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.get('key1'); // Hit
      await cacheService.get('nonexistent'); // Miss

      const stats = await cacheService.getStats();

      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(5);
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.totalSets).toBe(1);
      expect(stats.hitRate).toBe(0.5); // 1 hit out of 2 requests
    });

    it('should estimate memory usage', async () => {
      const stats1 = await cacheService.getStats();
      const initialMemory = stats1.memoryUsage;

      await cacheService.set('key1', 'a'.repeat(1000));

      const stats2 = await cacheService.getStats();

      expect(stats2.memoryUsage).toBeGreaterThan(initialMemory);
    });

    it('should track oldest and newest entries', async () => {
      const before = Date.now();

      await cacheService.set('key1', 'value1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await cacheService.set('key2', 'value2');

      const after = Date.now();
      const stats = await cacheService.getStats();

      expect(stats.oldestEntry).toBeGreaterThanOrEqual(before);
      expect(stats.newestEntry).toBeLessThanOrEqual(after);
      expect(stats.newestEntry).toBeGreaterThan(stats.oldestEntry);
    });
  });

  describe('Pattern-based Invalidation', () => {
    it('should invalidate entries matching pattern', async () => {
      await cacheService.set('user:1', 'data1');
      await cacheService.set('user:2', 'data2');
      await cacheService.set('post:1', 'data3');
      await cacheService.set('user:3', 'data4');

      const deletedCount = await cacheService.invalidatePattern('user:*');

      expect(deletedCount).toBe(3);
      expect(await cacheService.get('user:1')).toBeNull();
      expect(await cacheService.get('user:2')).toBeNull();
      expect(await cacheService.get('user:3')).toBeNull();
      expect(await cacheService.get('post:1')).toBe('data3'); // Should remain
    });

    it('should handle complex patterns', async () => {
      await cacheService.set('query:select:notes', 'data1');
      await cacheService.set('query:insert:notes', 'data2');
      await cacheService.set('query:select:tags', 'data3');
      await cacheService.set('cache:config', 'data4');

      const deletedCount = await cacheService.invalidatePattern('query:select:.*');

      expect(deletedCount).toBe(2);
      expect(await cacheService.get('query:select:notes')).toBeNull();
      expect(await cacheService.get('query:select:tags')).toBeNull();
      expect(await cacheService.get('query:insert:notes')).toBe('data2');
      expect(await cacheService.get('cache:config')).toBe('data4');
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent query keys', () => {
      const sql = 'SELECT * FROM notes WHERE id = ?';
      const params = [123];

      const key1 = CacheService.generateQueryKey(sql, params);
      const key2 = CacheService.generateQueryKey(sql, params);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^query:/);
    });

    it('should generate different keys for different queries', () => {
      const key1 = CacheService.generateQueryKey('SELECT * FROM notes', []);
      const key2 = CacheService.generateQueryKey('SELECT * FROM tags', []);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for same query with different params', () => {
      const sql = 'SELECT * FROM notes WHERE id = ?';
      const key1 = CacheService.generateQueryKey(sql, [1]);
      const key2 = CacheService.generateQueryKey(sql, [2]);

      expect(key1).not.toBe(key2);
    });

    it('should normalize SQL whitespace', () => {
      const sql1 = 'SELECT * FROM notes WHERE id = ?';
      const sql2 = 'SELECT   *   FROM   notes   WHERE   id   =   ?';
      const params = [123];

      const key1 = CacheService.generateQueryKey(sql1, params);
      const key2 = CacheService.generateQueryKey(sql2, params);

      expect(key1).toBe(key2);
    });

    it('should generate note operation keys', () => {
      const key1 = CacheService.generateNoteKey('getNotes', 'active', 10);
      const key2 = CacheService.generateNoteKey('getNotes', 'active', 20);

      expect(key1).toMatch(/^note:getNotes:/);
      expect(key1).not.toBe(key2);
    });

    it('should generate search operation keys', () => {
      const key1 = CacheService.generateSearchKey('fullText', 'test query', { limit: 10 });
      const key2 = CacheService.generateSearchKey('fullText', 'test query', { limit: 20 });

      expect(key1).toMatch(/^search:fullText:/);
      expect(key1).not.toBe(key2);
    });

    it('should generate tag operation keys', () => {
      const key1 = CacheService.generateTagKey('getTags');
      const key2 = CacheService.generateTagKey('getNotesByTag', 'work');

      expect(key1).toMatch(/^tag:getTags/);
      expect(key2).toMatch(/^tag:getNotesByTag:/);
      expect(key1).not.toBe(key2);
    });
  });

  describe('Data Types', () => {
    it('should handle different data types', async () => {
      const testData = {
        string: 'test string',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: { value: 'deep' } },
        null: null,
      };

      for (const [key, value] of Object.entries(testData)) {
        await cacheService.set(key, value);
        const retrieved = await cacheService.get(key);
        expect(retrieved).toEqual(value);
      }
    });

    it('should handle large objects', async () => {
      const largeObject = {
        data: 'x'.repeat(10000),
        nested: {
          array: Array(1000)
            .fill(0)
            .map((_, i) => ({ id: i, value: `item${i}` })),
        },
      };

      await cacheService.set('large', largeObject);
      const retrieved = await cacheService.get('large');

      expect(retrieved).toEqual(largeObject);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero max size (disabled cache)', async () => {
      const disabledCache = new CacheService({ maxSize: 0 });

      await disabledCache.set('key1', 'value1');
      const result = await disabledCache.get('key1');

      expect(result).toBeNull();
    });

    it('should handle zero TTL (immediate expiration)', async () => {
      await cacheService.set('key1', 'value1', { ttl: 0 });
      const result = await cacheService.get('key1');

      expect(result).toBeNull();
    });

    it('should handle concurrent operations', async () => {
      const promises: Promise<void>[] = [];

      // Concurrent sets
      for (let i = 0; i < 10; i++) {
        promises.push(cacheService.set(`key${i}`, `value${i}`));
      }

      await Promise.all(promises);

      // Wait a bit for LRU eviction to settle
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify all values (some may be evicted due to max size)
      const stats = await cacheService.getStats();
      expect(stats.size).toBeLessThanOrEqual(5); // Max size
      expect(stats.totalSets).toBe(10);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultCache = new CacheService();
      expect(defaultCache).toBeDefined();
    });

    it('should respect custom configuration', async () => {
      const customCache = new CacheService({
        maxSize: 2,
        ttl: 500,
        enableMetrics: false,
      });

      // Fill beyond max size
      await customCache.set('key1', 'value1');
      await customCache.set('key2', 'value2');
      await customCache.set('key3', 'value3'); // Should evict key1

      expect(await customCache.get('key1')).toBeNull();
      expect(await customCache.get('key2')).toBe('value2');
      expect(await customCache.get('key3')).toBe('value3');
    });
  });
});
