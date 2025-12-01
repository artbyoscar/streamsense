/**
 * Rewatch Suggestions Service
 * Suggests highly-rated watched content that's available on user's current services
 * Helps users get value from their subscriptions
 */

import { supabase } from '@/config/supabase';
import { tmdbApi } from './tmdb';

export interface RewatchSuggestion {
  id: number;
  tmdbId: number;
  title: string;
  type: 'movie' | 'tv';
  posterPath: string | null;
  rating: number;
  availableOn: string[];
  lastWatched: Date;
  rewatchReason: string;
  daysSinceWatched: number;
}

interface WatchlistItem {
  id: string;
  rating: number;
  updated_at: string;
  content: {
    id: string;
    tmdb_id: number;
    title: string;
    type: 'movie' | 'tv';
    poster_url: string | null;
  };
}

/**
 * Get rewatch suggestions based on highly-rated watched content
 */
export const getRewatchSuggestions = async (
  userId: string,
  limit: number = 10
): Promise<RewatchSuggestion[]> => {
  try {
    console.log('[Rewatch] Getting rewatch suggestions for user:', userId);

    // Get highly-rated watched content
    const { data: watchedItems, error: watchedError } = await supabase
      .from('watchlist_items')
      .select(`
        id,
        rating,
        updated_at,
        content (
          id,
          tmdb_id,
          title,
          type,
          poster_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'watched')
      .gte('rating', 4) // Only 4+ star ratings
      .order('rating', { ascending: false })
      .order('updated_at', { ascending: true }) // Oldest first
      .limit(50); // Get more than we need to filter by availability

    if (watchedError) {
      console.error('[Rewatch] Error fetching watched items:', watchedError);
      return [];
    }

    if (!watchedItems || watchedItems.length === 0) {
      console.log('[Rewatch] No highly-rated watched items found');
      return [];
    }

    console.log('[Rewatch] Found', watchedItems.length, 'highly-rated watched items');

    // Get user's active subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('service_name')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (subsError) {
      console.error('[Rewatch] Error fetching subscriptions:', subsError);
      return [];
    }

    const userServices = new Set(
      (subscriptions || []).map(s => s.service_name.toLowerCase())
    );

    console.log('[Rewatch] User has', userServices.size, 'active services');

    // Map service names to TMDb provider IDs
    const SERVICE_PROVIDER_MAP: Record<string, number> = {
      'netflix': 8,
      'amazon prime video': 9,
      'prime video': 9,
      'disney+': 337,
      'hbo max': 384,
      'max': 384,
      'hulu': 15,
      'apple tv+': 350,
      'apple tv plus': 350,
      'paramount+': 531,
      'peacock': 386,
      'showtime': 37,
      'starz': 43,
      'espn+': 531,
    };

    const userProviderIds = new Set<number>();
    userServices.forEach(service => {
      const providerId = SERVICE_PROVIDER_MAP[service];
      if (providerId) {
        userProviderIds.add(providerId);
      }
    });

    // Check availability for each watched item
    const suggestions: RewatchSuggestion[] = [];

    for (const item of watchedItems as WatchlistItem[]) {
      if (!item.content) continue;

      try {
        // Get watch providers from TMDb
        const providers = await getWatchProviders(
          item.content.tmdb_id,
          item.content.type
        );

        const availableServices = providers.filter(p =>
          userProviderIds.has(p.provider_id)
        );

        if (availableServices.length > 0) {
          const lastWatched = new Date(item.updated_at);
          const now = new Date();
          const daysSinceWatched = Math.floor(
            (now.getTime() - lastWatched.getTime()) / (1000 * 60 * 60 * 24)
          );

          suggestions.push({
            id: parseInt(item.content.id),
            tmdbId: item.content.tmdb_id,
            title: item.content.title,
            type: item.content.type,
            posterPath: item.content.poster_url,
            rating: item.rating,
            availableOn: availableServices.map(p => p.provider_name),
            lastWatched,
            rewatchReason: generateRewatchReason(item.rating, daysSinceWatched),
            daysSinceWatched,
          });

          if (suggestions.length >= limit) break;
        }
      } catch (error) {
        console.error(`[Rewatch] Error checking providers for ${item.content.title}:`, error);
        // Continue with next item
      }
    }

    console.log('[Rewatch] Returning', suggestions.length, 'rewatch suggestions');
    return suggestions;
  } catch (error) {
    console.error('[Rewatch] Error getting rewatch suggestions:', error);
    return [];
  }
};

/**
 * Get watch providers for content from TMDb
 */
const getWatchProviders = async (
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<Array<{ provider_id: number; provider_name: string }>> => {
  try {
    const endpoint = mediaType === 'tv' ? `/tv/${tmdbId}/watch/providers` : `/movie/${tmdbId}/watch/providers`;
    const response = await tmdbApi.get(endpoint);

    const usProviders = response.data?.results?.US;
    if (!usProviders) return [];

    // Get flatrate (subscription) providers
    const flatrate = usProviders.flatrate || [];

    return flatrate.map((provider: any) => ({
      provider_id: provider.provider_id,
      provider_name: provider.provider_name,
    }));
  } catch (error) {
    console.error('[Rewatch] Error fetching watch providers:', error);
    return [];
  }
};

/**
 * Generate a personalized rewatch reason based on rating and time
 */
const generateRewatchReason = (rating: number, daysSinceWatched: number): string => {
  if (daysSinceWatched > 365) {
    return `It's been over a year since you watched this ${rating}★ favorite`;
  }
  if (daysSinceWatched > 180) {
    return `You rated this ${rating}★ six months ago`;
  }
  if (daysSinceWatched > 90) {
    return `Perfect time to revisit this ${rating}★ gem`;
  }
  if (rating === 5) {
    return `One of your 5★ favorites - always worth rewatching`;
  }
  return `You loved this one (${rating}★)`;
};

/**
 * Get rewatch statistics for user
 */
export const getRewatchStats = async (userId: string): Promise<{
  totalHighlyRated: number;
  availableToRewatch: number;
  oldestRewatchDays: number;
}> => {
  try {
    // Get all highly-rated watched items
    const { data: highlyRated } = await supabase
      .from('watchlist_items')
      .select('id, updated_at')
      .eq('user_id', userId)
      .eq('status', 'watched')
      .gte('rating', 4);

    const totalHighlyRated = highlyRated?.length || 0;

    // Get rewatch suggestions to count available
    const suggestions = await getRewatchSuggestions(userId, 100);
    const availableToRewatch = suggestions.length;

    // Find oldest watched item
    const oldestRewatchDays = suggestions.length > 0
      ? Math.max(...suggestions.map(s => s.daysSinceWatched))
      : 0;

    return {
      totalHighlyRated,
      availableToRewatch,
      oldestRewatchDays,
    };
  } catch (error) {
    console.error('[Rewatch] Error getting rewatch stats:', error);
    return {
      totalHighlyRated: 0,
      availableToRewatch: 0,
      oldestRewatchDays: 0,
    };
  }
};
