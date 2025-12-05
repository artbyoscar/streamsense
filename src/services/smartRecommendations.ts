import { supabase } from './supabase';
import { getWatchlistIds } from './watchlistDataService';
import { tmdbApi } from './tmdb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserTopGenres } from './genreAffinity';
import { getAdaptiveRecommendationParams } from './userBehavior';
import { getNegativeSignals, filterByNegativeSignals, trackContentImpression } from './implicitSignals';
import { mixCollaborativeRecommendations } from './collaborativeFiltering';
import { getImpressionHistory, applyFatigueFilter, trackBatchImpressions } from './recommendationFatigue';
import { getUserProviderIds } from './watchProviders';
import { getSVDRecommendations, type Prediction } from './matrixFactorization';
import { convertGenreIdsToObjects } from '@/utils/genreUtils';
import { getTasteProfile } from './tasteProfile';

// ============================================================================
// CACHE KEYS & STATE
// ============================================================================

const SESSION_CACHE_KEY = 'streamsense_session_shown';
const WATCHLIST_CACHE_KEY = 'streamsense_watchlist_ids';
const SESSION_EXCLUSIONS_KEY = 'streamsense_session_exclusions'; // 🆕 NEW: Persist skipped items
const SHOWN_ITEMS_KEY = 'smartrecs_shown_items'; // 🆕 NEW: Track shown items across sessions

let sessionShownIds: Set<number> = new Set();
let watchlistTmdbIds: Set<number> = new Set();
let sessionExclusionIds: Set<number> = new Set(); // 🆕 NEW: Separate set for session exclusions (skips)
let recentlyShownIds: Set<number> = new Set(); // 🆕 NEW: Recently shown items (7-day window)
let cacheInitialized = false;

const SHOWN_ITEMS_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// ============================================================================
// GLOBAL EXCLUSION SYSTEM - FIXED VERSION
// ============================================================================

// This is the UNIFIED exclusion set - combines watchlist + session exclusions
let globalExcludeIds: Set<number> = new Set();

/**
 * 🔧 FIX: Rebuild global exclusions from both sources
 * Called after updating either watchlist or session exclusions
 */
const rebuildGlobalExclusions = () => {
  globalExcludeIds = new Set([
    ...watchlistTmdbIds,
    ...sessionExclusionIds,
  ]);
  console.log(`[SmartRecs] Global exclusions rebuilt: ${globalExcludeIds.size} total (watchlist: ${watchlistTmdbIds.size}, session: ${sessionExclusionIds.size})`);
};

/**
 * 🆕 NEW: Load session exclusions from AsyncStorage
 * Called on app start and cache initialization
 */
const loadSessionExclusions = async (): Promise<void> => {
  try {
    const data = await AsyncStorage.getItem(SESSION_EXCLUSIONS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Only restore if less than 7 days old
      if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
        sessionExclusionIds = new Set(parsed.ids);
        console.log('[SmartRecs] Restored session exclusions:', sessionExclusionIds.size, 'items');
      } else {
        console.log('[SmartRecs] Session exclusions expired, starting fresh');
        sessionExclusionIds = new Set();
      }
    }
  } catch (error) {
    console.error('[SmartRecs] Error loading session exclusions:', error);
    sessionExclusionIds = new Set();
  }
};

/**
 * 🆕 NEW: Save session exclusions to AsyncStorage
 * Called after adding/removing exclusions
 */
const saveSessionExclusions = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(SESSION_EXCLUSIONS_KEY, JSON.stringify({
      ids: Array.from(sessionExclusionIds),
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('[SmartRecs] Error saving session exclusions:', error);
  }
};

/**
 * 🆕 NEW: Load recently shown items from storage (7-day window)
 * Returns Set of item IDs that were shown in the last 7 days
 */
const loadRecentlyShownItems = async (): Promise<Set<number>> => {
  try {
    const stored = await AsyncStorage.getItem(SHOWN_ITEMS_KEY);
    if (!stored) return new Set();

    const data = JSON.parse(stored);
    const now = Date.now();

    // Filter out items older than 7 days
    const recent = Object.entries(data)
      .filter(([_, timestamp]) => now - (timestamp as number) < SHOWN_ITEMS_MAX_AGE)
      .map(([id, _]) => parseInt(id, 10));

    console.log('[SmartRecs] Loaded', recent.length, 'recently shown items (7-day window)');
    return new Set(recent);
  } catch (error) {
    console.error('[SmartRecs] Error loading shown items:', error);
    return new Set();
  }
};

/**
 * 🆕 NEW: Mark item as shown with current timestamp
 */
const markAsShown = async (itemId: number): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(SHOWN_ITEMS_KEY);
    const data = stored ? JSON.parse(stored) : {};
    data[itemId] = Date.now();
    await AsyncStorage.setItem(SHOWN_ITEMS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[SmartRecs] Error marking item as shown:', error);
  }
};

/**
 * 🆕 NEW: Mark multiple items as shown (batch operation)
 */
