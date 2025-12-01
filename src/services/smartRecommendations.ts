import { supabase } from './supabase';
import { tmdbApi } from './tmdb';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Persistent session cache
const SESSION_CACHE_KEY = 'streamsense_session_shown';
const WATCHLIST_CACHE_KEY = 'streamsense_watchlist_ids';
let sessionShownIds: Set<number> = new Set();
let watchlistTmdbIds: Set<number> = new Set();
let cacheInitialized = false;

// ============================================================================
// GLOBAL EXCLUSION SYSTEM
// Centralized exclusion list to prevent watchlist items from appearing in recommendations
// ============================================================================

let globalExcludeIds: Set<number> = new Set();

/**
 * Initialize global exclusions from watchlist
 * Call this when user logs in or app starts
 */
export const initializeExclusions = async (userId: string) => {
  try {
    const { data: watchlistItems } = await supabase
      .from('watchlist_items')
      .select('tmdb_id')
      .eq('user_id', userId);

    if (watchlistItems) {
      globalExcludeIds = new Set(watchlistItems.map(item => item.tmdb_id));
      console.log(`[SmartRecs] Initialized exclusions: ${globalExcludeIds.size} items`);
    }
  } catch (error) {
    console.error('[SmartRecs] Error initializing exclusions:', error);
  }
};

/**
 * Add a single item to exclusions
 * Call this when user adds content to watchlist
 */
export const addToExclusions = (tmdbId: number) => {
  globalExcludeIds.add(tmdbId);
  console.log(`[SmartRecs] Added to exclusions: ${tmdbId}. Total: ${globalExcludeIds.size}`);
};

/**
 * Remove an item from exclusions
 * Call this when user removes content from watchlist
 */
export const removeFromExclusions = (tmdbId: number) => {
  globalExcludeIds.delete(tmdbId);
  console.log(`[SmartRecs] Removed from exclusions: ${tmdbId}. Total: ${globalExcludeIds.size}`);
};

/**
 * Check if an item is excluded
 */
export const isExcluded = (tmdbId: number): boolean => {
  return globalExcludeIds.has(tmdbId);
};

/**
 * Filter array of items to remove excluded ones
 */
export const filterExcluded = (items: any[]): any[] => {
  return items.filter(item => !globalExcludeIds.has(item.id));
};

/**
 * Get exclusion stats for debugging
 */
export const getExclusionInfo = () => ({
  total: globalExcludeIds.size,
  sample: Array.from(globalExcludeIds).slice(0, 10),
});

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
  // Exclude if in global exclusions, watchlist, OR already shown this session
  const isGloballyExcluded = globalExcludeIds.has(tmdbId);
  const inWatchlist = watchlistTmdbIds.has(tmdbId);
  const alreadyShown = sessionShownIds.has(tmdbId);

  if (isGloballyExcluded || inWatchlist || alreadyShown) {
    return true;
  }
  return false;
};

