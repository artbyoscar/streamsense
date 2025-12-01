/**
 * Watchlist Service
 * API calls for watchlist management
 */

import { supabase } from '@/config/supabase';
import { getContentDetails } from '@/services/tmdb';
import { trackGenreInteraction } from '@/services/genreAffinity';
import { refreshWatchlistCache } from '@/services/smartRecommendations';
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
export async function fetchWatchlist(): Promise<any[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    // 1. Fetch the watchlist items (WITHOUT the join)
    const { data: items, error } = await supabase
      .from('watchlist_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!items || items.length === 0) return [];

    // 2. Hydrate the data manually (Fetch details for each item)
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        try {
          // Use tmdb_id and media_type/type from the item
          // Fallback to 'movie' if type is missing, or skip if no ID
          const tmdbId = item.tmdb_id;
          const mediaType = item.media_type || item.type || 'movie';

          if (tmdbId) {
            // Fetch fresh details from TMDb
            const details = await getContentDetails(tmdbId, mediaType as 'movie' | 'tv');
            return {
              ...item,
              // Merge API data into the shape your UI expects
              title: details.title,
              poster_path: details.posterPath,
              vote_average: details.rating,
              genres: details.genres,
              // Add content object to satisfy some UI expectations if needed
              content: {
                id: item.content_id, // Keep original content_id if available
                tmdb_id: tmdbId,
                title: details.title,
                type: mediaType,
                poster_url: details.posterPath, // Map posterPath to poster_url
                overview: details.overview,
                vote_average: details.rating,
                genres: details.genres
              }
            };
          }
          return item; // Return as-is if missing ID
        } catch (err) {
          console.warn(`[Watchlist] Failed to hydrate item ${item.id}`, err);
          return item;
        }
      })
    );

    return enrichedItems;
  } catch (error: any) {
    console.error('[Watchlist] Error fetching watchlist:', error);
    throw new Error(error.message || 'Failed to fetch watchlist');
  }
}

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