const markBatchAsShown = async (itemIds: number[]): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(SHOWN_ITEMS_KEY);
    const data = stored ? JSON.parse(stored) : {};
    const now = Date.now();

    itemIds.forEach(id => {
      data[id] = now;
    });

    await AsyncStorage.setItem(SHOWN_ITEMS_KEY, JSON.stringify(data));
    console.log('[SmartRecs] Marked', itemIds.length, 'items as shown');
  } catch (error) {
    console.error('[SmartRecs] Error marking batch as shown:', error);
  }
};

/**
 * Initialize global exclusions from watchlist AND restore session exclusions
 * Call this when user logs in or app starts
 */
export const initializeExclusions = async (userId: string) => {
  // Guard against undefined/null userId
  if (!userId || userId === 'undefined' || userId === 'null') {
    console.warn('[SmartRecs] ⚠️  initializeExclusions called with invalid userId:', userId);
    return;
  }

  try {
    // 1. Load persisted session exclusions first
    await loadSessionExclusions();

    // 2. Load watchlist IDs from database
    const ids = await getWatchlistIds(userId);
    watchlistTmdbIds = new Set();

    ids.forEach(id => {
      let num = Number(id);
      if (!isNaN(num)) {
        watchlistTmdbIds.add(num);
      } else {
        const match = id.match(/^(tv|movie)-(\d+)$/);
        if (match) {
          num = parseInt(match[2], 10);
          watchlistTmdbIds.add(num);
        }
      }
    });

    // 3. Rebuild combined exclusions
    rebuildGlobalExclusions();

    console.log(`[SmartRecs] Initialized exclusions: ${globalExcludeIds.size} total`);
    console.log(`[SmartRecs] Sample exclusions:`, Array.from(globalExcludeIds).slice(0, 10));
  } catch (error) {
    console.error('[SmartRecs] Error initializing exclusions:', error);
  }
};

/**
 * 🔧 FIX: Add a single item to exclusions AND persist
 * Call this when user skips or adds content
 */
export const addToExclusions = async (tmdbId: number | string): Promise<void> => {
  // Normalize to number
  const id = typeof tmdbId === 'string' ? parseInt(tmdbId, 10) : tmdbId;
  if (isNaN(id)) {
    console.warn('[SmartRecs] Invalid tmdbId:', tmdbId);
    return;
  }

  // Add to session exclusions (persisted)
  sessionExclusionIds.add(id);

  // Update global set
  globalExcludeIds.add(id);

  console.log(`[SmartRecs] Added to exclusions: ${id}. Total: ${globalExcludeIds.size} (session: ${sessionExclusionIds.size})`);

  // Persist in background (don't await to keep UI snappy)
  saveSessionExclusions().catch(err =>
    console.error('[SmartRecs] Error persisting exclusion:', err)
  );
};

/**
 * Remove an item from exclusions
 * Call this when user removes content from watchlist
 */
export const removeFromExclusions = async (tmdbId: number): Promise<void> => {
  watchlistTmdbIds.delete(tmdbId);
  sessionExclusionIds.delete(tmdbId);
  globalExcludeIds.delete(tmdbId);
  
  console.log(`[SmartRecs] Removed from exclusions: ${tmdbId}. Total: ${globalExcludeIds.size}`);
  
  // Persist in background
  saveSessionExclusions().catch(err => 
    console.error('[SmartRecs] Error persisting exclusion removal:', err)
  );
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
  watchlist: watchlistTmdbIds.size,
  session: sessionExclusionIds.size,
  sample: Array.from(globalExcludeIds).slice(0, 10),
});

// ============================================================================
// CACHE INITIALIZATION - FIXED VERSION
// ============================================================================

