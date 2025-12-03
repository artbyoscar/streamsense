/**
 * Watchlist Service
 * API calls for watchlist management with optimized batch fetching
 */
import { supabase } from '@/config/supabase';
import { getContentDetails } from '@/services/tmdb';
import { trackGenreInteraction } from '@/services/genreAffinity';
import { refreshWatchlistCache } from '@/services/smartRecommendations';
import { dnaComputationQueue } from '@/services/dnaComputationQueue';
import type { WatchlistItem, WatchlistItemInsert, WatchlistItemUpdate } from '@/types';
import { getRawWatchlist } from '@/services/watchlistDataService';

// In-memory cache for hydrated content
const contentCache = new Map<string, any>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes
const cacheTimestamps = new Map<string, number>();

// Batch fetch with concurrency control
async function batchHydrate(
  items: any[],
  concurrency: number = 10
): Promise<any[]> {
  const startTime = Date.now();
  const results: any[] = [];
  const itemsToFetch: any[] = [];
  
  // Check cache first
  for (const item of items) {
    if (!item.tmdb_id || !item.media_type) {
      results.push({ ...item, _index: items.indexOf(item) });
      continue;
    }
    
    const cacheKey = item.media_type + '-' + item.tmdb_id;
    const cached = contentCache.get(cacheKey);
    const timestamp = cacheTimestamps.get(cacheKey) || 0;
    
    if (cached && Date.now() - timestamp < CACHE_TTL) {
      results.push({ 
        ...item, 
        ...cached,
        _index: items.indexOf(item),
        _fromCache: true 
      });
    } else {
      itemsToFetch.push({ ...item, _index: items.indexOf(item) });
    }
  }
  
  console.log('[Watchlist] Cache hits: ' + (items.length - itemsToFetch.length) + '/' + items.length);
  
  if (itemsToFetch.length === 0) {
    console.log('[Watchlist] All items from cache in ' + (Date.now() - startTime) + 'ms');
    return results.sort((a, b) => a._index - b._index).map(({ _index, _fromCache, ...rest }) => rest);
  }
  
  // Batch fetch remaining items with concurrency control
  const fetchBatch = async (batch: any[]) => {
    return Promise.all(
      batch.map(async (item) => {
        try {
          const details = await getContentDetails(item.tmdb_id, item.media_type);
          const cacheKey = item.media_type + '-' + item.tmdb_id;
          
          const enriched = {
            poster_url: details.posterPath,
            poster_path: details.posterPath,
            posterPath: details.posterPath,
            backdrop_path: details.backdropPath,
            title: details.title,
            name: details.title,
            overview: details.overview,
            vote_average: details.rating,
            genres: details.genres,
          };
          
          // Cache the result
          contentCache.set(cacheKey, enriched);
          cacheTimestamps.set(cacheKey, Date.now());
          
          return {
            ...item,
            ...enriched,
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
          console.warn('[Watchlist] Failed to hydrate ' + item.content_id);
          return item;
        }
      })
    );
  };
  
  // Process in batches
  for (let i = 0; i < itemsToFetch.length; i += concurrency) {
    const batch = itemsToFetch.slice(i, i + concurrency);
    const batchResults = await fetchBatch(batch);
    results.push(...batchResults);
    
    // Small delay between batches to avoid rate limiting
    if (i + concurrency < itemsToFetch.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  console.log('[Watchlist] Hydrated ' + itemsToFetch.length + ' items in ' + (Date.now() - startTime) + 'ms');
  
  // Sort back to original order and clean up internal fields
  return results
    .sort((a, b) => (a._index || 0) - (b._index || 0))
    .map(({ _index, _fromCache, ...rest }) => rest);
}

// ============================================================================
// FETCH WATCHLIST
// ============================================================================

export const getWatchlist = async (userId: string) => {
  const startTime = Date.now();
  
  try {
    // 1. Get raw items with parsed tmdb_id and media_type
    const rawItems = await getRawWatchlist(userId);
    
    if (rawItems.length === 0) {
      return [];
    }
    
    // 2. Batch hydrate with concurrency control
    const enrichedItems = await batchHydrate(rawItems, 15);
    
    console.log('[Watchlist] Total load time: ' + (Date.now() - startTime) + 'ms for ' + enrichedItems.length + ' items');
    
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
    .select('*')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching watchlist item:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// ADD TO WATCHLIST
// ============================================================================

export async function addToWatchlist(
  contentId: string,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  status: 'want_to_watch' | 'watching' | 'watched' = 'want_to_watch',
  genres?: number[]
): Promise<WatchlistItem> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if already exists
  const existing = await fetchWatchlistItemByContentId(contentId);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('watchlist_items')
    .insert({
      user_id: user.id,
      content_id: contentId,
      status,
      priority: 'medium',
      notify_on_available: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding to watchlist:', error);
    throw error;
  }

  // Track genre interaction for recommendations
  if (genres && genres.length > 0) {
    try {
      await trackGenreInteraction(user.id, genres, 'add_to_watchlist');
    } catch (e) {
      console.warn('Failed to track genre interaction:', e);
    }
  }

  // Queue DNA computation
  try {
    dnaComputationQueue.addToQueue(tmdbId, mediaType);
  } catch (e) {
    console.warn('Failed to queue DNA computation:', e);
  }

  // Refresh watchlist cache
  refreshWatchlistCache();

  return data;
}

// ============================================================================
// UPDATE WATCHLIST ITEM
// ============================================================================

export async function updateWatchlistItem(
  contentId: string,
  updates: Partial<WatchlistItemUpdate>
): Promise<WatchlistItem> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('watchlist_items')
    .update(updates)
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating watchlist item:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// REMOVE FROM WATCHLIST
// ============================================================================

export async function removeFromWatchlist(contentId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('watchlist_items')
    .delete()
    .eq('user_id', user.id)
    .eq('content_id', contentId);

  if (error) {
    console.error('Error removing from watchlist:', error);
    throw error;
  }

  // Refresh watchlist cache
  refreshWatchlistCache();
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export async function batchUpdateStatus(
  contentIds: string[],
  status: 'want_to_watch' | 'watching' | 'watched'
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('watchlist_items')
    .update({ status })
    .eq('user_id', user.id)
    .in('content_id', contentIds);

  if (error) {
    console.error('Error batch updating status:', error);
    throw error;
  }
}

// Clear content cache (useful for testing or manual refresh)
export function clearContentCache(): void {
  contentCache.clear();
  cacheTimestamps.clear();
  console.log('[Watchlist] Content cache cleared');
}
