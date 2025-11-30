import { supabase } from './supabase';
import { tmdbApi } from './tmdb';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Persistent session cache
const SESSION_CACHE_KEY = 'streamsense_session_shown';
const WATCHLIST_CACHE_KEY = 'streamsense_watchlist_ids';
let sessionShownIds: Set<number> = new Set();
let watchlistTmdbIds: Set<number> = new Set();
let cacheInitialized = false;

// Initialize caches
const initializeCaches = async (userId: string) => {
  if (cacheInitialized) return;

  try {
    // Load session shown items from storage
    const sessionData = await AsyncStorage.getItem(SESSION_CACHE_KEY);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        sessionShownIds = new Set(parsed.ids);
        console.log('[SmartRecs] Restored session cache:', sessionShownIds.size, 'items');
      }
    }

    // Load FRESH watchlist IDs from database
    const { data: watchlistItems } = await supabase
      .from('watchlist_items')
      .select('tmdb_id')
      .eq('user_id', userId);

    if (watchlistItems) {
      watchlistTmdbIds = new Set(watchlistItems.map(item => item.tmdb_id));
      console.log('[SmartRecs] Loaded watchlist IDs:', watchlistTmdbIds.size, 'items');

      // Cache to storage
      await AsyncStorage.setItem(WATCHLIST_CACHE_KEY, JSON.stringify({
        ids: Array.from(watchlistTmdbIds),
        timestamp: Date.now(),
      }));
    }

    cacheInitialized = true;
  } catch (error) {
    console.error('[SmartRecs] Cache init error:', error);
  }
};

// Save session cache
const saveSessionCache = async () => {
  try {
    await AsyncStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      ids: Array.from(sessionShownIds),
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('[SmartRecs] Save session cache error:', error);
  }
};

// Add item to session cache
const addToSessionCache = (id: number) => {
  sessionShownIds.add(id);
};

// Check if item should be excluded
const shouldExclude = (tmdbId: number): boolean => {
  // Exclude if in watchlist OR already shown this session
  const inWatchlist = watchlistTmdbIds.has(tmdbId);
  const alreadyShown = sessionShownIds.has(tmdbId);

  if (inWatchlist || alreadyShown) {
    return true;
  }
  return false;
};

// Genre mappings
const GENRE_NAME_TO_IDS: Record<string, number[]> = {
  'Drama': [18],
  'Adventure': [12],
  'Action': [28],
  'Science Fiction': [878],
  'Animation': [16],
  'Comedy': [35],
  'Thriller': [53],
  'Horror': [27],
  'Romance': [10749],
  'Documentary': [99],
  'Crime': [80],
  'Mystery': [9648],
  'Fantasy': [14],
  'Family': [10751],
  'War': [10752],
  'History': [36],
  // TV specific
  'Sci-Fi & Fantasy': [10765],
  'Action & Adventure': [10759],
};

interface RecommendationOptions {
  userId: string;
  limit?: number;
  mediaType?: 'movie' | 'tv' | 'mixed';
  forceRefresh?: boolean;
}