const initializeCaches = async (userId: string) => {
  // 🔧 FIX: Guard against invalid userId
  if (!userId || userId === 'undefined' || userId === 'null') {
    console.warn('[SmartRecs] ⚠️  initializeCaches called with invalid userId:', userId);
    return;
  }

  // 🆕 ALWAYS clear session cache on first init for fresh recommendations
  if (!cacheInitialized) {
    try {
      await AsyncStorage.removeItem(SESSION_CACHE_KEY);
      sessionShownIds = new Set();
      console.log('[SmartRecs] Cleared session cache for fresh recommendations');
    } catch (e) {
      console.log('[SmartRecs] Error clearing session cache:', e);
    }
  }

  if (cacheInitialized) return;

  try {
    // 🆕 Load session exclusions (skipped items)
    await loadSessionExclusions();

    // 🆕 Load recently shown items (7-day window)
    recentlyShownIds = await loadRecentlyShownItems();

    // 🆕 Seed recently shown from session exclusions (backfill for pre-tracking items)
    if (sessionExclusionIds.size > 0) {
      let addedCount = 0;
      const stored = await AsyncStorage.getItem(SHOWN_ITEMS_KEY);
      const data = stored ? JSON.parse(stored) : {};
      const now = Date.now();

      sessionExclusionIds.forEach(id => {
        if (!recentlyShownIds.has(id)) {
          data[id] = now;
          recentlyShownIds.add(id);
          addedCount++;
        }
      });

      if (addedCount > 0) {
        await AsyncStorage.setItem(SHOWN_ITEMS_KEY, JSON.stringify(data));
        console.log('[SmartRecs] Seeded', addedCount, 'items from session exclusions into 7-day tracking');
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
        const match = id.match(/^(tv|movie)-(\d+)$/);
        if (match) {
          num = parseInt(match[2], 10);
          watchlistTmdbIds.add(num);
        }
      }
    });

    console.log('[SmartRecs] Loaded watchlist IDs:', watchlistTmdbIds.size, 'items');

    // 🔧 FIX: Rebuild global exclusions (combines watchlist + session)
    rebuildGlobalExclusions();

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
const shouldExclude = (tmdbId: number | string, excludeSessionItems: boolean = true): boolean => {
  // Normalize to number
  const id = typeof tmdbId === 'string' ? parseInt(tmdbId, 10) : tmdbId;
  if (isNaN(id)) return false;

  // 🔧 FIX: Check unified global exclusions (includes watchlist + session exclusions)
  const isGloballyExcluded = globalExcludeIds.has(id);

  // 🆕 Check if shown in last 7 days (persistent across sessions)
  const recentlyShown = recentlyShownIds.has(id);

  // For infinite feeds (Discover), don't exclude based on "shown" - use pagination instead
  const alreadyShown = excludeSessionItems ? sessionShownIds.has(id) : false;

  const excluded = isGloballyExcluded || recentlyShown || alreadyShown;

  if (excluded) {
    console.log(`[SmartRecs] Excluding ${id}:`, {
      inGlobalExclusions: isGloballyExcluded,
      inWatchlist: watchlistTmdbIds.has(id),
      inSessionExclusions: sessionExclusionIds.has(id),
      recentlyShown,
      alreadyShown,
    });
  }

  return excluded;
};

// ============================================================================
// GENRE MAPPINGS
// ============================================================================

const MOVIE_GENRE_IDS: Record<string, number[]> = {
  'Drama': [18],
  'Adventure': [12],
  'Action': [28],
  'Science Fiction': [878],
  'Animation': [16],
  'Anime': [16],
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
  'Adventure': [10759],
  'Action': [10759],
  'Science Fiction': [10765],
  'Animation': [16],
  'Anime': [16],
  'Comedy': [35],
  'Thriller': [53],
  'Horror': [27],
  'Romance': [10749],
  'Documentary': [99],
  'Crime': [80],
  'Mystery': [9648],
  'Fantasy': [10765],
  'Family': [10751],
  'War': [10768],
  'History': [36],
  'Sci-Fi & Fantasy': [10765],
  'Action & Adventure': [10759],
  'War & Politics': [10768],
};

// ============================================================================
// RECOMMENDATION OPTIONS
// ============================================================================

interface RecommendationOptions {
  userId: string;
  limit?: number;
  mediaType?: 'movie' | 'tv' | 'mixed';
  forceRefresh?: boolean;
  excludeSessionItems?: boolean;
  genres?: number[];
}

// ============================================================================
// DIVERSIFICATION
// ============================================================================

const diversifyRecommendations = (
  items: any[],
  options: {
    maxConsecutiveSameGenre?: number;
    maxPercentagePerGenre?: number;
  } = {}
): any[] => {
  const {
    maxConsecutiveSameGenre = 2,
    maxPercentagePerGenre = 0.3,
  } = options;

  if (items.length === 0) return items;

  const result: any[] = [];
  const remaining: any[] = [...items];
  const genreCounts: Record<number, number> = {};
  const maxPerGenre = Math.floor(items.length * maxPercentagePerGenre);

  console.log('[SmartRecs] Diversifying', items.length, 'items. Max per genre:', maxPerGenre);

  const recentGenres: number[] = [];

  while (remaining.length > 0 && result.length < items.length) {
    let selected = false;

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const primaryGenre = item.genre_ids?.[0] || item.genres?.[0] || 0;

      const genreCount = genreCounts[primaryGenre] || 0;
      if (genreCount >= maxPerGenre) {
        continue;
      }

      const consecutiveCount = recentGenres.slice(-maxConsecutiveSameGenre).filter(g => g === primaryGenre).length;
      if (consecutiveCount >= maxConsecutiveSameGenre) {
        continue;
      }

      result.push(item);
      remaining.splice(i, 1);

      genreCounts[primaryGenre] = genreCount + 1;
      recentGenres.push(primaryGenre);
      if (recentGenres.length > maxConsecutiveSameGenre * 2) {
        recentGenres.shift();
      }

      selected = true;
      break;
    }

    if (!selected && remaining.length > 0) {
      const item = remaining[0];
      const primaryGenre = item.genre_ids?.[0] || item.genres?.[0] || 0;

      const genreCount = genreCounts[primaryGenre] || 0;
      if (genreCount < maxPerGenre || result.length + remaining.length <= items.length) {
        result.push(item);
        remaining.splice(0, 1);
        genreCounts[primaryGenre] = genreCount + 1;
        recentGenres.push(primaryGenre);
      } else {
        remaining.splice(0, 1);
      }
    }
  }

  const distribution = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  console.log('[SmartRecs] Genre distribution (top 5):', distribution);

  return result;
};

// ============================================================================
// MAIN RECOMMENDATION ENGINE - FIXED VERSION
// ============================================================================

