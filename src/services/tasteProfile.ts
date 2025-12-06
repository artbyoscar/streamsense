/**
 * Taste Profile Service
 * Reads from database first, only builds if missing
 */

import { supabase } from './supabase';
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
 * 🆕 Read taste profile from database first
 */
async function readFromDatabase(userId: string): Promise<UserTasteProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.log('[TasteProfile] No database profile found, will compute');
      return null;
    }

    // Transform database row to UserTasteProfile format
    const profile: UserTasteProfile = {
      userId: data.user_id,
      tasteSignature: data.taste_signature || 'Exploring',
      preferredTone: {
        dark: data.pref_tone_dark || 0,
        humorous: data.pref_tone_humorous || 0,
        tense: data.pref_tone_tense || 0,
        emotional: data.pref_tone_emotional || 0,
        cerebral: data.pref_tone_cerebral || 0,
        escapist: data.pref_tone_escapist || 0,
      },
      preferredThemes: {
        redemption: data.pref_theme_redemption || 0,
        revenge: data.pref_theme_revenge || 0,
        family: data.pref_theme_family || 0,
        identity: data.pref_theme_identity || 0,
        survival: data.pref_theme_survival || 0,
        love: data.pref_theme_love || 0,
        power: data.pref_theme_power || 0,
        justice: data.pref_theme_justice || 0,
        isolation: data.pref_theme_isolation || 0,
        technology: data.pref_theme_technology || 0,
        nature: data.pref_theme_nature || 0,
        war: data.pref_theme_war || 0,
        coming_of_age: data.pref_theme_coming_of_age || 0,
        betrayal: data.pref_theme_betrayal || 0,
        discovery: data.pref_theme_discovery || 0,
        sacrifice: data.pref_theme_sacrifice || 0,
      },
      preferredPacing: {
        slow: data.pref_pacing_slow || 0,
        medium: data.pref_pacing_medium || 0,
        fast: data.pref_pacing_fast || 0,
      },
      topGenres: data.top_genres || [],
      discoveryOpportunities: data.discovery_opportunities || [],
      confidence: data.confidence || 0,
      sampleSize: data.sample_size || 0,
      favoriteActors: data.favorite_actors || [],
      favoriteDirectors: data.favorite_directors || [],
    };

    console.log('[TasteProfile] ✅ Loaded from database:', profile.tasteSignature);
    return profile;
  } catch (error) {
    console.error('[TasteProfile] Database read error:', error);
    return null;
  }
}

/**
 * Get user taste profile with caching
 * 🔧 FIX: Reads from database FIRST, only computes if missing
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

  // 🆕 FIRST: Try to read from database
  const dbProfile = await readFromDatabase(userId);
  if (dbProfile) {
    tasteProfileCache.set(userId, {
      profile: dbProfile,
      timestamp: Date.now(),
      isBuilding: false,
    });
    return dbProfile;
  }

  // FALLBACK: Build from scratch if no database profile
  return await buildAndCache(userId);
}

/**
 * Build and cache taste profile (only called if no database profile)
 */
async function buildAndCache(userId: string): Promise<UserTasteProfile | null> {
  tasteProfileCache.set(userId, {
    profile: tasteProfileCache.get(userId)?.profile || null,
    timestamp: 0,
    isBuilding: true,
  });

  try {
    console.log('[TasteProfile] Building fresh profile (no database record)...');
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
