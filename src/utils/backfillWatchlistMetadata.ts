/**
 * One-Time Backfill Utility
 * Populates metadata for existing watchlist items that show "Unknown"
 * These items have tmdb_id but no title, poster_path, etc.
 */

import { supabase } from '@/config/supabase';
import { getContentDetails } from '@/services/tmdb';

export const backfillWatchlistMetadata = async (userId: string) => {
  console.log('[Backfill] Starting metadata backfill for user:', userId);

  // Get all items missing metadata (have tmdb_id but no title)
  const { data: itemsToFix, error } = await supabase
    .from('watchlist_items')
    .select('id, tmdb_id, media_type, content_id')
    .eq('user_id', userId)
    .is('title', null);

  if (error) {
    console.error('[Backfill] Error fetching items:', error);
    return { success: false, error };
  }

  console.log('[Backfill] Found', itemsToFix?.length || 0, 'items to backfill');

  if (!itemsToFix || itemsToFix.length === 0) {
    return { success: true, updated: 0 };
  }

  let updated = 0;
  let failed = 0;

  // Process in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < itemsToFix.length; i += batchSize) {
    const batch = itemsToFix.slice(i, i + batchSize);

    const promises = batch.map(async (item) => {
      try {
        // Determine media type from content_id if not set
        let mediaType = item.media_type;
        if (!mediaType && item.content_id) {
          if (item.content_id.startsWith('tv-')) mediaType = 'tv';
          else if (item.content_id.startsWith('movie-')) mediaType = 'movie';
        }

        if (!item.tmdb_id || !mediaType) {
          console.log('[Backfill] Skipping item without tmdb_id or media_type:', item.id);
          failed++;
          return false;
        }

        // Fetch metadata from TMDb using our existing service
        const data = await getContentDetails(item.tmdb_id, mediaType as 'movie' | 'tv');

        // Update the item with metadata
        const { error: updateError } = await supabase
          .from('watchlist_items')
          .update({
            title: data.title || 'Unknown',
            poster_path: data.posterPath,
            backdrop_path: data.backdropPath,
            overview: data.overview,
            vote_average: data.rating,
            release_date: data.releaseDate,
            media_type: mediaType,
          })
          .eq('id', item.id);

        if (updateError) {
          console.error('[Backfill] Update error for', item.id, ':', updateError);
          return false;
        }

        console.log('[Backfill] ✅ Updated:', data.title);
        return true;
      } catch (err) {
        console.error('[Backfill] Error processing item', item.id, ':', err);
        return false;
      }
    });

    const results = await Promise.all(promises);
    updated += results.filter(Boolean).length;
    failed += results.filter(r => !r).length;

    // Small delay between batches to avoid rate limits
    if (i + batchSize < itemsToFix.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[Backfill] Progress: ${i + batch.length}/${itemsToFix.length} (${updated} updated, ${failed} failed)`);
  }

  console.log('[Backfill] ✅ Complete. Updated:', updated, 'Failed:', failed);
  return { success: true, updated, failed, total: itemsToFix.length };
};

/**
 * Backfill all users (admin function)
 * Use with caution - processes all users in the system
 */
export const backfillAllUsers = async () => {
  console.log('[Backfill] Starting full system backfill...');

  // Get all unique user IDs from watchlist_items
  const { data: users, error } = await supabase
    .from('watchlist_items')
    .select('user_id')
    .is('title', null);

  if (error) {
    console.error('[Backfill] Error fetching users:', error);
    return { success: false, error };
  }

  const uniqueUserIds = [...new Set(users?.map(u => u.user_id) || [])];
  console.log('[Backfill] Found', uniqueUserIds.length, 'users with missing metadata');

  let totalUpdated = 0;
  let totalFailed = 0;

  for (const userId of uniqueUserIds) {
    console.log('[Backfill] Processing user:', userId);
    const result = await backfillWatchlistMetadata(userId);

    if (result.success) {
      totalUpdated += result.updated || 0;
      totalFailed += result.failed || 0;
    }

    // Delay between users to be nice to TMDb API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('[Backfill] ✅ Full backfill complete. Users:', uniqueUserIds.length, 'Updated:', totalUpdated, 'Failed:', totalFailed);
  return { success: true, users: uniqueUserIds.length, updated: totalUpdated, failed: totalFailed };
};