// Genre mappings
const GENRE_NAME_TO_IDS: Record<string, number[]> = {
  'Drama': [18],
  'Adventure': [12],
  'Action': [28, 10759], // Movie Action + TV Action & Adventure
  'Science Fiction': [878, 10765], // Movie Sci-Fi + TV Sci-Fi & Fantasy
  'Animation': [16],
  'Anime': [16], // Same as animation, filtered by language
  'Comedy': [35],
  'Thriller': [53],
  'Horror': [27],
  'Romance': [10749],
  'Documentary': [99],
  'Crime': [80],
  'Mystery': [9648],
  'Fantasy': [14, 10765],
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

    // Random page for variety - use lower range for single media type to avoid empty pages
    const getRandomPage = () => {
      // For single media type filters, use pages 1-3 for better results
      if (mediaType === 'movie' || mediaType === 'tv') {
        return Math.floor(Math.random() * 3) + 1;
      }
      // For mixed, use pages 1-5
      return Math.floor(Math.random() * 5) + 1;
    };

    // Helper to filter items - only use session cache for 'mixed' mode
    const filterItems = (items: any[]) => {
      if (mediaType === 'mixed') {
        // Use full exclusion including session cache for mixed mode
        return items.filter((item: any) => !shouldExclude(item.id));
      } else {
        // For single media type, only exclude watchlist items (not session cache)
        return items.filter((item: any) => {
          const isGloballyExcluded = globalExcludeIds.has(item.id);
          const inWatchlist = watchlistTmdbIds.has(item.id);
          return !isGloballyExcluded && !inWatchlist;
        });
      }
    };

    // Fetch movies
    if (mediaType === 'movie' || mediaType === 'mixed') {
      let page = getRandomPage();
      console.log('[SmartRecs] Fetching movies, page:', page);

      const movieResponse = await tmdbApi.get('/discover/movie', {
        params: {
          with_genres: genreIds.join(','),
          page,
          sort_by: 'popularity.desc',
          'vote_count.gte': 100,
          'vote_average.gte': 6.0,
        },
      });

      let movies = (movieResponse.data?.results || [])
        .map((item: any) => ({
          ...item,
          media_type: 'movie',  // FORCE set media_type
          // Normalize genre_ids from genres if needed
          genre_ids: item.genre_ids || (item.genres?.map((g: any) =>
            typeof g === 'number' ? g : g.id
          )) || [],
        }));

      movies = filterItems(movies);

      console.log('[SmartRecs] Movies after filtering:', movies.length, 'of', movieResponse.data?.results?.length);

      // If we got very few results and this is movie-only mode, try another page
      if (mediaType === 'movie' && movies.length < 5) {
        page = page + 3; // Try a few pages ahead
        console.log('[SmartRecs] Fetching more movies, page:', page);

        const secondResponse = await tmdbApi.get('/discover/movie', {
          params: {
            with_genres: genreIds.join(','),
            page,
            sort_by: 'popularity.desc',
            'vote_count.gte': 100,
            'vote_average.gte': 6.0,
          },
        });

        const moreMovies = (secondResponse.data?.results || [])
          .map((item: any) => ({
            ...item,
            media_type: 'movie',
            genre_ids: item.genre_ids || [],
          }));

        const filteredMoreMovies = filterItems(moreMovies);
        console.log('[SmartRecs] More movies after filtering:', filteredMoreMovies.length);
        movies = [...movies, ...filteredMoreMovies];
      }

      // Add to session cache only for mixed mode
      if (mediaType === 'mixed') {
        movies.forEach((m: any) => addToSessionCache(m.id));
      }
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

      let page = getRandomPage();
      console.log('[SmartRecs] Fetching TV, page:', page);

      const tvResponse = await tmdbApi.get('/discover/tv', {
        params: {
          with_genres: tvGenreIds.join(','),
          page,
          sort_by: 'popularity.desc',
          'vote_count.gte': 50,
          'vote_average.gte': 6.0,
        },
      });

      let tvShows = (tvResponse.data?.results || [])
        .map((item: any) => ({
          ...item,
          media_type: 'tv',  // FORCE set media_type
          // Normalize genre_ids from genres if needed
          genre_ids: item.genre_ids || (item.genres?.map((g: any) =>
            typeof g === 'number' ? g : g.id
          )) || [],
        }));

      tvShows = filterItems(tvShows);

      console.log('[SmartRecs] TV after filtering:', tvShows.length, 'of', tvResponse.data?.results?.length);

      // If we got very few results and this is TV-only mode, try another page
      if (mediaType === 'tv' && tvShows.length < 5) {
        page = page + 3; // Try a few pages ahead
        console.log('[SmartRecs] Fetching more TV, page:', page);

        const secondResponse = await tmdbApi.get('/discover/tv', {
          params: {
            with_genres: tvGenreIds.join(','),
            page,
            sort_by: 'popularity.desc',
            'vote_count.gte': 50,
            'vote_average.gte': 6.0,
          },
        });

        const moreTVShows = (secondResponse.data?.results || [])
          .map((item: any) => ({
            ...item,
            media_type: 'tv',
            genre_ids: item.genre_ids || [],
          }));

        const filteredMoreTV = filterItems(moreTVShows);
        console.log('[SmartRecs] More TV after filtering:', filteredMoreTV.length);
        tvShows = [...tvShows, ...filteredMoreTV];
      }

      // Add to session cache only for mixed mode
      if (mediaType === 'mixed') {
        tvShows.forEach((t: any) => addToSessionCache(t.id));
      }
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

// ============================================================================
// GENRE-SPECIFIC RECOMMENDATIONS (Netflix-style)
// ============================================================================

export const getGenreRecommendations = async ({
  userId,
  genre,
  mediaType = 'mixed',
  limit = 20,
}: {
  userId: string;
  genre: string;
  mediaType?: 'movie' | 'tv' | 'mixed';
  limit?: number;
}): Promise<any[]> => {
  console.log('[SmartRecs] Getting genre recommendations:', { genre, mediaType, limit });

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

  // Get genre IDs from name
  const genreIds = GENRE_NAME_TO_IDS[genre];
  if (!genreIds || genreIds.length === 0) {
    console.warn(`[SmartRecs] Unknown genre: ${genre}`);
    return [];
  }

  console.log('[SmartRecs] Genre IDs:', genreIds);

  const recommendations: any[] = [];

  // Random page for variety (1-10)
  const getRandomPage = () => Math.floor(Math.random() * 10) + 1;

  try {
    // Fetch movies
    if (mediaType === 'movie' || mediaType === 'mixed') {
      const page = getRandomPage();
      console.log('[SmartRecs] Fetching movies for genre, page:', page);

      const movieResponse = await tmdbApi.get('/discover/movie', {
        params: {
          with_genres: genreIds.join(','),
          page,
          sort_by: 'popularity.desc',
          'vote_count.gte': 100,
          'vote_average.gte': 6.0,
          // Special handling for Anime
          ...(genre === 'Anime' && { with_original_language: 'ja' }),
          // Exclude non-Japanese for regular Animation
          ...(genre === 'Animation' && { without_original_language: 'ja' }),
        },
      });

      const movies = (movieResponse.data?.results || [])
        .filter((item: any) => !shouldExclude(item.id))
        .map((item: any) => ({
          ...item,
          media_type: 'movie',
          genre_ids: item.genre_ids || [],
        }));

      console.log('[SmartRecs] Movies after filtering:', movies.length);
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
      console.log('[SmartRecs] Fetching TV for genre, page:', page);

      const tvResponse = await tmdbApi.get('/discover/tv', {
        params: {
          with_genres: tvGenreIds.join(','),
          page,
          sort_by: 'popularity.desc',
          'vote_count.gte': 50,
          'vote_average.gte': 6.0,
          // Special handling for Anime
          ...(genre === 'Anime' && { with_original_language: 'ja' }),
          // Exclude non-Japanese for regular Animation
          ...(genre === 'Animation' && { without_original_language: 'ja' }),
        },
      });

      const tvShows = (tvResponse.data?.results || [])
        .filter((item: any) => !shouldExclude(item.id))
        .map((item: any) => ({
          ...item,
          media_type: 'tv',
          genre_ids: item.genre_ids || [],
        }));

      console.log('[SmartRecs] TV after filtering:', tvShows.length);
      tvShows.forEach((t: any) => addToSessionCache(t.id));
      recommendations.push(...tvShows);
    }

    // Shuffle for variety
    const shuffled = recommendations.sort(() => Math.random() - 0.5);

    // Save session cache
    await saveSessionCache();

    // Return limited results
    const results = shuffled.slice(0, limit);

    console.log('[SmartRecs] Returning', results.length, 'genre recommendations for', genre);
    return results;
  } catch (error) {
    console.error('[SmartRecs] Error fetching genre recommendations:', error);
    return [];
  }
};
