/**
 * Watchlist Service
 * API calls for watchlist management
 */

import { supabase } from '@/config/supabase';
import { getContentDetails } from '@/services/tmdb';
import { trackGenreInteraction } from '@/services/genreAffinity';
import { refreshWatchlistCache } from '@/services/smartRecommendations';
import { recommendationOrchestrator } from '@/services/recommendationOrchestrator';
import type { WatchlistItem, WatchlistItemInsert, WatchlistItemUpdate } from '@/types';

// ============================================================================
// FETCH WATCHLIST
// ============================================================================

/**
 * Fetch all watchlist items for the current user
 */
/**
 * Fetch all watchlist items for the current user
 */
import { getRawWatchlist } from '@/services/watchlistDataService';

export const getWatchlist = async (userId: string) => {
  try {
    // 1. Get raw items safely
    const rawItems = await getRawWatchlist(userId);

    // 2. Hydrate with API data (Manual Join)
    const enrichedItems = await Promise.all(
      rawItems.map(async (item) => {
        if (!item.tmdb_id || !item.media_type) return item;
        try {
          const details = await getContentDetails(item.tmdb_id, item.media_type);
          // Merge API details with DB data
          // We also construct a 'content' object to maintain compatibility with some UI components
          // that might expect nested content (though we should move to flat structure eventually)
          return {
            ...item,
            ...details,
            ...item,
            // Ensure we have fields expected by UI
            poster_url: details.posterPath,
            poster_path: details.posterPath,
            backdrop_path: details.backdropPath,
            vote_average: details.rating,
            // Backwards compatibility for UI that expects nested content
            content: {
              id: item.content_id,
              tmdb_id: item.tmdb_id,
              title: details.title,
              type: item.media_type,
              poster_url: details.posterPath,
              overview: details.overview,
              vote_average: details.rating,
              genres: details.genres
            }
          };
        } catch (e) {
          console.warn(`[Watchlist] Failed to hydrate item ${item.id}`, e);
          return item;
        }
      })
    );
    return enrichedItems;
  } catch (error) {
    console.error('[Watchlist] Sync failed:', error);
    return [];
  }
};

/**
 * @deprecated Use getWatchlist instead
 */
export const fetchWatchlist = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  return getWatchlist(user.id);
};

/**
 * Fetch watchlist item by content ID
 */
export async function fetchWatchlistItemByContentId(
  contentId: string
): Promise<WatchlistItem | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('watchlist_items')
    .select(`
      *,
      content:content(*)
    `)
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" error, which is expected
    throw new Error(error.message);
  }

  return data || null;
}

// ============================================================================
// ADD TO WATCHLIST
// ============================================================================

/**
 * Add item to watchlist
 */
export async function addToWatchlist(
  watchlistItem: WatchlistItemInsert
): Promise<WatchlistItem> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('watchlist_items')
    .insert({
      ...watchlistItem,
      user_id: user.id,
    })
    .select(`
      *,
      content:content(*)
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Refresh the recommendation cache so this item is excluded immediately
  refreshWatchlistCache(user.id).catch((error) => {
    console.error('[Watchlist] Error refreshing recommendation cache:', error);
  });

  // Compute Content DNA for the recommendation system
  if (watchlistItem.tmdb_id && watchlistItem.media_type) {
    recommendationOrchestrator.computeContentDNA(
      watchlistItem.tmdb_id,
      watchlistItem.media_type as 'movie' | 'tv'
    ).then(() => {
      console.log('[Watchlist] Content DNA computed for:', watchlistItem.tmdb_id);
    }).catch((error) => {
      console.error('[Watchlist] Error computing content DNA:', error);
    });
  }

  return data;
}

// ============================================================================
// UPDATE WATCHLIST ITEM
// ============================================================================

/**
 * Update watchlist item
 */
export async function updateWatchlistItem(
  id: string,
  updates: WatchlistItemUpdate
): Promise<WatchlistItem> {
  const { data, error } = await supabase
    .from('watchlist_items')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      content:content(*)
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// ============================================================================
// REMOVE FROM WATCHLIST
// ============================================================================

/**
 * Remove item from watchlist
 */
export async function removeFromWatchlist(id: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch watchlist item with content to get genres before deleting
  const { data: watchlistItem } = await supabase
    .from('watchlist_items')
    .select(`
      *,
      content:content(*)
    `)
    .eq('id', id)
    .single();

  // Delete the watchlist item
  const { error } = await supabase.from('watchlist_items').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  // Track genre affinity for removal
  if (watchlistItem?.content?.genres) {
    const content = watchlistItem.content as any;
    const genreIds = Array.isArray(content.genres)
      ? content.genres.filter((g: any) => typeof g === 'number')
      : [];

    if (genreIds.length > 0) {
      trackGenreInteraction(
        user.id,
        genreIds,
        content.type || 'movie',
        'REMOVE_FROM_WATCHLIST'
      ).catch((error) => {
        console.error('[Watchlist] Error tracking genre affinity on removal:', error);
      });
    }
  }
}

// ============================================================================
// MARK AS WATCHED
// ============================================================================

/**
 * Mark watchlist item as watched
 */
export async function markAsWatched(id: string): Promise<WatchlistItem> {
  return updateWatchlistItem(id, {
    watched: true,
    watched_at: new Date().toISOString(),
  });
}
