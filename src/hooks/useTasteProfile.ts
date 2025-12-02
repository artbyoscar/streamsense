/**
 * Taste Profile Hook
 * Manages user taste profile with stale-while-revalidate caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/config/supabase';
import { recommendationOrchestrator } from '@/services/recommendationOrchestrator';
import type { UserTasteProfile } from '@/services/contentDNAService';

// ============================================================================
// CONSTANTS
// ============================================================================

const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours
const BACKGROUND_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// TYPES
// ============================================================================

interface TasteProfileState {
  profile: UserTasteProfile | null;
  isLoading: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
}

interface UseTasteProfileReturn {
  profile: UserTasteProfile | null;
  isLoading: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  refreshProfile: () => Promise<void>;
  updateAfterInteraction: (tmdbId: number, interactionType: 'watched' | 'rated') => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export const useTasteProfile = (userId: string | undefined): UseTasteProfileReturn => {
  const [state, setState] = useState<TasteProfileState>({
    profile: null,
    isLoading: true,
    isStale: false,
    lastUpdated: null,
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  /**
   * Check if profile is stale (>6 hours old)
   */
  const isProfileStale = useCallback((updatedAt: string | null): boolean => {
    if (!updatedAt) return true;

    const lastUpdate = new Date(updatedAt);
    const now = new Date();
    const age = now.getTime() - lastUpdate.getTime();

    return age > STALE_THRESHOLD_MS;
  }, []);

  /**
   * Load profile from Supabase cache
   */
  const loadProfileFromCache = useCallback(async (): Promise<UserTasteProfile | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('user_taste_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        console.error('[TasteProfile] Error loading profile from cache:', error);
        return null;
      }

      if (!data) {
        console.log('[TasteProfile] No profile found in cache for user:', userId);
        return null;
      }

      // Convert database format to UserTasteProfile
      const profile: UserTasteProfile = {
        userId: data.user_id,
        preferences: {
          tone: {
            dark: data.pref_tone_dark || 0,
            humorous: data.pref_tone_humorous || 0,
            serious: data.pref_tone_serious || 0,
            lighthearted: data.pref_tone_lighthearted || 0,
            suspenseful: data.pref_tone_suspenseful || 0,
            emotional: data.pref_tone_emotional || 0,
          },
          themes: {
            redemption: data.pref_theme_redemption || 0,
            betrayal: data.pref_theme_betrayal || 0,
            sacrifice: data.pref_theme_sacrifice || 0,
            identity: data.pref_theme_identity || 0,
            power: data.pref_theme_power || 0,
            survival: data.pref_theme_survival || 0,
            justice: data.pref_theme_justice || 0,
            loyalty: data.pref_theme_loyalty || 0,
            family: data.pref_theme_family || 0,
            love: data.pref_theme_love || 0,
            loss: data.pref_theme_loss || 0,
            freedom: data.pref_theme_freedom || 0,
            tradition: data.pref_theme_tradition || 0,
            innovation: data.pref_theme_innovation || 0,
            nature: data.pref_theme_nature || 0,
            technology: data.pref_theme_technology || 0,
          },
          setting: {
            urban: data.pref_setting_urban || 0,
            rural: data.pref_setting_rural || 0,
            historical: data.pref_setting_historical || 0,
            contemporary: data.pref_setting_contemporary || 0,
            futuristic: data.pref_setting_futuristic || 0,
          },
          pacing: {
            slow: data.pref_pacing_slow || 0,
            medium: data.pref_pacing_medium || 0,
            fast: data.pref_pacing_fast || 0,
          },
          complexity: {
            simple: data.pref_complexity_simple || 0,
            moderate: data.pref_complexity_moderate || 0,
            complex: data.pref_complexity_complex || 0,
          },
        },
        topGenres: data.top_genres || [],
        topDirectors: data.top_directors || [],
        topActors: data.top_actors || [],
        topKeywords: data.top_keywords || [],
        watchedCount: data.watched_count || 0,
        avgRating: data.avg_rating || 0,
        tasteSignature: data.taste_signature || '',
        confidence: data.confidence || 0,
        discoveryOpportunities: data.discovery_opportunities || [],
      };

      console.log('[TasteProfile] Loaded profile from cache:', {
        userId,
        watchedCount: profile.watchedCount,
        confidence: profile.confidence,
        isStale: isProfileStale(data.updated_at),
      });

      return profile;
    } catch (error) {
      console.error('[TasteProfile] Error loading profile from cache:', error);
      return null;
    }
  }, [userId, isProfileStale]);

  /**
   * Load profile on mount and check staleness
   */
  const loadProfile = useCallback(async () => {
    if (!userId) {
      setState({
        profile: null,
        isLoading: false,
        isStale: false,
        lastUpdated: null,
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Load from cache
      const cachedProfile = await loadProfileFromCache();

      if (!cachedProfile) {
        console.log('[TasteProfile] No cached profile, building new one...');
        await refreshProfile();
        return;
      }

      // Check if stale
      const { data: profileData } = await supabase
        .from('user_taste_profiles')
        .select('updated_at')
        .eq('user_id', userId)
        .single();

      const stale = isProfileStale(profileData?.updated_at || null);

      setState({
        profile: cachedProfile,
        isLoading: false,
        isStale: stale,
        lastUpdated: profileData?.updated_at ? new Date(profileData.updated_at) : null,
      });

      // If stale, refresh in background
      if (stale && !isRefreshingRef.current) {
        console.log('[TasteProfile] Profile is stale, refreshing in background...');
        refreshProfile();
      }
    } catch (error) {
      console.error('[TasteProfile] Error loading profile:', error);
      setState({
        profile: null,
        isLoading: false,
        isStale: false,
        lastUpdated: null,
      });
    }
  }, [userId, loadProfileFromCache, isProfileStale]);

  /**
   * Rebuild profile from all watched content (expensive operation)
   */
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!userId || isRefreshingRef.current) {
      console.log('[TasteProfile] Skipping refresh - already in progress or no user');
      return;
    }

    isRefreshingRef.current = true;

    try {
      console.log('[TasteProfile] Starting full profile rebuild...');

      // Use orchestrator to rebuild profile
      const newProfile = await recommendationOrchestrator.updateUserProfile(userId);

      if (newProfile) {
        setState(prev => ({
          ...prev,
          profile: newProfile,
          isStale: false,
          lastUpdated: new Date(),
        }));

        console.log('[TasteProfile] ✓ Profile rebuilt successfully:', {
          watchedCount: newProfile.watchedCount,
          confidence: newProfile.confidence,
          signature: newProfile.tasteSignature,
        });
      } else {
        console.warn('[TasteProfile] Profile rebuild returned null');
      }
    } catch (error) {
      console.error('[TasteProfile] Error rebuilding profile:', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [userId]);

  /**
   * Lightweight update after single interaction
   * Adjusts weights without full rebuild
   */
  const updateAfterInteraction = useCallback(async (
    tmdbId: number,
    interactionType: 'watched' | 'rated'
  ): Promise<void> => {
    if (!userId) return;

    try {
      console.log(`[TasteProfile] Updating after ${interactionType} interaction for content:`, tmdbId);

      // For now, just trigger a full refresh
      // In the future, this could be optimized to do incremental updates
      await refreshProfile();
    } catch (error) {
      console.error('[TasteProfile] Error updating after interaction:', error);
    }
  }, [userId, refreshProfile]);

  /**
   * Setup background refresh interval
   */
  useEffect(() => {
    if (!userId) return;

    // Initial load
    loadProfile();

    // Setup daily background refresh
    refreshIntervalRef.current = setInterval(() => {
      console.log('[TasteProfile] Daily background refresh triggered');
      refreshProfile();
    }, BACKGROUND_REFRESH_INTERVAL_MS);

    // Cleanup
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [userId, loadProfile, refreshProfile]);

  return {
    profile: state.profile,
    isLoading: state.isLoading,
    isStale: state.isStale,
    lastUpdated: state.lastUpdated,
    refreshProfile,
    updateAfterInteraction,
  };
};
