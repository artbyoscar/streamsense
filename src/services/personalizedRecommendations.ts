/**
 * Enhanced Personalized Recommendations Service
 * Smart algorithm that considers ratings, recency, media type preference, and more
 * UPDATED: Now includes session-level tracking and random page selection for variety
 */

import { tmdbApi } from './tmdb';
import { supabase } from '@/config/supabase';
import { MOVIE_GENRES, TV_GENRES } from '@/constants/genres';
import type { UnifiedContent } from '@/types';

// ============================================================================
// SESSION-LEVEL TRACKING
// ============================================================================

/**
 * Tracks content shown in current session to prevent repeats
 * Cleared only when app restarts or clearRecommendationCache() is called
 */
const sessionShownContent = new Set<string>();

/**
 * Clear the session cache of shown content
 * Use this to reset recommendations and allow previously shown content to appear again
 */
export const clearRecommendationCache = () => {
  console.log('[SmartRecs] Clearing session cache, had', sessionShownContent.size, 'items');
  sessionShownContent.clear();
};

// ============================================================================
// TYPES
// ============================================================================

interface UserPreferences {
  topGenres: { id: number; name: string; score: number; weight: number }[];
  preferredMediaType: 'movie' | 'tv' | 'balanced';
  averageRating: number;
  totalInteractions: number;
  recentGenres: number[]; // Genres from last 30 days
  watchlistContentIds: Set<string>; // To exclude already-added content
}