export const getSmartRecommendations = async (
  options: RecommendationOptions
): Promise<any[]> => {
  const { userId, limit = 20, mediaType = 'mixed', forceRefresh = false } = options;

  // Force refresh watchlist cache if requested
  if (forceRefresh) {
    cacheInitialized = false;
    sessionShownIds.clear();
    await AsyncStorage.removeItem(SESSION_CACHE_KEY);
  }

  // Initialize caches
  await initializeCaches(userId);

  // ALWAYS refresh watchlist IDs to catch new additions
  const { data: freshWatchlist } = await supabase
    .from('watchlist_items')
    .select('tmdb_id')
    .eq('user_id', userId);

  if (freshWatchlist) {
    watchlistTmdbIds = new Set(freshWatchlist.map(item => item.tmdb_id));
  }

  const totalExcluded = watchlistTmdbIds.size + sessionShownIds.size;

  console.log('[SmartRecs] Getting recommendations:', {
    userId,
    limit,
    mediaType,
    watchlistIds: watchlistTmdbIds.size,
    sessionShownIds: sessionShownIds.size,
    totalExcluded,
    forceRefresh,
  });

  try {
    // Get user genre affinity
    const { data: affinityData } = await supabase
      .from('user_genre_affinity')
      .select('genre_name, affinity_score')
      .eq('user_id', userId)
      .order('affinity_score', { ascending: false })
      .limit(10);

    // Determine top genres
    let topGenres: string[] = [];
    if (affinityData && affinityData.length > 0) {
      topGenres = affinityData.slice(0, 5).map(a => a.genre_name);
    } else {
      topGenres = ['Drama', 'Action', 'Comedy', 'Adventure', 'Science Fiction'];
    }

    console.log('[SmartRecs] Top genres:', topGenres);

    // Convert to genre IDs
    const genreIds = topGenres
      .flatMap(name => GENRE_NAME_TO_IDS[name] || [])
      .slice(0, 3);

    const recommendations: any[] = [];

    // Random page for variety
    const getRandomPage = () => Math.floor(Math.random() * 10) + 1;

    // Fetch movies
    if (mediaType === 'movie' || mediaType === 'mixed') {
      const page = getRandomPage();
      console.log('[SmartRecs] Fetching movies, page:', page);

      const movieResponse = await tmdbApi.discover('movie', {
        with_genres: genreIds.join(','),
        page,
        sort_by: 'popularity.desc',
        'vote_count.gte': 100,
        'vote_average.gte': 6.0,
      });

      const movies = (movieResponse.data?.results || [])
        .filter((item: any) => !shouldExclude(item.id))
        .map((item: any) => ({ ...item, media_type: 'movie' }));

      console.log('[SmartRecs] Movies after filtering:', movies.length, 'of', movieResponse.data?.results?.length);

      // Add to session cache
      movies.forEach((m: any) => addToSessionCache(m.id));
      recommendations.push(...movies);
    }

    // Fetch TV shows
    if (mediaType === 'tv' || mediaType === 'mixed') {
      // Map movie genres to TV genres
      const tvGenreIds = genreIds.map(id => {
        if (id === 878) return 10765; // Sci-Fi -> Sci-Fi & Fantasy
        if (id === 28) return 10759;  // Action -> Action & Adventure
        return id;
      });

      const page = getRandomPage();
      console.log('[SmartRecs] Fetching TV, page:', page);

      const tvResponse = await tmdbApi.discover('tv', {
        with_genres: tvGenreIds.join(','),
        page,
        sort_by: 'popularity.desc',
        'vote_count.gte': 50,
        'vote_average.gte': 6.0,
      });

      const tvShows = (tvResponse.data?.results || [])
        .filter((item: any) => !shouldExclude(item.id))
        .map((item: any) => ({ ...item, media_type: 'tv' }));

      console.log('[SmartRecs] TV after filtering:', tvShows.length, 'of', tvResponse.data?.results?.length);

      // Add to session cache
      tvShows.forEach((t: any) => addToSessionCache(t.id));
      recommendations.push(...tvShows);
    }

    // Shuffle for variety
    const shuffled = recommendations.sort(() => Math.random() - 0.5);

    // Save session cache
    await saveSessionCache();

    // Return limited results
    const results = shuffled.slice(0, limit);

    console.log('[SmartRecs] Returning', results.length, 'recommendations');
    console.log('[SmartRecs] First 5 IDs:', results.slice(0, 5).map(r => r.id));

    return results;
  } catch (error) {
    console.error('[SmartRecs] Error:', error);
    return [];
  }
};

// Force refresh - call when user adds to watchlist
export const refreshWatchlistCache = async (userId: string) => {
  const { data: freshWatchlist } = await supabase
    .from('watchlist_items')
    .select('tmdb_id')
    .eq('user_id', userId);

  if (freshWatchlist) {
    watchlistTmdbIds = new Set(freshWatchlist.map(item => item.tmdb_id));
    console.log('[SmartRecs] Refreshed watchlist cache:', watchlistTmdbIds.size, 'items');
  }
};

// Clear all caches
export const clearRecommendationCaches = async () => {
  sessionShownIds.clear();
  watchlistTmdbIds.clear();
  cacheInitialized = false;
  await AsyncStorage.multiRemove([SESSION_CACHE_KEY, WATCHLIST_CACHE_KEY]);
  console.log('[SmartRecs] All caches cleared');
};

// Debug function
export const getExclusionStats = () => ({
  watchlistSize: watchlistTmdbIds.size,
  sessionSize: sessionShownIds.size,
  watchlistSample: Array.from(watchlistTmdbIds).slice(0, 10),
  sessionSample: Array.from(sessionShownIds).slice(0, 10),
});
