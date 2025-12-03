import { supabase } from './supabase';

// Parse content_id like "movie-1724" into tmdb_id and media_type
const parseContentId = (contentId: string): { tmdbId: number | null; mediaType: string | null } => {
  if (!contentId) return { tmdbId: null, mediaType: null };
  
  const match = contentId.match(/^(movie|tv)-(\d+)$/);
  if (match) {
    return { tmdbId: parseInt(match[2], 10), mediaType: match[1] };
  }
  return { tmdbId: null, mediaType: null };
};

// 1. A safe way to get JUST the IDs (for exclusions/filtering)
export const getWatchlistIds = async (userId: string): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('content_id')
    .eq('user_id', userId);

  if (error) {
    console.error('[WatchlistData] Error fetching IDs:', error);
    return new Set();
  }

  const idSet = new Set<string>();
  data.forEach(item => {
    if (item.content_id) {
      idSet.add(item.content_id);
      const { tmdbId } = parseContentId(item.content_id);
      if (tmdbId) idSet.add(tmdbId.toString());
    }
  });

  return idSet;
};

// 2. Get watchlist items with stored metadata from content table
export const getRawWatchlist = async (userId: string) => {
  const startTime = Date.now();

  // Try to query WITH content JOIN (for new schema with foreign keys)
  let { data, error } = await supabase
    .from('watchlist_items')
    .select(`
      *,
      content (
        id,
        tmdb_id,
        title,
        type,
        overview,
        poster_url,
        backdrop_url,
        genres,
        release_date,
        vote_average,
        popularity
      )
    `)
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  // FALLBACK: If content JOIN fails (PGRST200 or PGRST116), query without JOIN
  if (error && (error.code === 'PGRST200' || error.code === 'PGRST116' || error.message?.includes('relationship'))) {
    console.warn('[WatchlistData] ⚠️  Content table JOIN failed, falling back to simple query:', error.code);
    console.log('[WatchlistData] This is normal if migrations haven\'t been run or using legacy schema');

    // Query without content table JOIN
    const fallbackResult = await supabase
      .from('watchlist_items')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    console.error('[WatchlistData] Error fetching watchlist:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  const parsedItems = data.map(item => {
    // Handle both new items (with content object) and legacy items (string content_id)
    if (item.content && typeof item.content === 'object') {
      // New items with stored metadata
      return {
        ...item,
        tmdb_id: item.content.tmdb_id,
        media_type: item.content.type,
        title: item.content.title,
        poster_url: item.content.poster_url,
        poster_path: item.content.poster_url,
        posterPath: item.content.poster_url,
        backdrop_path: item.content.backdrop_url,
        overview: item.content.overview,
        vote_average: item.content.vote_average,
        genres: item.content.genres || [],
        release_date: item.content.release_date,
        popularity: item.content.popularity,
        _hasStoredMetadata: true,
      };
    } else {
      // Legacy items with string content_id (e.g., "movie-1724")
      const { tmdbId, mediaType } = parseContentId(item.content_id);
      return {
        ...item,
        tmdb_id: tmdbId,
        media_type: mediaType,
        _hasStoredMetadata: false,
      };
    }
  });

  const itemsWithMetadata = parsedItems.filter(i => i._hasStoredMetadata).length;
  const itemsNeedingFetch = parsedItems.length - itemsWithMetadata;

  console.log(
    '[WatchlistData] Fetched ' + parsedItems.length + ' items in ' + (Date.now() - startTime) + 'ms ' +
    '(' + itemsWithMetadata + ' with stored metadata, ' + itemsNeedingFetch + ' need API fetch)'
  );

  return parsedItems;
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