export const getSmartRecommendations = async (
  options: RecommendationOptions
): Promise<any[]> => {
  const { userId, limit = 20, mediaType = 'mixed', forceRefresh = false, excludeSessionItems = true } = options;

  // 🔧 FIX: Guard against invalid userId
  if (!userId || userId === 'undefined' || userId === 'null') {
    console.error('[SmartRecs] ⚠️  getSmartRecommendations called with invalid userId:', userId);
    return [];
  }

  // Force refresh if requested
  if (forceRefresh) {
    cacheInitialized = false;
    sessionShownIds.clear();
    sessionExclusionIds.clear(); // Also clear session exclusions on force refresh
    await AsyncStorage.removeItem(SESSION_CACHE_KEY);
    await AsyncStorage.removeItem(SESSION_EXCLUSIONS_KEY);
    rebuildGlobalExclusions(); // Rebuild to reflect cleared session exclusions
    console.log('[SmartRecs] Force refresh - cleared session cache and session exclusions');
  }

  // Initialize caches
  await initializeCaches(userId);

  // 🔧 FIX: Update watchlist IDs WITHOUT clearing session exclusions
  const ids = await getWatchlistIds(userId);
  watchlistTmdbIds = new Set(); // Only clear watchlist set
  // ❌ REMOVED: globalExcludeIds = new Set(); // DON'T clear this!

  ids.forEach(id => {
    let num = Number(id);
    if (!isNaN(num)) {
      watchlistTmdbIds.add(num);
    } else {
      const match = id.match(/^(tv|movie)-(\d+)$/);
      if (match) {
        num = parseInt(match[2], 10);
        watchlistTmdbIds.add(num);
      }
    }
  });

  // 🔧 FIX: Rebuild global exclusions (preserves session exclusions)
  rebuildGlobalExclusions();

  console.log(`[SmartRecs] Exclusions: ${globalExcludeIds.size} total (watchlist: ${watchlistTmdbIds.size}, session: ${sessionExclusionIds.size})`);

  // SMART CACHE MANAGEMENT: Prevent session cache from growing too large
  if (sessionShownIds.size > 500) {
    console.warn('[SmartRecs] Session cache too large (', sessionShownIds.size, '), pruning to 200');
    const idsArray = Array.from(sessionShownIds);
    const recentIds = idsArray.slice(-200);
    sessionShownIds = new Set(recentIds);
    await saveSessionCache();
  }

  // 🆕 Also prune session exclusions if too large (keep last 1000)
  if (sessionExclusionIds.size > 1000) {
    console.warn('[SmartRecs] Session exclusions too large (', sessionExclusionIds.size, '), pruning to 500');
    const idsArray = Array.from(sessionExclusionIds);
    const recentIds = idsArray.slice(-500);
    sessionExclusionIds = new Set(recentIds);
    rebuildGlobalExclusions();
    await saveSessionExclusions();
  }

  console.log('[SmartRecs] Getting recommendations:', {
    userId: userId.substring(0, 8) + '...',
    limit,
    mediaType,
    exclusions: globalExcludeIds.size,
    forceRefresh,
  });

  try {
    // Detect user behavior pattern
    const { pattern, strategy } = await getAdaptiveRecommendationParams(userId);

    // Get streaming providers
    const userProviderIds = await getUserProviderIds(userId);
    const providerQuery = userProviderIds.length > 0 ? userProviderIds.join('|') : null;

    console.log('[SmartRecs] User behavior:', {
      mode: pattern.mode,
      avgItemsPerSession: pattern.averageItemsPerSession,
      strategy: strategy.description,
    });

    // Get negative signals
    const negativeSignals = await getNegativeSignals(userId);

    // Get genre affinity
    const topGenresData = await getUserTopGenres(userId, 5, true);

    const ALWAYS_INCLUDE_GENRES = [
      'Animation', 'Romance', 'Horror', 'Documentary',
      'Thriller', 'Crime', 'Mystery', 'Fantasy',
    ];

    let topGenres: string[] = [];
    if (topGenresData && topGenresData.length > 0) {
      const genreCount = pattern.mode === 'discovery' ? 5 : pattern.mode === 'intentional' ? 3 : 4;
      topGenres = topGenresData.slice(0, genreCount).map(g => g.genreName);

      if (pattern.mode === 'discovery' && Math.random() < strategy.newGenreRatio) {
        const allGenres = ['Drama', 'Action', 'Comedy', 'Adventure', 'Science Fiction', 'Thriller', 'Horror', 'Romance'];
        const newGenres = allGenres.filter(g => !topGenres.includes(g));
        if (newGenres.length > 0) {
          const randomNewGenre = newGenres[Math.floor(Math.random() * newGenres.length)];
          topGenres.push(randomNewGenre);
        }
      }
    } else {
      topGenres = ['Drama', 'Action', 'Comedy', 'Adventure', 'Science Fiction'];
    }

    const combinedGenres = [...new Set([...topGenres, ...ALWAYS_INCLUDE_GENRES])];

    const recommendations: any[] = [];

    const getRandomPage = () => {
      if (!excludeSessionItems) {
        return Math.floor(Math.random() * 50) + 1;
      }
      if (sessionShownIds.size > 300) {
        return Math.floor(Math.random() * 20) + 1;
      }
      if (mediaType === 'movie' || mediaType === 'tv') {
        return Math.floor(Math.random() * 3) + 1;
      }
      return Math.floor(Math.random() * 5) + 1;
    };

    const filterItems = (items: any[]) => {
      return items.filter((item: any) => !shouldExclude(item.id, excludeSessionItems));
    };

    // Fetch movies
    if (mediaType === 'movie' || mediaType === 'mixed') {
      let page = getRandomPage();
      const movieGenreIds = options.genres && options.genres.length > 0
        ? options.genres
        : combinedGenres.flatMap(name => MOVIE_GENRE_IDS[name] || []).slice(0, 5);

      const movieGenreQuery = movieGenreIds.join('|');
      const minVoteCount = pattern.mode === 'passive' ? 500 : 100;
      const minRating = pattern.mode === 'passive' ? 7.0 : pattern.mode === 'intentional' ? 6.5 : 6.0;

      let movies: any[] = [];
      let attempts = 0;
      const maxAttempts = 10;
      const targetMovieCount = mediaType === 'movie' ? 50 : 40;

      while (movies.length < targetMovieCount && attempts < maxAttempts) {
        const movieResponse = await tmdbApi.get('/discover/movie', {
          params: {
            with_genres: movieGenreQuery,
            ...(providerQuery && { with_watch_providers: providerQuery, watch_region: 'US' }),
            page: page + attempts,
            sort_by: 'popularity.desc',
            'vote_count.gte': minVoteCount,
            'vote_average.gte': minRating,
          },
        });

        const fetchedMovies = (movieResponse.data?.results || [])
          .map((item: any) => normalizeContentItem(item, 'movie'));

        const filteredMovies = filterItems(fetchedMovies);
        movies = [...movies, ...filteredMovies];
        attempts++;

        if (movies.length >= targetMovieCount) break;
      }

      if (mediaType === 'mixed') {
        movies.forEach((m: any) => addToSessionCache(m.id));
      }
      recommendations.push(...movies);
    }

    // Fetch TV shows
    if (mediaType === 'tv' || mediaType === 'mixed') {
      const tvGenreIds = options.genres && options.genres.length > 0
        ? options.genres
        : combinedGenres.flatMap(name => TV_GENRE_IDS[name] || []).slice(0, 4);

      let page = getRandomPage();
      const genreQuery = tvGenreIds.join('|');
      const minVoteCount = pattern.mode === 'passive' ? 200 : 50;
      const minRating = pattern.mode === 'passive' ? 7.0 : pattern.mode === 'intentional' ? 6.5 : 6.0;

      let tvShows: any[] = [];
      let attempts = 0;
      const maxAttempts = 10;
      const targetTVCount = mediaType === 'tv' ? 50 : 40;

      while (tvShows.length < targetTVCount && attempts < maxAttempts) {
        const tvResponse = await tmdbApi.get('/discover/tv', {
          params: {
            with_genres: genreQuery,
            ...(providerQuery && { with_watch_providers: providerQuery, watch_region: 'US' }),
            page: page + attempts,
            sort_by: 'popularity.desc',
            'vote_count.gte': minVoteCount,
            'vote_average.gte': minRating,
          },
        });

        const fetchedTV = (tvResponse.data?.results || [])
          .map((item: any) => normalizeContentItem(item, 'tv'));

        const filteredTV = filterItems(fetchedTV);
        tvShows = [...tvShows, ...filteredTV];
        attempts++;

        if (tvShows.length >= targetTVCount) break;
      }

      if (mediaType === 'mixed') {
        tvShows.forEach((t: any) => addToSessionCache(t.id));
      }
      recommendations.push(...tvShows);
    }

    // Apply processing pipeline
    const shuffled = recommendations.sort(() => Math.random() - 0.5);
    const negativeFiltered = filterByNegativeSignals(shuffled, negativeSignals);
    const diversified = diversifyRecommendations(negativeFiltered);

    // Build user taste profile (for future DNA-based ranking)
    // Note: DNA ranking is computed via taste profile, not direct DNA comparison
    let dnaRanked = diversified;
    try {
      const userTasteProfile = await getTasteProfile(userId);
      if (userTasteProfile) {
        const topTone = Object.entries(userTasteProfile.preferredTone || {})
          .sort((a, b) => (b[1] as number) - (a[1] as number))[0];

        console.log('[SmartRecs] User taste profile:', {
          signature: userTasteProfile.tasteSignature,
          topTone: topTone ? `${topTone[0]}: ${topTone[1]}` : 'none',
          confidence: userTasteProfile.confidence,
        });
        // TODO: Implement DNA-based re-ranking using taste profile
        // For now, diversified order is used
      }
    } catch (dnaError) {
      console.warn('[SmartRecs] Taste profile build failed:', dnaError);
    }

    let withCollaborative = await mixCollaborativeRecommendations(userId, dnaRanked, 0.2);

    // SVD recommendations
    try {
      const svdPredictions = await getSVDRecommendations(userId, 20);
      if (svdPredictions.length > 0) {
        const svdContent = await Promise.all(
          svdPredictions.slice(0, Math.ceil(limit * 0.3)).map(async (prediction) => {
            try {
              const existing = withCollaborative.find(r => r.id === prediction.tmdbId);
              if (existing) {
                return { ...existing, svd_boosted: true, predicted_rating: prediction.predictedRating };
              }
              const detailsResponse = await tmdbApi.get(`/movie/${prediction.tmdbId}`);
              return {
                ...normalizeContentItem(detailsResponse.data, 'movie'),
                svd_rating: prediction.predictedRating,
                svd_confidence: prediction.confidence,
              };
            } catch {
              return null;
            }
          })
        );

        const validSVDContent = svdContent.filter(item => item !== null);
        const svdCount = Math.ceil(limit * 0.3);
        const existingCount = limit - svdCount;

        withCollaborative = [
          ...validSVDContent.slice(0, svdCount),
          ...withCollaborative.slice(0, existingCount),
        ];
      }
    } catch (svdError) {
      console.warn('[SmartRecs] SVD recommendations failed:', svdError);
    }

    // Apply fatigue filter
    const impressionHistory = await getImpressionHistory(userId);
    const fatigueFiltered = applyFatigueFilter(withCollaborative, impressionHistory);

    await saveSessionCache();

    let results = fatigueFiltered.slice(0, limit);

    // Fallback for empty results
    if (!excludeSessionItems && results.length === 0) {
      console.log('[SmartRecs] Loading trending fallback');
      try {
        const trendingResponse = await tmdbApi.get('/trending/all/week', {
          params: { page: Math.floor(Math.random() * 5) + 1 },
        });
        const trending = (trendingResponse.data?.results || [])
          .map((item: any) => normalizeContentItem(item, item.media_type === 'tv' ? 'tv' : 'movie'))
          .filter((item: any) => !shouldExclude(item.id, false));
        results = trending.slice(0, limit);
      } catch (fallbackError) {
        console.error('[SmartRecs] Trending fallback error:', fallbackError);
      }
    }

    // Track impressions
    if (results.length > 0) {
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

      trackBatchImpressions(userId, results.map(r => r.id)).catch(err =>
        console.error('[SmartRecs] Error tracking fatigue impressions:', err)
      );

      // 🆕 Mark items as shown (7-day persistence)
      markBatchAsShown(results.map(r => r.id)).catch(err =>
        console.error('[SmartRecs] Error marking items as shown:', err)
      );
    }

    console.log('[SmartRecs] Returning', results.length, 'recommendations');
    return results;
  } catch (error) {
    console.error('[SmartRecs] Error:', error);
    return [];
  }
};

