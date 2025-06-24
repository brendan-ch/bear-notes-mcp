import { getConfig } from '../config/index.js';

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  totalSets: number;
  totalDeletes: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  enableMetrics?: boolean;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getStats(): Promise<CacheStats>;
  invalidatePattern(pattern: string): Promise<number>;
  warmup(keys: string[]): Promise<void>;
}

/**
 * High-performance in-memory cache service with LRU eviction and TTL support
 */
export class CacheService implements ICacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly config = getConfig();
  private readonly maxSize: number;
  private readonly defaultTtl: number;
  private readonly enableMetrics: boolean;

  // Performance metrics
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    memoryPeakUsage: 0,
  };

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize !== undefined ? options.maxSize : 1000;
    this.defaultTtl = options.ttl || this.config.performance.cacheTtl * 1000; // Convert to ms
    this.enableMetrics = options.enableMetrics !== false;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.metrics.evictions++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Move to end (most recently used) for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.metrics.hits++;
    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    // Don't cache if max size is 0 (disabled cache)
    if (this.maxSize === 0) {
      this.metrics.sets++;
      return;
    }

    const ttl = options.ttl !== undefined ? options.ttl : this.defaultTtl;
    const timestamp = Date.now();

    // Don't cache if TTL is 0 (immediate expiration)
    if (ttl === 0) {
      this.metrics.sets++;
      return;
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp,
      ttl,
      accessCount: 0,
      lastAccessed: timestamp,
    };

    // Remove existing entry if it exists
    this.cache.delete(key);

    this.cache.set(key, entry);
    this.metrics.sets++;

    // Ensure we don't exceed max size after adding
    await this.enforceMaxSize();

    // Update memory usage tracking
    this.updateMemoryMetrics();
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.metrics.deletes++;
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.metrics.deletes += size;
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.metrics.evictions++;
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    // Clean up expired entries first
    await this.cleanupExpired();

    const entries = Array.from(this.cache.values());
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      totalHits: this.metrics.hits,
      totalMisses: this.metrics.misses,
      totalSets: this.metrics.sets,
      totalDeletes: this.metrics.deletes,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0,
    };
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.metrics.deletes += deletedCount;
    return deletedCount;
  }

  /**
   * Warmup cache with specified keys (placeholder for future implementation)
   */
  async warmup(keys: string[]): Promise<void> {
    // This would be implemented to pre-populate cache with frequently accessed data
    // For now, it's a placeholder for the interface
    console.log(`Cache warmup requested for ${keys.length} keys`);
  }

  /**
   * Generate cache key for database queries
   */
  static generateQueryKey(sql: string, params: unknown[] = []): string {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    const paramStr = JSON.stringify(params);
    return `query:${Buffer.from(normalizedSql + paramStr).toString('base64')}`;
  }

  /**
   * Generate cache key for note operations
   */
  static generateNoteKey(operation: string, ...args: unknown[]): string {
    const argStr = args.map(arg => String(arg)).join(':');
    return `note:${operation}:${argStr}`;
  }

  /**
   * Generate cache key for search operations
   */
  static generateSearchKey(operation: string, query: string, options: object = {}): string {
    const optionsStr = JSON.stringify(options);
    return `search:${operation}:${Buffer.from(query + optionsStr).toString('base64')}`;
  }

  /**
   * Generate cache key for tag operations
   */
  static generateTagKey(operation: string, ...args: unknown[]): string {
    const argStr = args.map(arg => String(arg)).join(':');
    return `tag:${operation}:${argStr}`;
  }

  /**
   * Check if cache entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Enforce maximum cache size using LRU eviction
   */
  private async enforceMaxSize(): Promise<void> {
    while (this.cache.size > this.maxSize) {
      // Remove the least recently used entry (first entry in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.metrics.evictions++;
      } else {
        break;
      }
    }
  }

  /**
   * Clean up expired entries
   */
  private async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.metrics.evictions++;
    }
  }

  /**
   * Estimate memory usage of cache
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key size + JSON.stringify size of data
      totalSize += key.length * 2; // UTF-16 characters
      try {
        totalSize += JSON.stringify(entry.data).length * 2;
      } catch {
        totalSize += 1000; // Fallback for non-serializable data
      }
      totalSize += 64; // Overhead for entry metadata
    }

    return totalSize;
  }

  /**
   * Update memory usage metrics
   */
  private updateMemoryMetrics(): void {
    const currentUsage = this.estimateMemoryUsage();
    if (currentUsage > this.metrics.memoryPeakUsage) {
      this.metrics.memoryPeakUsage = currentUsage;
    }
  }
} 