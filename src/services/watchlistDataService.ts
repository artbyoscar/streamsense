import { supabase } from './supabase';

// 1. A safe way to get JUST the IDs (for exclusions/filtering)
export const getWatchlistIds = async (userId: string): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('content_id, content:content_id(tmdb_id)')
    .eq('user_id', userId);

  if (error) {
    console.error('[WatchlistData] Error fetching IDs:', error);
    return new Set();
  }

  const idSet = new Set<string>();
  data.forEach(item => {
    if (item.content_id) idSet.add(item.content_id);
    // Also add tmdb_id if available
    const content = item.content as any;
    if (content?.tmdb_id) idSet.add(content.tmdb_id.toString());
  });

  return idSet;
};

// 2. Get watchlist items with content data joined
export const getRawWatchlist = async (userId: string) => {
  const { data, error } = await supabase
    .from('watchlist_items')
    .select(`
      *,
      content:content_id (
        id,
        tmdb_id,
        title,
        type,
        poster_url,
        backdrop_url,
        overview,
        vote_average,
        genres
      )
    `)
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) {
    console.error('[WatchlistData] Error fetching watchlist:', error);
    // Fallback to raw fetch without join
    const { data: rawData, error: rawError } = await supabase
      .from('watchlist_items')
      .select('*')
      .eq('user_id', userId);
    
    if (rawError) throw rawError;
    return rawData || [];
  }

  // Flatten the content into the item for easier access
  const flattenedItems = (data || []).map(item => {
    const content = item.content as any;
    return {
      ...item,
      // Add content fields at top level for compatibility
      tmdb_id: content?.tmdb_id,
      media_type: content?.type,
      title: content?.title,
      poster_url: content?.poster_url,
      poster_path: content?.poster_url,
      backdrop_url: content?.backdrop_url,
      overview: content?.overview,
      vote_average: content?.vote_average,
      genres: content?.genres,
    };
  });

  console.log('[WatchlistData] Fetched ' + flattenedItems.length + ' items with content data');
  
  return flattenedItems;
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