// ============================================================================
// CACHE MANAGEMENT - FIXED VERSION
// ============================================================================

/**
 * 🔧 FIX: Refresh watchlist cache without clearing session exclusions
 */
export const refreshWatchlistCache = async (userId: string): Promise<void> => {
  // 🔧 FIX: Guard against invalid userId
  if (!userId || userId === 'undefined' || userId === 'null') {
    console.warn('[SmartRecs] ⚠️  refreshWatchlistCache called with invalid userId:', userId);
    return;
  }

  const ids = await getWatchlistIds(userId);
  watchlistTmdbIds = new Set(); // Only clear watchlist
  // ❌ REMOVED: globalExcludeIds = new Set(); // DON'T clear session exclusions!

  ids.forEach(id => {
    let num = Number(id);
    if (!isNaN(num)) {
      watchlistTmdbIds.add(num);
    } else {
      const match = id.match(/^(tv|movie)-(\d+)$/);
      if (match) {
        num = parseInt(match[2], 10);
        watchlistTmdbIds.add(num);
      }
    }
  });

  // 🔧 FIX: Rebuild global exclusions (combines watchlist + session)
  rebuildGlobalExclusions();

  console.log('[SmartRecs] Refreshed watchlist cache:', watchlistTmdbIds.size, 'items (total exclusions:', globalExcludeIds.size, ')');
};

