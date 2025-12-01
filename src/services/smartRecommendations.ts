import { supabase } from './supabase';
import { tmdbApi } from './tmdb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserTopGenres } from './genreAffinity';
import { getAdaptiveRecommendationParams } from './userBehavior';
import { getNegativeSignals, filterByNegativeSignals, trackContentImpression } from './implicitSignals';

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

// Separate genre mappings for movies and TV
// TMDb uses different genre IDs for movies vs TV shows
const MOVIE_GENRE_IDS: Record<string, number[]> = {
  'Drama': [18],
  'Adventure': [12],
  'Action': [28],
  'Science Fiction': [878],
  'Animation': [16],
  'Anime': [16], // Same as animation, filtered by language
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
};

const TV_GENRE_IDS: Record<string, number[]> = {
  'Drama': [18],
  'Adventure': [12], // Note: TV doesn't have separate Adventure, using Action & Adventure
  'Action': [10759], // Action & Adventure
  'Science Fiction': [10765], // Sci-Fi & Fantasy
  'Animation': [16],
  'Anime': [16],
  'Comedy': [35],
  'Thriller': [53], // Note: TV doesn't have Thriller, but we keep for compatibility
  'Horror': [27], // Note: TV doesn't have Horror, but we keep for compatibility
  'Romance': [10749],
  'Documentary': [99],
  'Crime': [80],
  'Mystery': [9648],
  'Fantasy': [10765], // Sci-Fi & Fantasy
  'Family': [10751],
  'War': [10752], // War & Politics
  'History': [36], // Note: TV doesn't have History, but we keep for compatibility
  // TV-specific genres
  'Sci-Fi & Fantasy': [10765],
  'Action & Adventure': [10759],
};

interface RecommendationOptions {
  userId: string;
  limit?: number;
  mediaType?: 'movie' | 'tv' | 'mixed';
  forceRefresh?: boolean;
}

/**
 * Diversify recommendations to prevent genre clustering
 * Ensures variety by preventing too many consecutive items of the same genre
 * and capping total percentage per genre
 */
