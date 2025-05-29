// Internal request-level cache for ORM operations
// Not exported in the public API

/**
 * RequestCache provides a simple, type-safe key-value cache for the duration of a request/context.
 * Keys must be strings. Values are generic.
 * Not safe for cross-request or global use.
 *
 * @internal
 */
export class RequestCache {
  private store = new Map<string, unknown>();
  /**
   * Reverse index: table:id -> Set of cache keys referencing that record
   */
  private reverseIndex = new Map<string, Set<string>>();

  /**
   * Get a value from the cache by key.
   * @param key - The cache key
   */
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  /**
   * Set a value in the cache.
   * @param key - The cache key
   * @param value - The value to cache
   */
  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  /**
   * Check if a key exists in the cache.
   * @param key - The cache key
   */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /**
   * Remove a key from the cache.
   * @param key - The cache key
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Register a cache key as referencing a specific table/id.
   * Used for granular invalidation.
   * @param table - Table/model name
   * @param id - Primary key value
   * @param cacheKey - The cache key to register
   */
  registerKeyForId(table: string, id: string | number, cacheKey: string): void {
    const indexKey = `${table}:${id}`;
    if (!this.reverseIndex.has(indexKey)) {
      this.reverseIndex.set(indexKey, new Set());
    }
    this.reverseIndex.get(indexKey)!.add(cacheKey);
  }

  /**
   * Invalidate all cache keys referencing a specific table/id.
   * @param table - Table/model name
   * @param id - Primary key value
   */
  invalidateKeysForId(table: string, id: string | number): void {
    const indexKey = `${table}:${id}`;
    const keys = this.reverseIndex.get(indexKey);
    if (keys) {
      for (const key of keys) {
        this.store.delete(key);
      }
      this.reverseIndex.delete(indexKey);
    }
  }
}