/**
 * Clear all caches (full reset)
 */
export const clearRecommendationCaches = async (): Promise<void> => {
  sessionShownIds.clear();
  watchlistTmdbIds.clear();
  sessionExclusionIds.clear(); // 🆕 Also clear session exclusions
  globalExcludeIds.clear();
  cacheInitialized = false;
  await AsyncStorage.multiRemove([SESSION_CACHE_KEY, WATCHLIST_CACHE_KEY, SESSION_EXCLUSIONS_KEY]);
  console.log('[SmartRecs] All caches cleared');
};

/**
 * 🆕 NEW: Clear only session exclusions (user wants fresh start but keep watchlist)
 */
export const clearSessionExclusions = async (): Promise<void> => {
  sessionExclusionIds.clear();
  rebuildGlobalExclusions();
  await AsyncStorage.removeItem(SESSION_EXCLUSIONS_KEY);
  console.log('[SmartRecs] Session exclusions cleared, watchlist preserved');
};

/**
 * Debug function
 */
export const getExclusionStats = () => ({
  globalSize: globalExcludeIds.size,
  watchlistSize: watchlistTmdbIds.size,
  sessionExclusionsSize: sessionExclusionIds.size,
  sessionShownSize: sessionShownIds.size,
  watchlistSample: Array.from(watchlistTmdbIds).slice(0, 10),
  sessionExclusionsSample: Array.from(sessionExclusionIds).slice(0, 10),
});