const diversifyRecommendations = (
  items: any[],
  options: {
    maxConsecutiveSameGenre?: number;
    maxPercentagePerGenre?: number;
  } = {}
): any[] => {
  const {
    maxConsecutiveSameGenre = 2,
    maxPercentagePerGenre = 0.3, // 30% cap
  } = options;

  if (items.length === 0) return items;

  const result: any[] = [];
  const remaining: any[] = [...items];
  const genreCounts: Record<number, number> = {};
  const maxPerGenre = Math.floor(items.length * maxPercentagePerGenre);

  console.log('[SmartRecs] Diversifying', items.length, 'items. Max per genre:', maxPerGenre, 'Max consecutive:', maxConsecutiveSameGenre);

  // Track last N genres to prevent clustering
  const recentGenres: number[] = [];

  while (remaining.length > 0 && result.length < items.length) {
    let selected = false;

    // Try to find an item that doesn't create clustering
    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const primaryGenre = item.genre_ids?.[0] || item.genres?.[0] || 0;

      // Check if this genre is at cap
      const genreCount = genreCounts[primaryGenre] || 0;
      if (genreCount >= maxPerGenre) {
        continue; // Skip, this genre is at capacity
      }

      // Check if this would create too many consecutive same-genre items
      const consecutiveCount = recentGenres.slice(-maxConsecutiveSameGenre).filter(g => g === primaryGenre).length;
      if (consecutiveCount >= maxConsecutiveSameGenre) {
        continue; // Skip, would create clustering
      }

      // This item passes both checks - use it
      result.push(item);
      remaining.splice(i, 1);

      // Update tracking
      genreCounts[primaryGenre] = genreCount + 1;
      recentGenres.push(primaryGenre);
      if (recentGenres.length > maxConsecutiveSameGenre * 2) {
        recentGenres.shift(); // Keep recent history manageable
      }

      selected = true;
      break;
    }

    // If we couldn't find a suitable item, relax the consecutive constraint
    if (!selected && remaining.length > 0) {
      const item = remaining[0];
      const primaryGenre = item.genre_ids?.[0] || item.genres?.[0] || 0;

      // Still check genre cap
      const genreCount = genreCounts[primaryGenre] || 0;
      if (genreCount < maxPerGenre || result.length + remaining.length <= items.length) {
        result.push(item);
        remaining.splice(0, 1);
        genreCounts[primaryGenre] = genreCount + 1;
        recentGenres.push(primaryGenre);
      } else {
        // Skip this item entirely if at cap
        remaining.splice(0, 1);
      }
    }
  }

  // Log genre distribution
  const distribution = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  console.log('[SmartRecs] Genre distribution (top 5):', distribution);

  return result;
};

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
    // Detect user behavior pattern and get adaptive strategy
    const { pattern, strategy } = await getAdaptiveRecommendationParams(userId);

    console.log('[SmartRecs] User behavior:', {
      mode: pattern.mode,
      avgItemsPerSession: pattern.averageItemsPerSession,
      confidence: pattern.confidence,
      strategy: strategy.description,
    });

    // Get negative signals (content user has repeatedly rejected)
    const negativeSignals = await getNegativeSignals(userId);
    if (negativeSignals.strongRejections.length > 0) {
      console.log('[SmartRecs] Negative signals detected:', {
        strongRejections: negativeSignals.strongRejections.length,
        avoidGenres: negativeSignals.avoidGenres,
        patterns: negativeSignals.rejectionPatterns.length,
      });
    }

    // Get user genre affinity with temporal decay applied
    // Recent interactions are weighted more heavily than older ones
    const topGenresData = await getUserTopGenres(userId, 5, true); // useDecay=true

    // Determine top genres based on user mode
    let topGenres: string[] = [];
    if (topGenresData && topGenresData.length > 0) {
      const genreCount = pattern.mode === 'discovery' ? 5 : pattern.mode === 'intentional' ? 3 : 4;
      topGenres = topGenresData.slice(0, genreCount).map(g => g.genreName);

      // For discovery mode, potentially add a new genre
      if (pattern.mode === 'discovery' && Math.random() < strategy.newGenreRatio) {
        const allGenres = ['Drama', 'Action', 'Comedy', 'Adventure', 'Science Fiction', 'Thriller', 'Horror', 'Romance'];
        const newGenres = allGenres.filter(g => !topGenres.includes(g));
        if (newGenres.length > 0) {
          const randomNewGenre = newGenres[Math.floor(Math.random() * newGenres.length)];
          topGenres.push(randomNewGenre);
          console.log('[SmartRecs] Discovery mode: Added new genre:', randomNewGenre);
        }
      }

      console.log('[SmartRecs] Top genres (with temporal decay):',
        topGenresData.map(g => `${g.genreName} (${g.score.toFixed(2)})`).join(', ')
      );
    } else {
      topGenres = ['Drama', 'Action', 'Comedy', 'Adventure', 'Science Fiction'];
      console.log('[SmartRecs] Using default genres (no affinity data)');
    }

    console.log('[SmartRecs] Selected genres for', pattern.mode, 'mode:', topGenres);

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

      // Convert genre names to movie-specific genre IDs
      const movieGenreIds = topGenres
        .flatMap(name => MOVIE_GENRE_IDS[name] || [])
        .slice(0, 3);

      // Use first 2-3 genres with OR operator for variety (not too specific, not too broad)
      const movieGenreQuery = movieGenreIds.join('|');

      // Adjust quality thresholds based on user mode
      const minVoteCount = pattern.mode === 'passive' ? 500 : 100; // Passive mode: popular only
      const minRating = pattern.mode === 'passive' ? 7.0 : pattern.mode === 'intentional' ? 6.5 : 6.0;

      console.log('[SmartRecs] Fetching movies with genre IDs:', movieGenreIds, 'query:', movieGenreQuery, 'page:', page,
        'mode:', pattern.mode, 'minRating:', minRating, 'minVotes:', minVoteCount);

      const movieResponse = await tmdbApi.get('/discover/movie', {
        params: {
          with_genres: movieGenreQuery,  // Use | for OR query instead of , for AND
          page,
          sort_by: 'popularity.desc',
          'vote_count.gte': minVoteCount,
          'vote_average.gte': minRating,
        },
      });

      let movies = (movieResponse.data?.results || [])
        .map((item: any) => normalizeContentItem(item, 'movie'));

      movies = filterItems(movies);

      console.log('[SmartRecs] Movies after filtering:', movies.length, 'of', movieResponse.data?.results?.length);

      // If we got very few results and this is movie-only mode, try another page
      if (mediaType === 'movie' && movies.length < 5) {
        page = page + 3; // Try a few pages ahead
        console.log('[SmartRecs] Fetching more movies, page:', page);

        const secondResponse = await tmdbApi.get('/discover/movie', {
          params: {
            with_genres: movieGenreQuery,  // Use same OR query
            page,
            sort_by: 'popularity.desc',
            'vote_count.gte': 100,
            'vote_average.gte': 6.0,
          },
        });

        const moreMovies = (secondResponse.data?.results || [])
          .map((item: any) => normalizeContentItem(item, 'movie'));

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
      // Convert genre names to TV-specific genre IDs
      const tvGenreIds = topGenres
        .flatMap(name => TV_GENRE_IDS[name] || [])
        .slice(0, 2); // Use fewer genres for TV to avoid overly specific queries

      let page = getRandomPage();

      // Use only first 2 genres with OR operator to avoid overly specific queries
      const genreQuery = tvGenreIds.join('|');

      // Adjust quality thresholds based on user mode
      const minVoteCount = pattern.mode === 'passive' ? 200 : 50; // Passive mode: popular only
      const minRating = pattern.mode === 'passive' ? 7.0 : pattern.mode === 'intentional' ? 6.5 : 6.0;

      console.log('[SmartRecs] Fetching TV with genre IDs:', tvGenreIds, 'query:', genreQuery, 'page:', page,
        'mode:', pattern.mode, 'minRating:', minRating, 'minVotes:', minVoteCount);

      const tvResponse = await tmdbApi.get('/discover/tv', {
        params: {
          with_genres: genreQuery,  // Use | for OR query instead of , for AND
          page,
          sort_by: 'popularity.desc',
          'vote_count.gte': minVoteCount,
          'vote_average.gte': minRating,
        },
      });

      console.log('[SmartRecs] TV API returned:', tvResponse.data?.results?.length || 0, 'items');

      let tvShows = (tvResponse.data?.results || [])
        .map((item: any) => normalizeContentItem(item, 'tv'));

      tvShows = filterItems(tvShows);

      console.log('[SmartRecs] TV after filtering:', tvShows.length, 'of', tvResponse.data?.results?.length);

      // If we got very few results and this is TV-only mode, try fallback strategies
      if (mediaType === 'tv' && tvShows.length < 5) {
        console.log('[SmartRecs] Got few TV results, trying fallback...');

        // Try fetching popular TV without genre filter
        const fallbackResponse = await tmdbApi.get('/discover/tv', {
          params: {
            page: getRandomPage(),
            sort_by: 'popularity.desc',
            'vote_count.gte': 100,
            'vote_average.gte': 6.5,
          },
        });

        console.log('[SmartRecs] Fallback TV (no genre filter) returned:', fallbackResponse.data?.results?.length || 0, 'items');

        const moreTVShows = (fallbackResponse.data?.results || [])
          .map((item: any) => normalizeContentItem(item, 'tv'));

        const filteredMoreTV = filterItems(moreTVShows);
        console.log('[SmartRecs] Fallback TV after filtering:', filteredMoreTV.length);
        tvShows = [...tvShows, ...filteredMoreTV];
      }

      // Add to session cache only for mixed mode
      if (mediaType === 'mixed') {
        tvShows.forEach((t: any) => addToSessionCache(t.id));
      }
      recommendations.push(...tvShows);
    }

    // First shuffle for initial randomization
    const shuffled = recommendations.sort(() => Math.random() - 0.5);

    // Apply negative signal filtering (remove content user has repeatedly rejected)
    const negativeFiltered = filterByNegativeSignals(shuffled, negativeSignals);
    console.log('[SmartRecs] After negative filtering:', negativeFiltered.length, 'of', shuffled.length);

    // Then apply smart diversification to prevent genre clustering
    const diversified = diversifyRecommendations(negativeFiltered, {
      maxConsecutiveSameGenre: 2,
      maxPercentagePerGenre: 0.3, // 30% cap per genre
    });

    // Save session cache
    await saveSessionCache();

    // Return limited results
    const results = diversified.slice(0, limit);

    // Track impressions for implicit signal learning
    // This allows us to learn what users DON'T like based on repeated exposure without engagement
    await trackContentImpression(
      userId,
      results.map(r => ({
        id: r.id,
        title: r.title || r.name,
        genreIds: r.genre_ids || r.genres,
        rating: r.vote_average || r.rating,
        mediaType: r.media_type,
      })),
      'for_you'
    );

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

