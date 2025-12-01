import { supabase } from './supabase';

// 1. A safe way to get JUST the IDs (for exclusions/filtering)
export const getWatchlistIds = async (userId: string): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('tmdb_id, content_id') // fetching raw columns only
    .eq('user_id', userId);

  if (error) {
    console.error('[WatchlistData] Error fetching IDs:', error);
    return new Set();
  }

  // Create a Set of strings for fast checking
  const idSet = new Set<string>();
  data.forEach(item => {
    if (item.tmdb_id) idSet.add(item.tmdb_id.toString());
    if (item.content_id) idSet.add(item.content_id);
  });
  
  return idSet;
};

// 2. A safe way to get the full items (for the Watchlist Screen)
export const getRawWatchlist = async (userId: string) => {
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('*') // No joins! Just raw data.
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
};
