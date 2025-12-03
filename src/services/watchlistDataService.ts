import { supabase } from './supabase';

// 1. A safe way to get JUST the IDs (for exclusions/filtering)
export const getWatchlistIds = async (userId: string): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('tmdb_id, content_id')
    .eq('user_id', userId);

  if (error) {
    console.error('[WatchlistData] Error fetching IDs:', error);
    return new Set();
  }

  const idSet = new Set<string>();
  data.forEach(item => {
    if (item.tmdb_id) idSet.add(item.tmdb_id.toString());
    if (item.content_id) idSet.add(item.content_id);
  });

  return idSet;
};

// 2. Get watchlist items - fetch raw then hydrate from content table
export const getRawWatchlist = async (userId: string) => {
  // Step 1: Get watchlist items
  const { data: watchlistItems, error: watchlistError } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (watchlistError) {
    console.error('[WatchlistData] Error fetching watchlist:', watchlistError);
    throw watchlistError;
  }

  if (!watchlistItems || watchlistItems.length === 0) {
    return [];
  }

  // Step 2: Get content IDs
  const contentIds = watchlistItems
    .map(item => item.content_id)
    .filter(Boolean);

  if (contentIds.length === 0) {
    console.log('[WatchlistData] No content IDs to hydrate');
    return watchlistItems;
  }

  // Step 3: Fetch content data in batch
  const { data: contentData, error: contentError } = await supabase
    .from('content')
    .select('id, tmdb_id, title, type, poster_url, backdrop_url, overview, vote_average, genres')
    .in('id', contentIds);

  if (contentError) {
    console.warn('[WatchlistData] Error fetching content:', contentError);
    // Return raw items if content fetch fails
    return watchlistItems;
  }

  // Step 4: Create lookup map
  const contentMap = new Map();
  (contentData || []).forEach(content => {
    contentMap.set(content.id, content);
  });

  // Step 5: Merge content into watchlist items
  const hydratedItems = watchlistItems.map(item => {
    const content = contentMap.get(item.content_id);
    if (content) {
      return {
        ...item,
        tmdb_id: content.tmdb_id,
        media_type: content.type,
        title: content.title,
        poster_url: content.poster_url,
        poster_path: content.poster_url,
        backdrop_url: content.backdrop_url,
        overview: content.overview,
        vote_average: content.vote_average,
        genres: content.genres,
        content: content,
      };
    }
    return item;
  });

  console.log('[WatchlistData] Hydrated ' + hydratedItems.length + ' items (' + contentMap.size + ' with content)');

  return hydratedItems;
};

// 3. Get watchlist count by status
export const getWatchlistCountByStatus = async (userId: string) => {
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('status')
    .eq('user_id', userId);

  if (error) {
    console.error('[WatchlistData] Error fetching counts:', error);
    return { want_to_watch: 0, watching: 0, watched: 0 };
  }

  const counts = { want_to_watch: 0, watching: 0, watched: 0 };
  data.forEach(item => {
    if (item.status in counts) {
      counts[item.status as keyof typeof counts]++;
    }
  });

  return counts;
};
