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

// Batch fetch with concurrency control (only for legacy items without stored metadata)
async function batchHydrate(
  items: any[],
  concurrency: number = 10
): Promise<any[]> {
  const startTime = Date.now();
  const results: any[] = [];
  const itemsToFetch: any[] = [];

  // Separate items into those with stored metadata and those needing fetch
  for (const item of items) {
    const index = items.indexOf(item);

    // Skip if item already has stored metadata
    if (item._hasStoredMetadata) {
      results.push({ ...item, _index: index });
      continue;
    }

    // Skip if no tmdb_id or media_type
    if (!item.tmdb_id || !item.media_type) {
      results.push({ ...item, _index: index });
      continue;
    }

    // Check in-memory cache
    const cacheKey = item.media_type + '-' + item.tmdb_id;
    const cached = contentCache.get(cacheKey);
    const timestamp = cacheTimestamps.get(cacheKey) || 0;

    if (cached && Date.now() - timestamp < CACHE_TTL) {
      results.push({
        ...item,
        ...cached,
        _index: index,
        _fromCache: true
      });
    } else {
      itemsToFetch.push({ ...item, _index: index });
    }
  }

  const itemsWithStoredMetadata = items.filter(i => i._hasStoredMetadata).length;
  console.log('[Watchlist] Items with stored metadata: ' + itemsWithStoredMetadata + ', cache hits: ' + (results.length - itemsWithStoredMetadata) + ', need fetch: ' + itemsToFetch.length);

  if (itemsToFetch.length === 0) {
    console.log('[Watchlist] No API calls needed - all items from DB or cache in ' + (Date.now() - startTime) + 'ms');
    return results.sort((a, b) => a._index - b._index).map(({ _index, _fromCache, _hasStoredMetadata, ...rest }) => rest);
  }

  // Batch fetch remaining legacy items with concurrency control
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
          console.warn('[Watchlist] Failed to hydrate legacy item ' + item.content_id);
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

  console.log('[Watchlist] Hydrated ' + itemsToFetch.length + ' legacy items in ' + (Date.now() - startTime) + 'ms');

  // Sort back to original order and clean up internal fields
  return results
    .sort((a, b) => (a._index || 0) - (b._index || 0))
    .map(({ _index, _fromCache, _hasStoredMetadata, ...rest }) => rest);
}

// ============================================================================
// FETCH WATCHLIST
// ============================================================================

