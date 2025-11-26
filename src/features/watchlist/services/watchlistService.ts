/**
 * Watchlist Service
 * API calls for watchlist management
 */

import { supabase } from '@/config/supabase';
import type { WatchlistItem, WatchlistItemInsert, WatchlistItemUpdate } from '@/types';

// ============================================================================
// FETCH WATCHLIST
// ============================================================================

/**
 * Fetch all watchlist items for the current user
 */
export async function fetchWatchlist(): Promise<WatchlistItem[]> {
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
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
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
  const { error } = await supabase.from('watchlist_items').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
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