interface SmartRecommendations {
  forYou: UnifiedContent[];
  becauseYouLiked: { genre: string; items: UnifiedContent[] }[];
  discovery: UnifiedContent[];
  trending: UnifiedContent[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Weight factors for different interactions
const INTERACTION_WEIGHTS = {
  RATE_5_STARS: 5,
  RATE_4_STARS: 3,
  RATE_3_STARS: 1,
  RATE_2_STARS: -1,
  RATE_1_STAR: -3,
  COMPLETE_WATCHING: 3,
  START_WATCHING: 2,
  ADD_TO_WATCHLIST: 1,
  REMOVE_FROM_WATCHLIST: -2,
};

// TV to Movie genre ID mapping (TMDb uses different IDs for similar genres)
const TV_TO_MOVIE_MAP: Record<number, number> = {
  10759: 28, // Action & Adventure → Action
  10765: 878, // Sci-Fi & Fantasy → Science Fiction
  10768: 10752, // War & Politics → War
};

// ============================================================================
// USER PREFERENCES ANALYSIS
// ============================================================================

/**
 * Get comprehensive user preferences from all data sources
 * Analyzes genre affinity, ratings, recency, and media type preferences
 */
export const getUserPreferences = async (userId: string): Promise<UserPreferences> => {
  console.log('[SmartRecs] Analyzing preferences for user:', userId);

  // 1. Get genre affinity scores from genre_affinity table
  const { data: affinityData } = await supabase
    .from('user_genre_affinity')
    .select('genre_id, genre_name, affinity_score, interaction_count, last_interaction_at')
    .eq('user_id', userId)
    .order('affinity_score', { ascending: false });

  // 2. Get watchlist items with ratings and metadata
  const { data: watchlistData } = await supabase
    .from('watchlist_items')
    .select(`
      id,
      content_id,
      status,
      rating,
      created_at,
      content (
        tmdb_id,
        type,
        genres
      )
    `)
    .eq('user_id', userId);

  console.log('[SmartRecs] Data loaded:', {
    affinityEntries: affinityData?.length || 0,
    watchlistItems: watchlistData?.length || 0,
  });

  // 3. Calculate weighted genre scores (factor in recency and rating)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const genreScores = new Map<number, { score: number; weight: number; name: string }>();

  // Process affinity data
  affinityData?.forEach((item) => {
    const recencyBoost = new Date(item.last_interaction_at) > thirtyDaysAgo ? 1.5 : 1;
    genreScores.set(item.genre_id, {
      score: item.affinity_score * recencyBoost,
      weight: item.interaction_count,
      name: item.genre_name,
    });
  });

  // Boost genres from high-rated watchlist items
  watchlistData?.forEach((item: any) => {
    const content = item.content;
    if (!content) return;

    if (item.rating && item.rating >= 4) {
      const ratingBoost = item.rating === 5 ? 2 : 1.5;
      const genres = content.genres || [];

      genres.forEach((genreId: number) => {
        const existing = genreScores.get(genreId) || { score: 0, weight: 0, name: '' };
        const genreName = MOVIE_GENRES[genreId] || TV_GENRES[genreId] || 'Unknown';
        genreScores.set(genreId, {
          score: existing.score + ratingBoost,
          weight: existing.weight + 1,
          name: genreName,
        });
      });
    }
  });

  // 4. Determine media type preference
  let movieCount = 0;
  let tvCount = 0;

  watchlistData?.forEach((item: any) => {
    if (item.content?.type === 'movie') movieCount++;
    else if (item.content?.type === 'tv') tvCount++;
  });

  const total = movieCount + tvCount;
  let preferredMediaType: 'movie' | 'tv' | 'balanced' = 'balanced';

  if (total > 5) {
    const movieRatio = movieCount / total;
    if (movieRatio > 0.7) preferredMediaType = 'movie';
    else if (movieRatio < 0.3) preferredMediaType = 'tv';
  }

  console.log('[SmartRecs] Media type preference:', {
    movies: movieCount,
    tv: tvCount,
    preference: preferredMediaType,
  });

  // 5. Get recent genres (last 30 days)
  const recentGenres = new Set<number>();
  watchlistData?.forEach((item: any) => {
    if (new Date(item.created_at) > thirtyDaysAgo && item.content?.genres) {
      item.content.genres.forEach((g: number) => recentGenres.add(g));
    }
  });

  // 6. Get existing watchlist content IDs to exclude from recommendations
  // IMPROVEMENT: ONLY exclude items EXPLICITLY in watchlist, NOT session-shown items
  // This reduces exclusion aggressiveness and provides more variety
  const watchlistContentIds = new Set<string>();
  watchlistData?.forEach((item: any) => {
    if (item.content) {
      watchlistContentIds.add(`${item.content.type}-${item.content.tmdb_id}`);
    }
  });

  // For discovery mode, we still track session items separately but don't exclude them aggressively
  console.log('[SmartRecs] Exclusions:', {
    watchlistItems: watchlistData?.length || 0,
    sessionShownItems: sessionShownContent.size,
    excludingOnlyWatchlist: true,
  });

  // 7. Sort genres by weighted score
  const topGenres = Array.from(genreScores.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Top 10 genres

  console.log('[SmartRecs] Top genres:', topGenres.slice(0, 5).map((g) => g.name));

  // 8. Calculate average rating
  const ratings: number[] = [];
  watchlistData?.forEach((item: any) => {
    if (item.rating) ratings.push(item.rating);
  });

  const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return {
    topGenres,
    preferredMediaType,
    averageRating,
    totalInteractions: watchlistData?.length || 0,
    recentGenres: Array.from(recentGenres),
    watchlistContentIds,
  };
};

// ============================================================================
// SMART RECOMMENDATIONS
// ============================================================================

/**
 * Get personalized recommendations with multiple categories
 */
export const getSmartRecommendations = async (
  userId: string,
  options: {
    mediaType?: 'movie' | 'tv' | 'mixed';
    limit?: number;
    includeDiscovery?: boolean;
    forceRefresh?: boolean;
  } = {}
): Promise<SmartRecommendations> => {
  const { mediaType = 'mixed', limit = 20, includeDiscovery = true, forceRefresh = false } = options;

  // Clear session cache if force refresh is requested
  if (forceRefresh) {
    clearRecommendationCache();
  }

  console.log('[SmartRecs] Getting smart recommendations:', {
    userId,
    mediaType,
    limit,
    sessionCacheSize: sessionShownContent.size,
    forceRefresh,
  });

  const prefs = await getUserPreferences(userId);

  if (prefs.totalInteractions === 0) {
    console.log('[SmartRecs] No user data, returning trending only');
    return {
      forYou: [],
      becauseYouLiked: [],
      discovery: [],
      trending: await fetchTrending(prefs.watchlistContentIds, limit),
    };
  }

  // Determine which media types to fetch
  const fetchMovie =
    mediaType === 'mixed' || mediaType === 'movie' || prefs.preferredMediaType === 'movie';
  const fetchTV = mediaType === 'mixed' || mediaType === 'tv' || prefs.preferredMediaType === 'tv';

  // 1. "FOR YOU" - Based on top genres with quality filter
  // IMPROVEMENT: Fetch MORE candidates than needed, then apply weighted randomization
  const forYouPromises: Promise<UnifiedContent[]>[] = [];

  if (prefs.topGenres.length > 0) {
    // Fetch MORE candidates (3x limit) for better variety and scoring
    const fetchLimit = limit * 3;

    // Strategy 1: Top 3 genres with OR logic (broad personalization)
    const topGenreIds = prefs.topGenres.slice(0, 3).map((g) => g.id);

    if (fetchMovie) {
      forYouPromises.push(fetchByGenres(topGenreIds, 'movie', fetchLimit, prefs.watchlistContentIds));
    }
    if (fetchTV) {
      forYouPromises.push(fetchByGenres(topGenreIds, 'tv', fetchLimit, prefs.watchlistContentIds));
    }

    // Strategy 2: "DEEP CUTS" - Exact genre combinations user loves
    const deepCuts = await getDeepCutRecommendations(userId, prefs, fetchMovie, fetchTV, Math.floor(limit / 2));
    if (deepCuts.length > 0) {
      console.log('[SmartRecs] Deep cuts found:', deepCuts.length);
      forYouPromises.push(Promise.resolve(deepCuts));
    }
  }

  const forYouResults = await Promise.all(forYouPromises);
  const allCandidates = forYouResults.flat();

  // IMPROVEMENT: Apply weighted randomization (70% relevance, 30% random)
  const forYou = applyWeightedRandomization(allCandidates, prefs, limit);

  console.log('[SmartRecs] For You items:', forYou.length, 'from', allCandidates.length, 'candidates');

  // 2. "BECAUSE YOU LIKED [GENRE]" - Specific genre recommendations
  const becauseYouLiked: { genre: string; items: UnifiedContent[] }[] = [];

  for (const genre of prefs.topGenres.slice(0, 3)) {
    const type = prefs.preferredMediaType === 'balanced' ? 'movie' : prefs.preferredMediaType;
    const items = await fetchByGenres([genre.id], type, 10, prefs.watchlistContentIds);
    if (items.length > 0) {
      becauseYouLiked.push({ genre: genre.name, items: items.slice(0, 6) });
    }
  }

  console.log('[SmartRecs] Because You Liked categories:', becauseYouLiked.length);

  // 3. "DISCOVERY" - Content outside usual genres
  let discovery: UnifiedContent[] = [];
  if (includeDiscovery && prefs.totalInteractions > 5) {
    discovery = await getDiscoveryContent(prefs, Math.floor(limit / 2));
    console.log('[SmartRecs] Discovery items:', discovery.length);
  }

  // 4. "TRENDING" - Always include some trending content
  const trending = await fetchTrending(prefs.watchlistContentIds, 10);
  console.log('[SmartRecs] Trending items:', trending.length);

  return { forYou, becauseYouLiked, discovery, trending };
};

// ============================================================================
// FETCHING FUNCTIONS
// ============================================================================

/**
 * Fetch content by genres with quality filters
 * UPDATED: Uses random page selection (1-10) for variety and tracks shown content
 */
const fetchByGenres = async (
  genreIds: number[],
  mediaType: 'movie' | 'tv',
  limit: number,
  excludeIds: Set<string>
): Promise<UnifiedContent[]> => {
  try {
    // Map TV genre IDs to movie equivalents if needed
    const mappedIds =
      mediaType === 'movie' ? genreIds.map((id) => TV_TO_MOVIE_MAP[id] || id) : genreIds;

    const endpoint = mediaType === 'tv' ? '/discover/tv' : '/discover/movie';

    // Use random page (1-10) for variety instead of always page 1
    const randomPage = Math.floor(Math.random() * 10) + 1;

    console.log(`[SmartRecs] Fetching ${mediaType} by genres:`, {
      genres: mappedIds,
      page: randomPage,
      excludeCount: excludeIds.size,
    });

    const response = await tmdbApi.get(endpoint, {
      params: {
        with_genres: mappedIds.join('|'), // OR logic
        sort_by: 'popularity.desc',
        'vote_count.gte': 100,
        'vote_average.gte': 6.5,
        page: randomPage, // Random page for variety
      },
    });

    const results = mapToUnifiedContent(response.data.results || [], mediaType);

    // Filter out content already on watchlist or shown this session
    const filtered = results.filter((item) => !excludeIds.has(`${item.type}-${item.id}`));

    // Take the limit and track what we're showing
    const toShow = filtered.slice(0, limit);
    toShow.forEach((item) => {
      const key = `${item.type}-${item.id}`;
      sessionShownContent.add(key);
    });

    console.log(`[SmartRecs] Returning ${toShow.length} items, session cache now has ${sessionShownContent.size} items`);

    return toShow;
  } catch (error) {
    console.error('[SmartRecs] Error fetching by genres:', error);
    return [];
  }
};

/**
 * Get discovery content - genres the user hasn't explored much
 * UPDATED: Tracks shown content and uses random page selection
 */
const getDiscoveryContent = async (
  prefs: UserPreferences,
  limit: number
): Promise<UnifiedContent[]> => {
  try {
    const userGenreIds = new Set(prefs.topGenres.map((g) => g.id));
    const allGenreIds = Object.keys(MOVIE_GENRES).map(Number);

    // Find genres user hasn't interacted with much
    const unexploredGenres = allGenreIds.filter((id) => !userGenreIds.has(id));

    if (unexploredGenres.length === 0) return [];

    // Pick 2-3 random unexplored genres
    const shuffled = unexploredGenres.sort(() => Math.random() - 0.5);
    const discoveryGenres = shuffled.slice(0, 3);

    // Use random page for variety
    const randomPage = Math.floor(Math.random() * 5) + 1;

    console.log('[SmartRecs] Discovery genres:', discoveryGenres, 'page:', randomPage);

    const response = await tmdbApi.get('/discover/movie', {
      params: {
        with_genres: discoveryGenres.join('|'),
        sort_by: 'popularity.desc',
        'vote_average.gte': 7.5, // Higher quality bar for discovery
        'vote_count.gte': 500,
        page: randomPage,
      },
    });

    const filtered = mapToUnifiedContent(response.data.results || [], 'movie')
      .filter((item) => !prefs.watchlistContentIds.has(`movie-${item.id}`));

    const toShow = filtered.slice(0, limit);

    // Track shown content
    toShow.forEach((item) => {
      sessionShownContent.add(`${item.type}-${item.id}`);
    });

    return toShow;
  } catch (error) {
    console.error('[SmartRecs] Error fetching discovery:', error);
    return [];
  }
};

/**
 * Fetch trending content
 * UPDATED: Tracks shown content
 */
const fetchTrending = async (excludeIds: Set<string>, limit: number): Promise<UnifiedContent[]> => {
  try {
    console.log('[SmartRecs] Fetching trending content');

    const response = await tmdbApi.get('/trending/all/day');
    const results = response.data.results || [];

    const filtered = results
      .map((item: any) => {
        const type = (item.media_type || 'movie') as 'movie' | 'tv';
        return mapToUnifiedContent([item], type)[0];
      })
      .filter((item) => item && !excludeIds.has(`${item.type}-${item.id}`));

    const toShow = filtered.slice(0, limit);

    // Track shown content
    toShow.forEach((item) => {
      sessionShownContent.add(`${item.type}-${item.id}`);
    });

    return toShow;
  } catch (error) {
    console.error('[SmartRecs] Error fetching trending:', error);
    return [];
  }
};

// ============================================================================
// IMPROVEMENT FUNCTIONS
// ============================================================================

/**
 * Get "deep cut" recommendations - content with exact genre combinations user loves
 * Finds popular genre pairs/trios from watchlist and fetches matching content
 */
const getDeepCutRecommendations = async (
  userId: string,
  prefs: UserPreferences,
  fetchMovie: boolean,
  fetchTV: boolean,
  limit: number
): Promise<UnifiedContent[]> => {
  try {
    // Get user's watchlist to find genre combinations
    const { data: watchlistData } = await supabase
      .from('watchlist_items')
      .select(`
        content (
          type,
          genres
        )
      `)
      .eq('user_id', userId);

    if (!watchlistData || watchlistData.length < 5) {
      console.log('[SmartRecs] Not enough watchlist data for deep cuts');
      return [];
    }

    // Find popular genre combinations (pairs)
    const genreCombos = new Map<string, { count: number; genres: number[]; type: 'movie' | 'tv' }>();

    watchlistData.forEach((item: any) => {
      const content = item.content;
      if (!content || !content.genres || content.genres.length < 2) return;

      const genres = content.genres.slice(0, 3); // Take up to 3 genres
      const key = genres.sort((a: number, b: number) => a - b).join('-');

      if (genreCombos.has(key)) {
        genreCombos.get(key)!.count++;
      } else {
        genreCombos.set(key, {
          count: 1,
          genres,
          type: content.type,
        });
      }
    });

    // Get top 2-3 most popular combinations
    const topCombos = Array.from(genreCombos.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .filter(([, data]) => data.count >= 2); // Must appear at least twice

    if (topCombos.length === 0) {
      console.log('[SmartRecs] No recurring genre combinations found');
      return [];
    }

    console.log('[SmartRecs] Top genre combos:', topCombos.map(([key, data]) =>
      `${key} (${data.count}x)`
    ));

    // Fetch content matching these exact combinations
    const deepCutPromises: Promise<UnifiedContent[]>[] = [];

    for (const [, data] of topCombos) {
      if ((data.type === 'movie' && fetchMovie) || (data.type === 'tv' && fetchTV)) {
        const randomPage = Math.floor(Math.random() * 5) + 1;
        const endpoint = data.type === 'tv' ? '/discover/tv' : '/discover/movie';

        const promise = tmdbApi.get(endpoint, {
          params: {
            with_genres: data.genres.join(','), // AND logic for exact combo
            sort_by: 'vote_average.desc',
            'vote_count.gte': 500,
            'vote_average.gte': 7.0,
            page: randomPage,
          },
        }).then(response => {
          const results = mapToUnifiedContent(response.data.results || [], data.type);
          return results.filter((item) => !prefs.watchlistContentIds.has(`${item.type}-${item.id}`));
        }).catch(error => {
          console.error('[SmartRecs] Deep cut fetch error:', error);
          return [];
        });

        deepCutPromises.push(promise);
      }
    }

    const deepCutResults = await Promise.all(deepCutPromises);
    const allDeepCuts = deepCutResults.flat();

    // Track shown content
    const toShow = allDeepCuts.slice(0, limit);
    toShow.forEach((item) => {
      sessionShownContent.add(`${item.type}-${item.id}`);
    });

    console.log('[SmartRecs] Deep cuts:', toShow.length, 'from', allDeepCuts.length, 'candidates');
    return toShow;
  } catch (error) {
    console.error('[SmartRecs] Error getting deep cuts:', error);
    return [];
  }
};

/**
 * Apply weighted randomization to recommendations
 * 70% based on relevance score, 30% random for variety
 */
const applyWeightedRandomization = (
  candidates: UnifiedContent[],
  prefs: UserPreferences,
  limit: number
): UnifiedContent[] => {
  // Remove duplicates
  const unique = Array.from(
    new Map(candidates.map((i) => [`${i.type}-${i.id}`, i])).values()
  );

  // Calculate relevance score for each item
  const scored = unique.map((item) => {
    let relevanceScore = 0;

    // Score based on genre match
    const itemGenres = item.genres || item.genre_ids || [];
    const userGenreIds = new Set(prefs.topGenres.map((g) => g.id));

    itemGenres.forEach((genreId: number) => {
      if (userGenreIds.has(genreId)) {
        // Find the genre's weight
        const genreData = prefs.topGenres.find((g) => g.id === genreId);
        if (genreData) {
          relevanceScore += genreData.score;
        }
      }
    });

    // Boost items with higher ratings
    relevanceScore += (item.rating / 10) * 20; // Max +20 for 10/10 rating

    // Boost based on popularity (but not too much)
    relevanceScore += Math.log10(item.popularity || 1) * 5;

    // Normalize score to 0-100 range
    relevanceScore = Math.min(100, relevanceScore);

    return {
      ...item,
      _relevanceScore: relevanceScore,
    };
  });

  // Sort with weighted randomization: 70% relevance, 30% random
  const sorted = scored.sort((a, b) => {
    const aScore = (a._relevanceScore * 0.7) + (Math.random() * 30);
    const bScore = (b._relevanceScore * 0.7) + (Math.random() * 30);
    return bScore - aScore;
  });

  console.log('[SmartRecs] Top scored items:',
    sorted.slice(0, 5).map(i => `${i.title} (${i._relevanceScore.toFixed(1)})`)
  );

  // Return top items after weighted selection
  return sorted.slice(0, limit).map(({ _relevanceScore, ...item }) => item as UnifiedContent);
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Map TMDb API results to UnifiedContent format
 */
const mapToUnifiedContent = (results: any[], defaultType: 'movie' | 'tv'): UnifiedContent[] => {
  return results.map((item: any) => {
    const mediaType = (item.media_type || defaultType) as 'movie' | 'tv';
    return {
      id: item.id,
      title: item.title || item.name,
      originalTitle: item.original_title || item.original_name || item.title || item.name,
      type: mediaType,
      media_type: mediaType, // Add alias for compatibility
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      overview: item.overview || '',
      releaseDate: item.release_date || item.first_air_date || null,
      rating: item.vote_average || 0,
      voteCount: item.vote_count || 0,
      popularity: item.popularity || 0,
      language: item.original_language || '',
      genres: item.genre_ids || [],
      genre_ids: item.genre_ids || [], // Add alias for compatibility
    } as any; // Use 'as any' to allow extra fields beyond UnifiedContent interface
  });
};

/**
 * Shuffle and limit items, removing duplicates
 */
const shuffleAndLimit = (items: UnifiedContent[], limit: number): UnifiedContent[] => {
  // Remove duplicates based on type-id combo
  const unique = Array.from(new Map(items.map((i) => [`${i.type}-${i.id}`, i])).values());

  // Shuffle for variety
  const shuffled = unique.sort(() => Math.random() - 0.5);

  return shuffled.slice(0, limit);
};

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

/**
 * Get personalized recommendations (simplified API for backwards compatibility)
 */
export const getPersonalizedRecommendations = async (
  userId: string,
  mediaType: 'movie' | 'tv' = 'movie',
  limit: number = 20,
  forceRefresh: boolean = false
): Promise<UnifiedContent[]> => {
  console.log('[SmartRecs] Using API: getPersonalizedRecommendations');
  const result = await getSmartRecommendations(userId, { mediaType, limit, forceRefresh });
  return result.forYou;
};

/**
 * Get mixed recommendations (both movies and TV shows)
 */
export const getMixedRecommendations = async (
  userId: string,
  limit: number = 20,
  forceRefresh: boolean = false
): Promise<UnifiedContent[]> => {
  console.log('[SmartRecs] Using API: getMixedRecommendations');
  const result = await getSmartRecommendations(userId, { mediaType: 'mixed', limit, forceRefresh });
  return result.forYou;
};

/**
 * Get discovery recommendations - content outside user's usual genres
 */
export const getDiscoveryRecommendations = async (
  userId: string,
  limit: number = 10,
  forceRefresh: boolean = false
): Promise<UnifiedContent[]> => {
  console.log('[SmartRecs] Using API: getDiscoveryRecommendations');
  if (forceRefresh) {
    clearRecommendationCache();
  }
  const prefs = await getUserPreferences(userId);
  return getDiscoveryContent(prefs, limit);
};
