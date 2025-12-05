/**
 * Taste Profile Service
 * Provides caching layer for user taste profiles to avoid expensive rebuilds
 */

import { contentDNAService } from './contentDNA';
import type { UserTasteProfile } from './contentDNA';

// ============================================================================
// TASTE PROFILE CACHING
// ============================================================================

const tasteProfileCache = new Map<string, {
  profile: UserTasteProfile | null;
  timestamp: number;
  isBuilding: boolean;
}>();

const TASTE_PROFILE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get user taste profile with caching
 * Uses stale-while-revalidate pattern for optimal performance
 */
export async function getTasteProfile(
  userId: string,
  watchlistItems?: any[],
  options: { forceRefresh?: boolean } = {}
): Promise<UserTasteProfile | null> {
  const now = Date.now();
  const cached = tasteProfileCache.get(userId);

  // Return cached if valid
  if (cached && !options.forceRefresh) {
    const age = now - cached.timestamp;

    if (age < TASTE_PROFILE_TTL) {
      console.log(`[TasteProfile] Using cached profile (age: ${Math.round(age / 1000)}s)`);

      // Background refresh if getting stale (>20 min)
      if (age > 20 * 60 * 1000 && !cached.isBuilding) {
        refreshInBackground(userId);
      }

      return cached.profile;
    }
  }

  // If already building, return stale cache
  if (cached?.isBuilding) {
    console.log('[TasteProfile] Build in progress, returning stale cache');
    return cached.profile || null;
  }

  // Build fresh
  return await buildAndCache(userId);
}

/**
 * Build and cache taste profile
 */
async function buildAndCache(userId: string): Promise<UserTasteProfile | null> {
  tasteProfileCache.set(userId, {
    profile: tasteProfileCache.get(userId)?.profile || null,
    timestamp: 0,
    isBuilding: true,
  });

  try {
    console.log('[TasteProfile] Building fresh profile...');
    const profile = await contentDNAService.buildUserTasteProfile(userId);

    tasteProfileCache.set(userId, {
      profile,
      timestamp: Date.now(),
      isBuilding: false,
    });

    console.log('[TasteProfile] Profile cached successfully');
    return profile;
  } catch (error) {
    console.error('[TasteProfile] Build failed:', error);
    const cached = tasteProfileCache.get(userId);
    if (cached) cached.isBuilding = false;
    return null;
  }
}

/**
 * Refresh profile in background (non-blocking)
 */
function refreshInBackground(userId: string): void {
  console.log('[TasteProfile] Starting background refresh...');
  buildAndCache(userId).catch(error => {
    console.error('[TasteProfile] Background refresh failed:', error);
  });
}

/**
 * Clear cache for a specific user or all users
 */
export function clearTasteProfileCache(userId?: string): void {
  if (userId) {
    tasteProfileCache.delete(userId);
    console.log(`[TasteProfile] Cache cleared for user: ${userId}`);
  } else {
    tasteProfileCache.clear();
    console.log('[TasteProfile] All taste profile caches cleared');
  }
}

/**
 * Get cache statistics
 */
export function getTasteProfileCacheStats(): {
  size: number;
  entries: Array<{ userId: string; age: number; isBuilding: boolean }>;
} {
  const now = Date.now();
  const entries = Array.from(tasteProfileCache.entries()).map(([userId, data]) => ({
    userId,
    age: Math.round((now - data.timestamp) / 1000),
    isBuilding: data.isBuilding,
  }));

  return {
    size: tasteProfileCache.size,
    entries,
  };
}