export const getWatchlist = async (userId: string) => {
  const startTime = Date.now();

  try {
    // 1. Get raw items with stored metadata from DB (JOIN with content table)
    const rawItems = await getRawWatchlist(userId);

    if (rawItems.length === 0) {
      return [];
    }

    // 2. Batch hydrate only legacy items without stored metadata
    const enrichedItems = await batchHydrate(rawItems, 15);

    const totalTime = Date.now() - startTime;
    const itemsWithStoredMetadata = rawItems.filter(i => i._hasStoredMetadata).length;
    const legacyItems = rawItems.length - itemsWithStoredMetadata;

    console.log(
      '[Watchlist] ✅ Total load time: ' + totalTime + 'ms for ' + enrichedItems.length + ' items ' +
      '(' + itemsWithStoredMetadata + ' from DB, ' + legacyItems + ' legacy items)'
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
  genres?: number[],
  rating?: number
): Promise<WatchlistItem> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if already exists by tmdb_id (more reliable than content_id)
  // This handles both legacy string IDs and new UUID IDs
  try {
    const { data: existingByTmdb, error: checkError } = await supabase
      .from('watchlist_items')
      .select(`
        *,
        content!inner (
          tmdb_id,
          type
        )
      `)
      .eq('user_id', user.id)
      .eq('content.tmdb_id', tmdbId)
      .eq('content.type', mediaType)
      .maybeSingle();

    if (!checkError && existingByTmdb) {
      console.log('[Watchlist] ✅ Item already exists in watchlist, returning existing');
      return existingByTmdb;
    }
  } catch (e) {
    // If JOIN fails (content table doesn't exist), fall back to content_id check
    const existing = await fetchWatchlistItemByContentId(contentId);
    if (existing) {
      console.log('[Watchlist] ✅ Item already exists (legacy check), returning existing');
      return existing;
    }
  }

  // Try to fetch and store TMDb metadata (new schema approach)
  let finalContentId = contentId; // Default to passed contentId (legacy format)
  let tmdbData: any = null; // Store metadata for use in watchlist_items

  try {
    console.log('[Watchlist] Fetching metadata for', mediaType, tmdbId);
    tmdbData = await getContentDetails(tmdbId, mediaType);

    // First, check if content already exists
    const { data: existingContent } = await supabase
      .from('content')
      .select('id, title')
      .eq('tmdb_id', tmdbId)
      .eq('type', mediaType)
      .maybeSingle();

    if (existingContent) {
      // Content already exists, use it
      console.log('[Watchlist] ✅ Using existing content:', existingContent.title, '(UUID:', existingContent.id + ')');
      finalContentId = existingContent.id;
    } else {
      // Content doesn't exist, insert it
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .insert({
          tmdb_id: tmdbId,
          title: tmdbData.title,
          type: mediaType,
          overview: tmdbData.overview || null,
          poster_url: tmdbData.posterPath || null,
          backdrop_url: tmdbData.backdropPath || null,
          genres: tmdbData.genres?.map((g) => g.name) || [],
          release_date: tmdbData.releaseDate || null,
          vote_average: tmdbData.rating || null,
          popularity: tmdbData.popularity || null,
        })
        .select()
        .single();

      if (contentError) {
        // If error is duplicate key (race condition), retry finding the existing row
        if (contentError.code === '23505') {
          console.log('[Watchlist] Content was just inserted by another request, fetching it...');
          const { data: retryContent } = await supabase
            .from('content')
            .select('id, title')
            .eq('tmdb_id', tmdbId)
            .eq('type', mediaType)
            .single();

          if (retryContent) {
            finalContentId = retryContent.id;
          } else {
            // Fallback to legacy format
            console.warn('[Watchlist] ⚠️  Could not fetch content after duplicate error');
            finalContentId = contentId;
          }
        } else {
          // Content table doesn't exist or other error - fall back to legacy approach
          console.warn('[Watchlist] ⚠️  Content table insert failed, using legacy content_id:', contentError.code);
          finalContentId = contentId; // Use legacy string format "movie-1724"
        }
      } else if (contentData) {
        console.log('[Watchlist] ✅ Stored new metadata for', contentData.title, '(UUID:', contentData.id + ')');
        finalContentId = contentData.id; // Use UUID from content table
      }
    }
  } catch (e) {
    console.warn('[Watchlist] ⚠️  Metadata storage failed, using legacy content_id:', e);
    finalContentId = contentId; // Use legacy string format
  }

  // Upsert into watchlist_items (handles duplicates gracefully)
  // Using upsert instead of insert prevents 23505 duplicate key errors
  const { data, error } = await supabase
    .from('watchlist_items')
    .upsert(
      {
        user_id: user.id,
        content_id: finalContentId, // Either UUID or legacy string "movie-1724"
        status,
        rating: rating || null, // Optional rating (0.5-5.0)
        priority: 'medium',
        notify_on_available: false,
        // Store metadata directly for instant display (no TMDb fetch needed)
        tmdb_id: tmdbId,
        media_type: mediaType,
        title: tmdbData?.title || null,
        poster_path: tmdbData?.posterPath || null,
        overview: tmdbData?.overview || null,
        vote_average: tmdbData?.rating || null,
        release_date: tmdbData?.releaseDate || null,
        backdrop_path: tmdbData?.backdropPath || null,
      },
      {
        onConflict: 'user_id,content_id', // Update if user_id + content_id already exists
        ignoreDuplicates: false, // false = update on conflict instead of ignoring
      }
    )
    .select()
    .single();

  if (error) {
    console.error('[Watchlist] Error upserting to watchlist:', error.code, error.message);
    throw error;
  }

  console.log('[Watchlist] ✅ Successfully added/updated item in watchlist');

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