/**
 * Get global exclusion IDs (watchlist + session exclusions)
 * Used by blindspot recommendations to avoid showing already-seen content
 */
export const getGlobalExclusionIds = (): Set<number> => {
  return new Set(globalExcludeIds);
};

// ============================================================================
// CONTENT NORMALIZATION
// ============================================================================

const normalizeContentItem = (item: any, mediaType: 'movie' | 'tv') => {
  const genreIds = item.genre_ids || [];
  const genreObjects = convertGenreIdsToObjects(genreIds);

  return {
    id: item.id,
    type: mediaType,
    media_type: mediaType,
    title: item.title || item.name || 'Unknown Title',
    name: item.name || item.title,
    originalTitle: item.original_title || item.original_name || item.title || item.name,
    poster_path: item.poster_path || null,
    posterPath: item.poster_path || null,
    backdropPath: item.backdrop_path || null,
    release_date: item.release_date || item.first_air_date,
    first_air_date: item.first_air_date || item.release_date,
    releaseDate: item.release_date || item.first_air_date,
    vote_average: item.vote_average || 0,
    vote_count: item.vote_count || 0,
    voteCount: item.vote_count || 0,
    rating: item.vote_average || 0,
    overview: item.overview || '',
    genre_ids: genreIds,
    genres: genreObjects,
    original_language: item.original_language,
    language: item.original_language,
    popularity: item.popularity,
  };
};

// ============================================================================
// GENRE-SPECIFIC RECOMMENDATIONS
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
  // 🔧 FIX: Guard against invalid userId
  if (!userId || userId === 'undefined' || userId === 'null') {
    console.error('[SmartRecs] ⚠️  getGenreRecommendations called with invalid userId:', userId);
    return [];
  }

  console.log('[SmartRecs] Getting genre recommendations:', { genre, mediaType, limit });

  await initializeCaches(userId);

  // Refresh watchlist (preserves session exclusions)
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
    rebuildGlobalExclusions();
  }

  const recommendations: any[] = [];
  const getRandomPage = () => Math.floor(Math.random() * 10) + 1;

  try {
    if (mediaType === 'movie' || mediaType === 'mixed') {
      const movieGenreIds = MOVIE_GENRE_IDS[genre];
      if (movieGenreIds && movieGenreIds.length > 0) {
        const page = getRandomPage();
        const movieResponse = await tmdbApi.get('/discover/movie', {
          params: {
            with_genres: movieGenreIds.join('|'),
            page,
            sort_by: 'popularity.desc',
            'vote_count.gte': 100,
            'vote_average.gte': 6.0,
            ...(genre === 'Anime' && { with_original_language: 'ja' }),
            ...(genre === 'Animation' && { without_original_language: 'ja' }),
          },
        });

        const movies = (movieResponse.data?.results || [])
          .filter((item: any) => !shouldExclude(item.id))
          .map((item: any) => normalizeContentItem(item, 'movie'));

        movies.forEach((m: any) => addToSessionCache(m.id));
        recommendations.push(...movies);
      }
    }

    if (mediaType === 'tv' || mediaType === 'mixed') {
      const tvGenreIds = TV_GENRE_IDS[genre];
      if (tvGenreIds && tvGenreIds.length > 0) {
        const page = getRandomPage();
        const tvResponse = await tmdbApi.get('/discover/tv', {
          params: {
            with_genres: tvGenreIds.join('|'),
            page,
            sort_by: 'popularity.desc',
            'vote_count.gte': 50,
            'vote_average.gte': 6.0,
            ...(genre === 'Anime' && { with_original_language: 'ja' }),
            ...(genre === 'Animation' && { without_original_language: 'ja' }),
          },
        });

        const tvShows = (tvResponse.data?.results || [])
          .filter((item: any) => !shouldExclude(item.id))
          .map((item: any) => normalizeContentItem(item, 'tv'));

        tvShows.forEach((t: any) => addToSessionCache(t.id));
        recommendations.push(...tvShows);
      }
    }

    const shuffled = recommendations.sort(() => Math.random() - 0.5);
    const diversified = diversifyRecommendations(shuffled, {
      maxConsecutiveSameGenre: 3,
      maxPercentagePerGenre: 0.5,
    });

    const withCollaborative = await mixCollaborativeRecommendations(userId, diversified, 0.2);

    await saveSessionCache();

    const results = withCollaborative.slice(0, limit);
    console.log('[SmartRecs] Returning', results.length, 'genre recommendations for', genre);
    return results;
  } catch (error) {
    console.error('[SmartRecs] Error fetching genre recommendations:', error);
    return [];
  }
};

// ============================================================================
// GENRE-SPECIFIC CONTENT FETCHING (FOR EMPTY CATEGORIES)
// ============================================================================

/**
 * Fetch content specifically for a genre that has low/no results
 * This bypasses the normal recommendation flow and fetches directly from TMDb
 */
