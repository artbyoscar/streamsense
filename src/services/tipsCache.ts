/**
 * Tips Cache Service
 * In-memory cache with time-based expiration for Tips page data
 */

// Cache duration: 4 hours (instead of 24 hours)
const CACHE_DURATION = 4 * 60 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

class TipsCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set(key: string, value: any) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
    console.log(`[TipsCache] Cached ${key}:`, value?.length || 0, 'items');
  }

  get(key: string) {
    const entry = this.cache.get(key);

    if (!entry) {
      console.log(`[TipsCache] Cache miss for ${key}`);
      return undefined;
    }

    // Check if cache is expired
    const age = Date.now() - entry.timestamp;
    const isExpired = age > CACHE_DURATION;

    if (isExpired) {
      console.log(`[TipsCache] Cache expired for ${key} (age: ${Math.round(age / 1000 / 60)} minutes)`);
      this.cache.delete(key);
      return undefined;
    }

    console.log(`[TipsCache] Retrieved ${key}:`, entry.value?.length || 0, 'items (age: ${Math.round(age / 1000 / 60)} minutes)');
    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > CACHE_DURATION) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear() {
    console.log('[TipsCache] Clearing all cached data');
    this.cache.clear();
  }

  clearKey(key: string) {
    console.log(`[TipsCache] Clearing ${key}`);
    this.cache.delete(key);
  }

  /**
   * Manual refresh - clears blindspots cache
   * Call this when user wants to see new recommendations
   */
  refreshBlindspots() {
    this.clearKey('blindspots');
    console.log('[TipsCache] Blindspots cache cleared for refresh');
  }
}

export const tipsCache = new TipsCache();
