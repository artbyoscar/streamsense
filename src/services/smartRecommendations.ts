import { supabase } from './supabase';
import { tmdbApi } from './tmdb';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Session cache for shown items (persists during app session)
let sessionShownItems: Set<number> = new Set();
let lastCacheClear: number = Date.now();

// Cache key for persistence
const CACHE_KEY = 'streamsense_shown_items';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Initialize cache from storage
const initializeCache = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const { items, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        sessionShownItems = new Set(items);
        console.log(`[SmartRecs] Restored ${sessionShownItems.size} items from cache`);
      } else {
        // Cache expired, clear it
        sessionShownItems = new Set();
        await AsyncStorage.removeItem(CACHE_KEY);
      }
    }
  } catch (error) {
    console.error('[SmartRecs] Cache init error:', error);
  }
};

// Save cache to storage
const saveCache = async () => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        items: Array.from(sessionShownItems),
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error('[SmartRecs] Cache save error:', error);
  }
};

// Genre ID mappings
const GENRE_NAME_TO_ID: Record<string, number[]> = {
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
  'Music': [10402],
  'Western': [37],
  // TV specific
  'Sci-Fi & Fantasy': [10765],
  'Action & Adventure': [10759],
  'War & Politics': [10768],
  'Kids': [10762],
  'Reality': [10764],
  'Soap': [10766],
  'Talk': [10767],
  'News': [10763],
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

  // Initialize cache on first call
  if (sessionShownItems.size === 0) {
    await initializeCache();
  }

  console.log('[SmartRecs] Getting smart recommendations:', {
    userId,
    limit,
    mediaType,
    sessionCacheSize: sessionShownItems.size,
    forceRefresh,
  });

  // Clear cache if forced or after 24 hours
  if (forceRefresh || Date.now() - lastCacheClear > CACHE_EXPIRY) {
    sessionShownItems.clear();
    lastCacheClear = Date.now();
    await AsyncStorage.removeItem(CACHE_KEY);
    console.log('[SmartRecs] Cache cleared');
  }

  try {
    // 1. Load user's watchlist to exclude
    const { data: watchlistItems } = await supabase
      .from('watchlist_items')
      .select('tmdb_id')
      .eq('user_id', userId);

    const watchlistIds = new Set(
      (watchlistItems || []).map((item) => item.tmdb_id)
    );

    // 2. Load user's genre affinity
    const { data: affinityData } = await supabase
      .from('user_genre_affinity')
      .select('genre_name, affinity_score')
      .eq('user_id', userId)
      .order('affinity_score', { ascending: false })
      .limit(15);

    console.log('[SmartRecs] Data loaded:', {
      watchlistItems: watchlistIds.size,
      affinityEntries: affinityData?.length || 0,
    });

    // Combined exclusion set
    const excludeIds = new Set([...watchlistIds, ...sessionShownItems]);

    console.log('[SmartRecs] Excluding:', {
      watchlistItems: watchlistIds.size,
      sessionShownItems: sessionShownItems.size,
      totalExcluded: excludeIds.size,
    });

    // 3. Determine top genres
    let topGenres: string[] = [];
    if (affinityData && affinityData.length > 0) {
      topGenres = affinityData.slice(0, 5).map((a) => a.genre_name);
    } else {
      // Default genres for new users
      topGenres = ['Drama', 'Action', 'Comedy', 'Adventure', 'Science Fiction'];
    }

    console.log('[SmartRecs] Top genres:', topGenres);

    // 4. Convert genre names to IDs
    const genreIds = topGenres.flatMap(
      (name) => GENRE_NAME_TO_ID[name] || []
    ).slice(0, 3);

    // 5. Fetch recommendations with variety
    const recommendations: any[] = [];

    // Random page selection for variety (1-10)
    const randomPage = Math.floor(Math.random() * 10) + 1;

    // Fetch movies
    if (mediaType === 'movie' || mediaType === 'mixed') {
      try {
        console.log('[SmartRecs] Fetching movie by genres:', {
          genres: genreIds,
          page: randomPage,
          excludeCount: excludeIds.size,
        });

        const movieResponse = await tmdbApi.discover('movie', {
          with_genres: genreIds.join(','),
          page: randomPage,
          sort_by: 'vote_count.desc',
          'vote_count.gte': 100,
          'vote_average.gte': 6.0,
        });

        const filteredMovies = (movieResponse.data?.results || [])
          .filter((item: any) => !excludeIds.has(item.id))
          .map((item: any) => ({ ...item, media_type: 'movie' }));

        recommendations.push(...filteredMovies);

        // Add to session cache
        filteredMovies.forEach((item: any) => sessionShownItems.add(item.id));

        console.log(
          `[SmartRecs] Returning ${filteredMovies.length} items, session cache now has ${sessionShownItems.size} items`
        );
      } catch (error) {
        console.error('[SmartRecs] Movie fetch error:', error);
      }
    }

    // Fetch TV shows
    if (mediaType === 'tv' || mediaType === 'mixed') {
      try {
        // Map movie genre IDs to TV genre IDs
        const tvGenreIds = genreIds.map((id) => {
          if (id === 878) return 10765; // Sci-Fi -> Sci-Fi & Fantasy
          if (id === 28) return 10759; // Action -> Action & Adventure
          return id;
        });

        const tvPage = Math.floor(Math.random() * 10) + 1;

        console.log('[SmartRecs] Fetching tv by genres:', {
          genres: tvGenreIds,
          page: tvPage,
          excludeCount: excludeIds.size,
        });

        const tvResponse = await tmdbApi.discover('tv', {
          with_genres: tvGenreIds.join(','),
          page: tvPage,
          sort_by: 'vote_count.desc',
          'vote_count.gte': 50,
          'vote_average.gte': 6.0,
        });

        const filteredTV = (tvResponse.data?.results || [])
          .filter((item: any) => !excludeIds.has(item.id))
          .map((item: any) => ({ ...item, media_type: 'tv' }));

        recommendations.push(...filteredTV);

        // Add to session cache
        filteredTV.forEach((item: any) => sessionShownItems.add(item.id));

        console.log(
          `[SmartRecs] Returning ${filteredTV.length} items, session cache now has ${sessionShownItems.size} items`
        );
      } catch (error) {
        console.error('[SmartRecs] TV fetch error:', error);
      }
    }

    // 6. Shuffle for variety
    const shuffled = recommendations.sort(() => Math.random() - 0.5);

    // 7. Save cache
    await saveCache();

    // 8. Return limited results
    const results = shuffled.slice(0, limit);
    console.log(`[SmartRecs] For You items: ${results.length}`);

    return results;
  } catch (error) {
    console.error('[SmartRecs] Error:', error);
    return [];
  }
};

// Clear session cache (call when user logs out or explicitly refreshes)
export const clearRecommendationCache = async () => {
  sessionShownItems.clear();
  lastCacheClear = Date.now();
  await AsyncStorage.removeItem(CACHE_KEY);
  console.log('[SmartRecs] Cache manually cleared');
};

// Get cache stats
export const getCacheStats = () => ({
  sessionItems: sessionShownItems.size,
  lastClear: lastCacheClear,
});