export const fetchGenreSpecificContent = async ({
  userId,
  genre,
  mediaType = 'mixed',
  limit = 20,
  page = 1,
}: {
  userId: string;
  genre: string;
  mediaType?: 'movie' | 'tv' | 'mixed';
  limit?: number;
  page?: number;
}): Promise<any[]> => {
  if (!userId || userId === 'undefined' || userId === 'null') {
    console.warn('[SmartRecs] fetchGenreSpecificContent called with invalid userId');
    return [];
  }

  console.log(`[SmartRecs] Fetching specific content for genre: ${genre}, page: ${page}`);

  const results: any[] = [];

  try {
    // Get user's streaming providers
    const userProviderIds = await getUserProviderIds(userId);
    const providerQuery = userProviderIds.length > 0 ? userProviderIds.join('|') : null;

    // Ensure exclusions are loaded
    await initializeCaches(userId);

    if (mediaType === 'movie' || mediaType === 'mixed') {
      const movieGenreIds = MOVIE_GENRE_IDS[genre];
      if (movieGenreIds && movieGenreIds.length > 0) {
        const response = await tmdbApi.get('/discover/movie', {
          params: {
            with_genres: movieGenreIds.join('|'),
            ...(providerQuery && { with_watch_providers: providerQuery, watch_region: 'US' }),
            page,
            sort_by: 'popularity.desc',
            'vote_count.gte': 50,
            'vote_average.gte': 5.5,
            ...(genre === 'Anime' && { with_original_language: 'ja' }),
          },
        });

        const movies = (response.data?.results || [])
          .filter((item: any) => !shouldExclude(item.id, false))
          .map((item: any) => normalizeContentItem(item, 'movie'));

        results.push(...movies);
      }
    }

    if (mediaType === 'tv' || mediaType === 'mixed') {
      const tvGenreIds = TV_GENRE_IDS[genre];
      if (tvGenreIds && tvGenreIds.length > 0) {
        const response = await tmdbApi.get('/discover/tv', {
          params: {
            with_genres: tvGenreIds.join('|'),
            ...(providerQuery && { with_watch_providers: providerQuery, watch_region: 'US' }),
            page,
            sort_by: 'popularity.desc',
            'vote_count.gte': 20,
            'vote_average.gte': 5.5,
            ...(genre === 'Anime' && { with_original_language: 'ja' }),
          },
        });

        const tvShows = (response.data?.results || [])
          .filter((item: any) => !shouldExclude(item.id, false))
          .map((item: any) => normalizeContentItem(item, 'tv'));

        results.push(...tvShows);
      }
    }

    // Shuffle and limit
    const shuffled = results.sort(() => Math.random() - 0.5);
    console.log(`[SmartRecs] Fetched ${shuffled.length} items for genre ${genre}`);
    return shuffled.slice(0, limit);
  } catch (error) {
    console.error(`[SmartRecs] Error fetching genre ${genre}:`, error);
    return [];
  }
};

/**
 * Load more recommendations (for pagination)
 */
export const loadMoreRecommendations = async ({
  userId,
  currentCount,
  mediaType = 'mixed',
  limit = 20,
}: {
  userId: string;
  currentCount: number;
  mediaType?: 'movie' | 'tv' | 'mixed';
  limit?: number;
}): Promise<any[]> => {
  if (!userId || userId === 'undefined' || userId === 'null') {
    return [];
  }

  console.log(`[SmartRecs] Loading more recommendations (current: ${currentCount}, limit: ${limit})`);

  // Calculate which page to fetch based on current count
  const page = Math.floor(currentCount / 20) + 2; // +2 because page 1 was already fetched

  try {
    const userProviderIds = await getUserProviderIds(userId);
    const providerQuery = userProviderIds.length > 0 ? userProviderIds.join('|') : null;

    await initializeCaches(userId);

    const results: any[] = [];

    if (mediaType === 'movie' || mediaType === 'mixed') {
      const response = await tmdbApi.get('/discover/movie', {
        params: {
          ...(providerQuery && { with_watch_providers: providerQuery, watch_region: 'US' }),
          page,
          sort_by: 'popularity.desc',
          'vote_count.gte': 50,
          'vote_average.gte': 6.0,
        },
      });

      const movies = (response.data?.results || [])
        .filter((item: any) => !shouldExclude(item.id, false))
        .map((item: any) => normalizeContentItem(item, 'movie'));

      results.push(...movies);
    }

    if (mediaType === 'tv' || mediaType === 'mixed') {
      const response = await tmdbApi.get('/discover/tv', {
        params: {
          ...(providerQuery && { with_watch_providers: providerQuery, watch_region: 'US' }),
          page,
          sort_by: 'popularity.desc',
          'vote_count.gte': 30,
          'vote_average.gte': 6.0,
        },
      });

      const tvShows = (response.data?.results || [])
        .filter((item: any) => !shouldExclude(item.id, false))
        .map((item: any) => normalizeContentItem(item, 'tv'));

      results.push(...tvShows);
    }

    const shuffled = results.sort(() => Math.random() - 0.5);
    console.log(`[SmartRecs] Loaded ${shuffled.length} more recommendations`);
    return shuffled.slice(0, limit);
  } catch (error) {
    console.error('[SmartRecs] Error loading more:', error);
    return [];
  }
};