/**
 * Normalize content item to ensure consistent data structure
 * TV shows use 'name' field, movies use 'title' field
 */
const normalizeContentItem = (item: any, mediaType: 'movie' | 'tv') => {
  return {
    id: item.id,
    media_type: mediaType,
    // Normalize title - TV shows use 'name', movies use 'title'
    title: item.title || item.name || 'Unknown Title',
    name: item.name || item.title,
    // Ensure poster_path has full URL or null
    poster_path: item.poster_path || null,
    posterPath: item.poster_path || null,
    // Normalize dates
    release_date: item.release_date || item.first_air_date,
    first_air_date: item.first_air_date || item.release_date,
    // Include ratings
    vote_average: item.vote_average || 0,
    vote_count: item.vote_count || 0,
    rating: item.vote_average || 0,
    // Include other useful fields
    overview: item.overview || '',
    genre_ids: item.genre_ids || [],
    genres: item.genre_ids || [],
    original_language: item.original_language,
    popularity: item.popularity,
  };
};

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

  const recommendations: any[] = [];

  // Random page for variety (1-10)
  const getRandomPage = () => Math.floor(Math.random() * 10) + 1;

  try {
    // Fetch movies
    if (mediaType === 'movie' || mediaType === 'mixed') {
      // Get movie-specific genre IDs
      const movieGenreIds = MOVIE_GENRE_IDS[genre];
      if (!movieGenreIds || movieGenreIds.length === 0) {
        console.warn(`[SmartRecs] Unknown movie genre: ${genre}`);
        if (mediaType === 'movie') return [];
        // Continue to TV if mixed mode
      } else {
        const page = getRandomPage();
        console.log('[SmartRecs] Fetching movies for genre:', genre, 'IDs:', movieGenreIds, 'page:', page);

        const movieResponse = await tmdbApi.get('/discover/movie', {
          params: {
            with_genres: movieGenreIds.join('|'), // Use OR query for variety
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
          .map((item: any) => normalizeContentItem(item, 'movie'));

        console.log('[SmartRecs] Movies after filtering:', movies.length);
        movies.forEach((m: any) => addToSessionCache(m.id));
        recommendations.push(...movies);
      }
    }

    // Fetch TV shows
    if (mediaType === 'tv' || mediaType === 'mixed') {
      // Get TV-specific genre IDs
      const tvGenreIds = TV_GENRE_IDS[genre];
      if (!tvGenreIds || tvGenreIds.length === 0) {
        console.warn(`[SmartRecs] Unknown TV genre: ${genre}`);
        if (mediaType === 'tv') return [];
        // Continue if mixed mode
      } else {
        const page = getRandomPage();
        console.log('[SmartRecs] Fetching TV for genre:', genre, 'IDs:', tvGenreIds, 'page:', page);

        const tvResponse = await tmdbApi.get('/discover/tv', {
          params: {
            with_genres: tvGenreIds.join('|'), // Use OR query for variety
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
          .map((item: any) => normalizeContentItem(item, 'tv'));

        console.log('[SmartRecs] TV after filtering:', tvShows.length);
        tvShows.forEach((t: any) => addToSessionCache(t.id));
        recommendations.push(...tvShows);
      }
    }

    // First shuffle for initial randomization
    const shuffled = recommendations.sort(() => Math.random() - 0.5);

    // Apply smart diversification (less strict for genre-specific queries)
    const diversified = diversifyRecommendations(shuffled, {
      maxConsecutiveSameGenre: 3, // More lenient since filtering by genre already
      maxPercentagePerGenre: 0.5, // 50% cap for genre-specific
    });

    // Save session cache
    await saveSessionCache();

    // Return limited results
    const results = diversified.slice(0, limit);

    console.log('[SmartRecs] Returning', results.length, 'genre recommendations for', genre);
    return results;
  } catch (error) {
    console.error('[SmartRecs] Error fetching genre recommendations:', error);
    return [];
  }
};
