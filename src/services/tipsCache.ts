/**
 * Tips Cache Service
 * Simple in-memory cache for Tips page data to enable instant loading
 */

class TipsCache {
  private cache: Map<string, any> = new Map();

  set(key: string, value: any) {
    this.cache.set(key, value);
    console.log(`[TipsCache] Cached ${key}:`, value?.length || 0, 'items');
  }

  get(key: string) {
    const value = this.cache.get(key);
    console.log(`[TipsCache] Retrieved ${key}:`, value?.length || 0, 'items');
    return value;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear() {
    console.log('[TipsCache] Clearing all cached data');
    this.cache.clear();
  }

  clearKey(key: string) {
    console.log(`[TipsCache] Clearing ${key}`);
    this.cache.delete(key);
  }
}

export const tipsCache = new TipsCache();
