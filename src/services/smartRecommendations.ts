import { supabase } from './supabase';
import { getWatchlistIds } from './watchlistDataService';
import { tmdbApi } from './tmdb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserTopGenres } from './genreAffinity';
import { getAdaptiveRecommendationParams } from './userBehavior';
import { getNegativeSignals, filterByNegativeSignals, trackContentImpression } from './implicitSignals';
import { buildUserDNAProfile, rankByDNASimilarity } from './contentDNA';
import { mixCollaborativeRecommendations } from './collaborativeFiltering';
import { getImpressionHistory, applyFatigueFilter, trackBatchImpressions } from './recommendationFatigue';
import { getUserProviderIds } from './watchProviders';
import { getSVDRecommendations, type Prediction } from './matrixFactorization';
import { convertGenreIdsToObjects } from '@/utils/genreUtils';

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
  // Guard against undefined/null userId
  if (!userId || userId === 'undefined' || userId === 'null') {
    console.warn('[SmartRecs] ⚠️  initializeExclusions called with invalid userId:', userId);
    globalExcludeIds = new Set();
    watchlistTmdbIds = new Set();
    return;
  }

  try {
    const ids = await getWatchlistIds(userId);

    // Convert to numbers for exclusion checking (TMDB IDs are numbers)
    globalExcludeIds = new Set();
    watchlistTmdbIds = new Set(); // Keep in sync

    ids.forEach(id => {
      // Try direct number conversion first
      let num = Number(id);

      if (!isNaN(num)) {
        // Direct tmdb_id like "99966"
        globalExcludeIds.add(num);
        watchlistTmdbIds.add(num);
      } else {
        // Try parsing content_id format: "tv-99966" or "movie-12345"
        const match = id.match(/^(tv|movie)-(\d+)$/);
        if (match) {
          num = parseInt(match[2], 10);
          globalExcludeIds.add(num);
          watchlistTmdbIds.add(num);
        }
        // Ignore UUID format - we need tmdb_id for exclusions
      }
    });

    console.log(`[SmartRecs] Initialized exclusions: ${globalExcludeIds.size} items (watchlist: ${watchlistTmdbIds.size})`);
    console.log(`[SmartRecs] Sample exclusions:`, Array.from(globalExcludeIds).slice(0, 10));
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

    // Load FRESH watchlist IDs safely
    const ids = await getWatchlistIds(userId);
    watchlistTmdbIds = new Set();
    ids.forEach(id => {
      let num = Number(id);
      if (!isNaN(num)) {
        watchlistTmdbIds.add(num);
      } else {
        // Parse content_id format: "tv-99966" or "movie-12345"
        const match = id.match(/^(tv|movie)-(\d+)$/);
        if (match) {
          num = parseInt(match[2], 10);
          watchlistTmdbIds.add(num);
        }
      }
    });

    console.log('[SmartRecs] Loaded watchlist IDs:', watchlistTmdbIds.size, 'items');

    // Cache to storage
    await AsyncStorage.setItem(WATCHLIST_CACHE_KEY, JSON.stringify({
      ids: Array.from(watchlistTmdbIds),
      timestamp: Date.now(),
    }));

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
const shouldExclude = (tmdbId: number, excludeSessionItems: boolean = true): boolean => {
  // Exclude if in global exclusions or watchlist
  const isGloballyExcluded = globalExcludeIds.has(tmdbId);
  const inWatchlist = watchlistTmdbIds.has(tmdbId);

  // For infinite feeds (Discover), don't exclude session items - use pagination instead
  const alreadyShown = excludeSessionItems ? sessionShownIds.has(tmdbId) : false;

  const excluded = isGloballyExcluded || inWatchlist || alreadyShown;

  // Log exclusions for debugging (only for excluded items to reduce noise)
  if (excluded) {
    console.log(`[SmartRecs] Excluding ${tmdbId}:`, {
      inGlobalExclusions: isGloballyExcluded,
      inWatchlist,
      alreadyShown,
    });
  }

  return excluded;
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
  'Adventure': [10759], // TV uses Action & Adventure (genre ID 10759)
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
  'War': [10768], // TV uses War & Politics (genre ID 10768)
  'History': [36], // Note: TV doesn't have History, but we keep for compatibility
  // TV-specific genres
  'Sci-Fi & Fantasy': [10765],
  'Action & Adventure': [10759],
  'War & Politics': [10768],
};

interface RecommendationOptions {
  userId: string;
  limit?: number;
  mediaType?: 'movie' | 'tv' | 'mixed';
  forceRefresh?: boolean;
  excludeSessionItems?: boolean;  // For infinite feeds (Discover), set to false
  genres?: number[];  // Specific genre IDs to fetch (overrides user's top genres)
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

/**
 * 🎯 Smart Recommendations Engine
 *
 * 5-Tier Adaptive Intelligence Pipeline:
 *
 * 1️⃣ Genre Affinity with Temporal Decay (genreAffinity.ts)
 *    - Tracks genre preferences from watchlist
 *    - Applies 30-day half-life decay (recent tastes weighted more)
 *    - Base layer for understanding user preferences
 *
 * 2️⃣ Interaction Velocity Tracking (userBehavior.ts)
 *    - Detects user mode: Discovery (5+ items/session) | Intentional (1-4) | Passive (<1)
 *    - Adapts variety ratio, genre exploration, quality thresholds per mode
 *    - Discovery: High variety, explore new genres
 *    - Intentional: Deep matches, curated quality
 *    - Passive: Highlights, popular re-engagement
 *
 * 3️⃣ Negative Signal Inference (implicitSignals.ts)
 *    - Tracks content shown but not added (implicit rejection)
 *    - Identifies patterns: rejected genres, rating ranges, media types
 *    - Filters out content with strong rejection signals (shown 10+ times)
 *
 * 4️⃣ Content DNA Matching (contentDNA.ts)
 *    - Analyzes deep attributes: tone, pace, era, complexity, audience type
 *    - Builds user DNA profile from watchlist patterns
 *    - Re-ranks recommendations by DNA similarity (0-100 score)
 *
 * 5️⃣ Collaborative Filtering Lite (collaborativeFiltering.ts)
 *    - Finds similar users (15%+ watchlist overlap via Jaccard similarity)
 *    - Recommends items popular among similar users
 *    - Privacy-conscious: only public watchlist data, no personal info
 *    - Mixes 30% collaborative recommendations into final results
 *
 * Pipeline Flow:
 * Fetch → Filter → Diversify → Negative Signals → DNA Rank → Collaborative Mix → Return
 */
export const getSmartRecommendations = async (
  options: RecommendationOptions
): Promise<any[]> => {
  const { userId, limit = 20, mediaType = 'mixed', forceRefresh = false, excludeSessionItems = true } = options;

  // Force refresh watchlist cache if requested
  if (forceRefresh) {
    cacheInitialized = false;
    sessionShownIds.clear();
    await AsyncStorage.removeItem(SESSION_CACHE_KEY);
  }

  // Initialize caches
  await initializeCaches(userId);

  // ALWAYS refresh watchlist IDs to catch new additions
  const ids = await getWatchlistIds(userId);
  watchlistTmdbIds = new Set();
  globalExcludeIds = new Set(); // Keep in sync with watchlistTmdbIds

  ids.forEach(id => {
    let num = Number(id);
    if (!isNaN(num)) {
      watchlistTmdbIds.add(num);
      globalExcludeIds.add(num);
    } else {
      // Parse content_id format: "tv-99966" or "movie-12345"
      const match = id.match(/^(tv|movie)-(\d+)$/);
      if (match) {
        num = parseInt(match[2], 10);
        watchlistTmdbIds.add(num);
        globalExcludeIds.add(num);
      }
    }
  });

  console.log(`[SmartRecs] Watchlist exclusions updated: ${watchlistTmdbIds.size} items (global: ${globalExcludeIds.size})`);

  // SMART CACHE MANAGEMENT: Prevent session cache from growing too large
  // When cache exceeds 500 items, keep only the most recent 200
  if (sessionShownIds.size > 500) {
    console.warn('[SmartRecs] Session cache too large (', sessionShownIds.size, '), pruning to 200 most recent items');
    const idsArray = Array.from(sessionShownIds);
    // Keep last 200 items (most recently added)
    const recentIds = idsArray.slice(-200);
    sessionShownIds = new Set(recentIds);
    await saveSessionCache();
    console.log('[SmartRecs] Session cache pruned to', sessionShownIds.size, 'items');
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

    // Get user's streaming service provider IDs for filtering
    const userProviderIds = await getUserProviderIds(userId);
    const providerQuery = userProviderIds.length > 0 ? userProviderIds.join('|') : null;
    if (providerQuery) {
      console.log('[SmartRecs] Filtering by user providers:', userProviderIds);
    } else {
      console.log('[SmartRecs] No subscriptions found - showing all content');
    }

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

    // Random page for variety
    const getRandomPage = () => {
      // For infinite feeds (Discover), use wide page range for infinite variety
      if (!excludeSessionItems) {
        return Math.floor(Math.random() * 50) + 1; // Pages 1-50
      }

      // SMART PAGE SELECTION: When session cache is large, use wider page range
      // This prevents always filtering out page 1 content when user has seen lots of items
      if (sessionShownIds.size > 300) {
        console.log('[SmartRecs] Large session cache detected, using pages 1-20 for variety');
        return Math.floor(Math.random() * 20) + 1; // Pages 1-20
      }

      // For carousels, use lower range for better quality
      if (mediaType === 'movie' || mediaType === 'tv') {
        return Math.floor(Math.random() * 3) + 1;
      }
      // For mixed, use pages 1-5
      return Math.floor(Math.random() * 5) + 1;
    };

    // Helper to filter items
    // For infinite feeds (Discover), excludeSessionItems should be false
    // For carousels (For You, Tips), excludeSessionItems should be true
    const filterItems = (items: any[]) => {
      return items.filter((item: any) => !shouldExclude(item.id, excludeSessionItems));
    };

    // Fetch movies
    if (mediaType === 'movie' || mediaType === 'mixed') {
      let page = getRandomPage();

      // Convert genre names to movie-specific genre IDs
      // If specific genres are requested, use those instead of user's top genres
      const movieGenreIds = options.genres && options.genres.length > 0
        ? options.genres
        : topGenres
            .flatMap(name => MOVIE_GENRE_IDS[name] || [])
            .slice(0, 3);

      // Use first 2-3 genres with OR operator for variety (not too specific, not too broad)
      const movieGenreQuery = movieGenreIds.join('|');

      // Adjust quality thresholds based on user mode
      const minVoteCount = pattern.mode === 'passive' ? 500 : 100; // Passive mode: popular only
      const minRating = pattern.mode === 'passive' ? 7.0 : pattern.mode === 'intentional' ? 6.5 : 6.0;

      console.log('[SmartRecs] Fetching movies with genre IDs:', movieGenreIds, 'query:', movieGenreQuery, 'page:', page,
        'mode:', pattern.mode, 'minRating:', minRating, 'minVotes:', minVoteCount);

      let movies: any[] = [];
      let attempts = 0;
      const maxAttempts = 5;

      // FALLBACK MECHANISM: Try multiple pages if current page returns 0 results
      while (movies.length < 5 && attempts < maxAttempts) {
        const movieResponse = await tmdbApi.get('/discover/movie', {
            params: {
              with_genres: movieGenreQuery,
              ...(providerQuery && { with_watch_providers: providerQuery, watch_region: 'US' }),  // Use | for OR query instead of , for AND
            page: page + attempts,
            sort_by: 'popularity.desc',
            'vote_count.gte': minVoteCount,
            'vote_average.gte': minRating,
          },
        });

        const fetchedMovies = (movieResponse.data?.results || [])
          .map((item: any) => normalizeContentItem(item, 'movie'));

        const filteredMovies = filterItems(fetchedMovies);

        console.log(`[SmartRecs] Movies page ${page + attempts}: ${filteredMovies.length} of ${fetchedMovies.length} (attempt ${attempts + 1}/${maxAttempts})`);

        if (filteredMovies.length === 0 && fetchedMovies.length > 0) {
          console.warn(`[SmartRecs] Page ${page + attempts} returned 0 after filtering. All ${fetchedMovies.length} items were excluded. Trying next page.`);
        }

        movies = [...movies, ...filteredMovies];
        attempts++;

        // Break early if we got enough results
        if (movies.length >= (mediaType === 'movie' ? 10 : 5)) {
          break;
        }
      }

      console.log('[SmartRecs] Movies total after', attempts, 'attempts:', movies.length);

      // Add to session cache only for mixed mode
      if (mediaType === 'mixed') {
        movies.forEach((m: any) => addToSessionCache(m.id));
      }
      recommendations.push(...movies);
    }

    // Fetch TV shows
    if (mediaType === 'tv' || mediaType === 'mixed') {
      // Convert genre names to TV-specific genre IDs
      // If specific genres are requested, use those instead of user's top genres
      const tvGenreIds = options.genres && options.genres.length > 0
        ? options.genres
        : topGenres
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

      let tvShows: any[] = [];
      let attempts = 0;
      const maxAttempts = 5;

      // FALLBACK MECHANISM: Try multiple pages if current page returns 0 results
      while (tvShows.length < 5 && attempts < maxAttempts) {
        const tvResponse = await tmdbApi.get('/discover/tv', {
            params: {
              with_genres: genreQuery,
              ...(providerQuery && { with_watch_providers: providerQuery, watch_region: 'US' }),  // Use | for OR query instead of , for AND
            page: page + attempts,
            sort_by: 'popularity.desc',
            'vote_count.gte': minVoteCount,
            'vote_average.gte': minRating,
          },
        });

        const fetchedTV = (tvResponse.data?.results || [])
          .map((item: any) => normalizeContentItem(item, 'tv'));

        const filteredTV = filterItems(fetchedTV);

        console.log(`[SmartRecs] TV page ${page + attempts}: ${filteredTV.length} of ${fetchedTV.length} (attempt ${attempts + 1}/${maxAttempts})`);

        if (filteredTV.length === 0 && fetchedTV.length > 0) {
          console.warn(`[SmartRecs] Page ${page + attempts} returned 0 after filtering. All ${fetchedTV.length} items were excluded. Trying next page.`);
        }

        tvShows = [...tvShows, ...filteredTV];
        attempts++;

        // Break early if we got enough results
        if (tvShows.length >= (mediaType === 'tv' ? 10 : 5)) {
          break;
        }
      }

      console.log('[SmartRecs] TV total after', attempts, 'attempts:', tvShows.length);

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

    // Build user DNA profile and apply DNA-based re-ranking
    const userDNA = await buildUserDNAProfile(userId);
    const dnaRanked = userDNA
      ? rankByDNASimilarity(diversified, userDNA)
      : diversified;

    if (userDNA) {
      console.log('[SmartRecs] Applied DNA matching:', {
        tone: userDNA.preferredTone,
        pace: userDNA.preferredPace,
        complexity: userDNA.preferredComplexity,
        confidence: userDNA.confidence,
      });
    }

    // Mix in collaborative filtering recommendations (Strategy 5)
    // Blend both traditional collaborative filtering AND Netflix-style SVD
    let withCollaborative = dnaRanked;

    // 5a. Traditional collaborative filtering (user-user similarity)
    withCollaborative = await mixCollaborativeRecommendations(
      userId,
      dnaRanked,
      0.2 // 20% traditional collaborative
    );

    // 5b. SVD Matrix Factorization (Netflix-style, user-item latent factors)
    try {
      const svdPredictions = await getSVDRecommendations(userId, 20);

      if (svdPredictions.length > 0) {
        console.log(`[SmartRecs] Found ${svdPredictions.length} SVD predictions`);

        // Fetch content details for SVD predictions
        const svdContent = await Promise.all(
          svdPredictions.slice(0, Math.ceil(limit * 0.3)).map(async (prediction) => {
            try {
              // Try to find in existing recommendations first
              const existing = withCollaborative.find(r => r.id === prediction.tmdbId);
              if (existing) {
                // Boost existing item's score
                return { ...existing, svd_boosted: true, predicted_rating: prediction.predictedRating };
              }

              // Fetch from TMDb if not in current set
              const detailsResponse = await tmdbApi.get(`/movie/${prediction.tmdbId}`);
              const item = normalizeContentItem(detailsResponse.data, 'movie');

              return {
                ...item,
                svd_rating: prediction.predictedRating,
                svd_confidence: prediction.confidence,
              };
            } catch (error) {
              console.warn(`[SmartRecs] Failed to fetch SVD item ${prediction.tmdbId}:`, error);
              return null;
            }
          })
        );

        const validSVDContent = svdContent.filter(item => item !== null);

        // Blend SVD recommendations with existing (30% SVD, 70% existing)
        const svdCount = Math.ceil(limit * 0.3);
        const existingCount = limit - svdCount;

        const blended = [
          ...validSVDContent.slice(0, svdCount),
          ...withCollaborative.slice(0, existingCount),
        ];

        withCollaborative = blended;

        console.log('[SmartRecs] Blended with SVD:', {
          svdItems: validSVDContent.length,
          total: blended.length,
        });
      } else {
        console.log('[SmartRecs] No SVD recommendations available, using traditional only');
      }
    } catch (svdError) {
      console.warn('[SmartRecs] SVD recommendations failed, continuing without:', svdError);
    }

    console.log('[SmartRecs] Mixed collaborative recommendations:', {
      original: dnaRanked.length,
      withCollab: withCollaborative.length,
    });

    // 6️⃣ Apply Recommendation Fatigue Filter (Strategy 6)
    // Deprioritize or hide content seen too many times without engagement
    const impressionHistory = await getImpressionHistory(userId);
    const fatigueFiltered = applyFatigueFilter(withCollaborative, impressionHistory);

    console.log('[SmartRecs] After fatigue filtering:', {
      before: withCollaborative.length,
      after: fatigueFiltered.length,
    });

    // Save session cache
    await saveSessionCache();

    // Return limited results
    let results = fatigueFiltered.slice(0, limit);

    // FALLBACK MECHANISM: For infinite feeds (Discover), NEVER return empty
    if (!excludeSessionItems && results.length === 0) {
      console.log('[SmartRecs] Primary recommendations empty, loading trending fallback');

      try {
        // Fetch trending content as fallback
        const trendingResponse = await tmdbApi.get('/trending/all/week', {
          params: { page: Math.floor(Math.random() * 5) + 1 },
        });

        const trending = (trendingResponse.data?.results || [])
          .map((item: any) => normalizeContentItem(
            item,
            item.media_type === 'tv' ? 'tv' : 'movie'
          ))
          .filter((item: any) => !shouldExclude(item.id, false)); // Don't exclude session items

        results = trending.slice(0, limit);
        console.log('[SmartRecs] Loaded', results.length, 'trending items as fallback');
      } catch (fallbackError) {
        console.error('[SmartRecs] Trending fallback error:', fallbackError);

        // Last resort: fetch popular content
        try {
          const popularResponse = await tmdbApi.get('/movie/popular', {
            params: { page: Math.floor(Math.random() * 10) + 1 },
          });

          const popular = (popularResponse.data?.results || [])
            .map((item: any) => normalizeContentItem(item, 'movie'))
            .filter((item: any) => !shouldExclude(item.id, false));

          results = popular.slice(0, limit);
          console.log('[SmartRecs] Loaded', results.length, 'popular movies as last resort');
        } catch (lastResortError) {
          console.error('[SmartRecs] Popular fallback error:', lastResortError);
        }
      }
    }

    // Track impressions for implicit signal learning AND fatigue system
    if (results.length > 0) {
      // 1. Track for implicit signals (negative signal inference)
      await trackContentImpression(
        userId,
        results.map(r => ({
          id: r.id,
          title: r.title || r.name,
          genreIds: r.genre_ids || r.genres,
          rating: r.vote_average || r.rating,
          mediaType: r.media_type,
        })),
        excludeSessionItems ? 'for_you' : 'discover'
      );

      // 2. Track for fatigue system (simple counters)
      // We do this in background to not slow down response
      trackBatchImpressions(userId, results.map(r => r.id)).catch(err =>
        console.error('[SmartRecs] Error tracking fatigue impressions:', err)
      );
    }

    console.log('[SmartRecs] Returning', results.length, 'recommendations');
    if (results.length > 0) {
      console.log('[SmartRecs] First 5 IDs:', results.slice(0, 5).map(r => r.id));
    }

    return results;
  } catch (error) {
    console.error('[SmartRecs] Error:', error);
    return [];
  }
};

// Force refresh - call when user adds to watchlist
export const refreshWatchlistCache = async (userId: string) => {
  const ids = await getWatchlistIds(userId);
  watchlistTmdbIds = new Set();
  globalExcludeIds = new Set(); // Keep in sync

  ids.forEach(id => {
    let num = Number(id);
    if (!isNaN(num)) {
      watchlistTmdbIds.add(num);
      globalExcludeIds.add(num);
    } else {
      // Parse content_id format: "tv-99966" or "movie-12345"
      const match = id.match(/^(tv|movie)-(\d+)$/);
      if (match) {
        num = parseInt(match[2], 10);
        watchlistTmdbIds.add(num);
        globalExcludeIds.add(num);
      }
    }
  });
  console.log('[SmartRecs] Refreshed watchlist cache:', watchlistTmdbIds.size, 'items (global:', globalExcludeIds.size, ')');
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
  // Convert genre_ids array to proper TMDbGenre objects with {id, name} structure
  const genreIds = item.genre_ids || [];
  const genreObjects = convertGenreIdsToObjects(genreIds);

  return {
    id: item.id,
    type: mediaType,
    media_type: mediaType, // Keep for backward compatibility
    // Normalize title - TV shows use 'name', movies use 'title'
    title: item.title || item.name || 'Unknown Title',
    name: item.name || item.title,
    originalTitle: item.original_title || item.original_name || item.title || item.name,
    // Ensure poster_path has full URL or null
    poster_path: item.poster_path || null,
    posterPath: item.poster_path || null,
    backdropPath: item.backdrop_path || null,
    // Normalize dates
    release_date: item.release_date || item.first_air_date,
    first_air_date: item.first_air_date || item.release_date,
    releaseDate: item.release_date || item.first_air_date,
    // Include ratings
    vote_average: item.vote_average || 0,
    vote_count: item.vote_count || 0,
    voteCount: item.vote_count || 0,
    rating: item.vote_average || 0,
    // Include other useful fields
    overview: item.overview || '',
    genre_ids: genreIds, // Keep for backward compatibility
    genres: genreObjects, // ✅ FIXED: Now properly converted to TMDbGenre[] with {id, name} structure
    original_language: item.original_language,
    language: item.original_language,
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
    .select('content(tmdb_id)')
    .eq('user_id', userId);

  if (freshWatchlist) {
    watchlistTmdbIds = new Set(
      freshWatchlist
        .filter(item => item.content)
        .map(item => (item.content as any).tmdb_id)
    );
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

    // Mix in collaborative filtering (lighter ratio for genre-specific browsing)
    const withCollaborative = await mixCollaborativeRecommendations(
      userId,
      diversified,
      0.2 // 20% collaborative recommendations (lighter than main recs)
    );

    // Save session cache
    await saveSessionCache();

    // Return limited results
    const results = withCollaborative.slice(0, limit);

    console.log('[SmartRecs] Returning', results.length, 'genre recommendations for', genre);
    return results;
  } catch (error) {
    console.error('[SmartRecs] Error fetching genre recommendations:', error);
    return [];
  }
};




