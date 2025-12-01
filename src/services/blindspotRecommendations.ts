/**
 * Blindspot Recommendations Service
 * "Oh by the way, you might like this that we have not recommended to you yet."
 *
 * Philosophy: Show content the user WOULDN'T normally see
 * - Unexplored genres
 * - Hidden gems (high rating, low popularity)
 * - Classic gaps (acclaimed older content)
 * - Adjacent interests (genres that fans of user's genres also love)
 * - Service exclusives (content only on services user pays for)
 *
 * This is INTENTIONALLY different from the main recommendation pipeline.
 */

import { supabase } from '@/config/supabase';
import { tmdbApi } from '@/services/tmdb';
import { getUserTopGenres } from './genreAffinity';

export type BlindspotReason =
  | 'unexplored_genre'    // Genre user hasn't touched
  | 'hidden_gem'          // High rating, low popularity
  | 'classic_gap'         // Acclaimed older content
  | 'adjacent_interest'   // Related to interests but not direct match
  | 'service_exclusive';  // Only on a service user pays for

export interface BlindspotItem {
  id: number;
  title: string;
  posterPath: string;
  rating: number;
  voteCount: number;
  releaseYear: number;
  genres: number[];
  mediaType: 'movie' | 'tv';

  // Blindspot metadata
  blindspotReason: BlindspotReason;
  pitch: string;  // Personalized explanation
  service?: string;

  // Raw TMDb data
  rawData: any;
}

// Genre adjacency map: Genres that fans of X also love
const ADJACENT_GENRES: Record<string, string[]> = {
  'Science Fiction': ['Thriller', 'Mystery', 'Drama'],
  'Action': ['Thriller', 'Crime', 'Adventure'],
  'Drama': ['Mystery', 'Crime', 'Romance'],
  'Comedy': ['Romance', 'Family', 'Animation'],
  'Horror': ['Thriller', 'Mystery', 'Science Fiction'],
  'Thriller': ['Crime', 'Mystery', 'Horror'],
  'Romance': ['Comedy', 'Drama', 'Family'],
  'Documentary': ['History', 'War', 'Drama'],
  'Fantasy': ['Adventure', 'Science Fiction', 'Family'],
  'Animation': ['Family', 'Comedy', 'Adventure'],
};

const ALL_GENRE_NAMES = [
  'Drama', 'Comedy', 'Action', 'Adventure', 'Science Fiction',
  'Thriller', 'Horror', 'Romance', 'Documentary', 'Crime',
  'Mystery', 'Fantasy', 'Family', 'War', 'History', 'Animation',
];

/**
 * Get user's watchlist and exclusion IDs
 */
const getUserExclusions = async (userId: string): Promise<Set<number>> => {
  try {
    const { data: watchlistItems, error } = await supabase
      .from('watchlist_items')
      .select('content(tmdb_id)')
      .eq('user_id', userId);

    if (error) {
      console.error('[Blindspot] Supabase error fetching watchlist:', error);
      return new Set();
    }

    if (!watchlistItems || watchlistItems.length === 0) {
      console.log('[Blindspot] No watchlist items found for user');
      return new Set();
    }

    const ids = watchlistItems
      .filter(item => item.content)
      .map(item => (item.content as any).tmdb_id)
      .filter(id => id != null);
    console.log('[Blindspot] Loaded', ids.length, 'watchlist IDs to exclude');

    return new Set(ids);
  } catch (error) {
    console.error('[Blindspot] Error fetching exclusions:', error);
    return new Set();
  }
};

/**
 * 1. UNEXPLORED GENRES
 * Find genres user has never engaged with
 */
const getUnexploredGenreBlindspots = async (
  userId: string,
  excludeIds: Set<number>
): Promise<BlindspotItem[]> => {
  try {
    // Get user's top genres
    const topGenresData = await getUserTopGenres(userId, 10, true);
    const userGenres = new Set(topGenresData.map(g => g.genreName));

    // Find unexplored genres
    const unexploredGenres = ALL_GENRE_NAMES.filter(g => !userGenres.has(g));

    if (unexploredGenres.length === 0) {
      console.log('[Blindspot] No unexplored genres found');
      return [];
    }

    console.log('[Blindspot] Unexplored genres:', unexploredGenres.slice(0, 3));

    const blindspots: BlindspotItem[] = [];

    // Pick 2 random unexplored genres
    const selectedGenres = unexploredGenres
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    for (const genreName of selectedGenres) {
      // Get genre ID mapping
      const genreIdMap: Record<string, number> = {
        'Drama': 18,
        'Comedy': 35,
        'Action': 28,
        'Adventure': 12,
        'Science Fiction': 878,
        'Thriller': 53,
        'Horror': 27,
        'Romance': 10749,
        'Documentary': 99,
        'Crime': 80,
        'Mystery': 9648,
        'Fantasy': 14,
        'Family': 10751,
        'War': 10752,
        'History': 36,
        'Animation': 16,
      };

      const genreId = genreIdMap[genreName];
      if (!genreId) continue;

      // Fetch top-rated content in this genre
      const response = await tmdbApi.get('/discover/movie', {
        params: {
          with_genres: genreId,
          sort_by: 'vote_average.desc',
          'vote_count.gte': 1000,
          'vote_average.gte': 7.5,
          page: 1,
        },
      });

      const topInGenre = response.data?.results?.[0];
      if (!topInGenre || excludeIds.has(topInGenre.id)) continue;

      blindspots.push({
        id: topInGenre.id,
        title: topInGenre.title || topInGenre.name,
        posterPath: topInGenre.poster_path,
        rating: topInGenre.vote_average,
        voteCount: topInGenre.vote_count,
        releaseYear: new Date(topInGenre.release_date || topInGenre.first_air_date).getFullYear(),
        genres: topInGenre.genre_ids || [],
        mediaType: 'movie',
        blindspotReason: 'unexplored_genre',
        pitch: `You haven't explored ${genreName} yet. This is one of the highest rated in the genre.`,
        rawData: topInGenre,
      });
    }

    return blindspots;
  } catch (error) {
    console.error('[Blindspot] Error getting unexplored genres:', error);
    return [];
  }
};

/**
 * 2. HIDDEN GEMS
 * High rating (8.0+) but low popularity (<5000 votes)
 */
const getHiddenGemBlindspots = async (
  userId: string,
  excludeIds: Set<number>
): Promise<BlindspotItem[]> => {
  try {
    const blindspots: BlindspotItem[] = [];

    // Search for hidden gems in movies
    const movieResponse = await tmdbApi.get('/discover/movie', {
      params: {
        sort_by: 'vote_average.desc',
        'vote_count.gte': 500,   // Has enough votes to be credible
        'vote_count.lte': 5000,  // But not mainstream
        'vote_average.gte': 8.0, // High quality
        page: Math.floor(Math.random() * 3) + 1, // Random page 1-3
      },
    });

    const gems = (movieResponse.data?.results || [])
      .filter((item: any) => !excludeIds.has(item.id))
      .slice(0, 3);

    for (const gem of gems) {
      blindspots.push({
        id: gem.id,
        title: gem.title,
        posterPath: gem.poster_path,
        rating: gem.vote_average,
        voteCount: gem.vote_count,
        releaseYear: new Date(gem.release_date).getFullYear(),
        genres: gem.genre_ids || [],
        mediaType: 'movie',
        blindspotReason: 'hidden_gem',
        pitch: `This ${gem.vote_average.toFixed(1)}-rated gem flew under the radar. Only ${gem.vote_count.toLocaleString()} people have rated it.`,
        rawData: gem,
      });
    }

    return blindspots;
  } catch (error) {
    console.error('[Blindspot] Error getting hidden gems:', error);
    return [];
  }
};

/**
 * 3. CLASSIC GAPS
 * Acclaimed content from before 2010 that user hasn't seen
 */
const getClassicGapBlindspots = async (
  userId: string,
  excludeIds: Set<number>
): Promise<BlindspotItem[]> => {
  try {
    const blindspots: BlindspotItem[] = [];

    // Search for classics
    const response = await tmdbApi.get('/discover/movie', {
      params: {
        'primary_release_date.lte': '2010-12-31',
        'primary_release_date.gte': '1980-01-01',
        sort_by: 'vote_average.desc',
        'vote_count.gte': 3000,
        'vote_average.gte': 8.0,
        page: Math.floor(Math.random() * 5) + 1,
      },
    });

    const classics = (response.data?.results || [])
      .filter((item: any) => !excludeIds.has(item.id))
      .slice(0, 2);

    for (const classic of classics) {
      const year = new Date(classic.release_date).getFullYear();
      blindspots.push({
        id: classic.id,
        title: classic.title,
        posterPath: classic.poster_path,
        rating: classic.vote_average,
        voteCount: classic.vote_count,
        releaseYear: year,
        genres: classic.genre_ids || [],
        mediaType: 'movie',
        blindspotReason: 'classic_gap',
        pitch: `A ${year} classic you may have missed. Rated ${classic.vote_average.toFixed(1)} by ${classic.vote_count.toLocaleString()} viewers.`,
        rawData: classic,
      });
    }

    return blindspots;
  } catch (error) {
    console.error('[Blindspot] Error getting classic gaps:', error);
    return [];
  }
};

/**
 * 4. ADJACENT INTERESTS
 * User loves Sci-Fi? Show acclaimed content in adjacent genres that Sci-Fi fans also love
 */
const getAdjacentInterestBlindspots = async (
  userId: string,
  excludeIds: Set<number>
): Promise<BlindspotItem[]> => {
  try {
    // Get user's top genres
    const topGenresData = await getUserTopGenres(userId, 3, true);
    if (topGenresData.length === 0) return [];

    const userTopGenre = topGenresData[0].genreName;
    const adjacentGenres = ADJACENT_GENRES[userTopGenre];

    if (!adjacentGenres || adjacentGenres.length === 0) {
      console.log('[Blindspot] No adjacent genres for', userTopGenre);
      return [];
    }

    console.log('[Blindspot] Finding adjacent interests for', userTopGenre, '→', adjacentGenres[0]);

    const blindspots: BlindspotItem[] = [];

    // Pick first adjacent genre
    const adjacentGenreName = adjacentGenres[0];
    const genreIdMap: Record<string, number> = {
      'Drama': 18, 'Comedy': 35, 'Action': 28, 'Adventure': 12,
      'Science Fiction': 878, 'Thriller': 53, 'Horror': 27,
      'Romance': 10749, 'Documentary': 99, 'Crime': 80,
      'Mystery': 9648, 'Fantasy': 14, 'Family': 10751,
      'War': 10752, 'History': 36, 'Animation': 16,
    };

    const adjacentGenreId = genreIdMap[adjacentGenreName];
    if (!adjacentGenreId) return [];

    const response = await tmdbApi.get('/discover/movie', {
      params: {
        with_genres: adjacentGenreId,
        sort_by: 'vote_average.desc',
        'vote_count.gte': 1000,
        'vote_average.gte': 7.5,
        page: 1,
      },
    });

    const adjacentContent = (response.data?.results || [])
      .filter((item: any) => !excludeIds.has(item.id))
      .slice(0, 2);

    for (const item of adjacentContent) {
      blindspots.push({
        id: item.id,
        title: item.title,
        posterPath: item.poster_path,
        rating: item.vote_average,
        voteCount: item.vote_count,
        releaseYear: new Date(item.release_date).getFullYear(),
        genres: item.genre_ids || [],
        mediaType: 'movie',
        blindspotReason: 'adjacent_interest',
        pitch: `Fans of ${userTopGenre} often love this ${adjacentGenreName} title. Worth a look?`,
        rawData: item,
      });
    }

    return blindspots;
  } catch (error) {
    console.error('[Blindspot] Error getting adjacent interests:', error);
    return [];
  }
};

/**
 * 5. SERVICE EXCLUSIVES
 * Content highly-rated that's available on services user pays for
 * (Note: This is a simplified version - full implementation would use watch providers API)
 */
const getServiceExclusiveBlindspots = async (
  userId: string,
  excludeIds: Set<number>
): Promise<BlindspotItem[]> => {
  try {
    // For now, just get highly-rated content that might be exclusive
    // In a full implementation, you'd use TMDb's watch providers API
    const response = await tmdbApi.get('/discover/movie', {
      params: {
        sort_by: 'vote_average.desc',
        'vote_count.gte': 1000,
        'vote_average.gte': 7.5,
        page: Math.floor(Math.random() * 5) + 1,
      },
    });

    const exclusives = (response.data?.results || [])
      .filter((item: any) => !excludeIds.has(item.id))
      .slice(0, 2);

    return exclusives.map((item: any) => ({
      id: item.id,
      title: item.title,
      posterPath: item.poster_path,
      rating: item.vote_average,
      voteCount: item.vote_count,
      releaseYear: new Date(item.release_date).getFullYear(),
      genres: item.genre_ids || [],
      mediaType: 'movie' as const,
      blindspotReason: 'service_exclusive' as const,
      pitch: `Highly-rated content you might have missed. Make the most of your streaming subscriptions.`,
      rawData: item,
    }));
  } catch (error) {
    console.error('[Blindspot] Error getting service exclusives:', error);
    return [];
  }
};

/**
 * Generate complete blindspot recommendations
 *
 * @param userId - User ID
 * @param limit - Maximum number of blindspots to return
 * @returns Array of blindspot recommendations
 */
export const generateBlindspotRecommendations = async (
  userId: string,
  limit: number = 12,
  additionalExcludeIds: number[] = []
): Promise<BlindspotItem[]> => {
  try {
    console.log('[Blindspot] Generating blindspot recommendations for user:', userId);

    // Get user exclusions (watchlist items to avoid recommending)
    const userExclusions = await getUserExclusions(userId);

    // Combine with additional exclusions (e.g., already shown items)
    const excludeIds = new Set([...userExclusions, ...additionalExcludeIds]);
    console.log('[Blindspot] Total exclusions:', excludeIds.size, '(user:', userExclusions.size, 'additional:', additionalExcludeIds.length, ')');

    // Gather all blindspot types
    const [
      unexploredGenre,
      hiddenGems,
      classicGaps,
      adjacentInterests,
      serviceExclusives,
    ] = await Promise.all([
      getUnexploredGenreBlindspots(userId, excludeIds),
      getHiddenGemBlindspots(userId, excludeIds),
      getClassicGapBlindspots(userId, excludeIds),
      getAdjacentInterestBlindspots(userId, excludeIds),
      getServiceExclusiveBlindspots(userId, excludeIds),
    ]);

    // Combine all blindspots with deduplication
    // Track seen IDs to prevent duplicates (same movie in multiple categories)
    const allBlindspots: BlindspotItem[] = [];
    const seenIds = new Set<number>();

    const addIfNotSeen = (item: BlindspotItem) => {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allBlindspots.push(item);
      }
    };

    // Add items from each category, checking for duplicates
    for (const item of unexploredGenre) addIfNotSeen(item);
    for (const item of hiddenGems) addIfNotSeen(item);
    for (const item of classicGaps) addIfNotSeen(item);
    for (const item of adjacentInterests) addIfNotSeen(item);
    for (const item of serviceExclusives) addIfNotSeen(item);

    console.log('[Blindspot] Generated blindspots (unique):', {
      unexploredGenre: unexploredGenre.length,
      hiddenGems: hiddenGems.length,
      classicGaps: classicGaps.length,
      adjacentInterests: adjacentInterests.length,
      serviceExclusives: serviceExclusives.length,
      totalBeforeDedup: unexploredGenre.length + hiddenGems.length + classicGaps.length + adjacentInterests.length + serviceExclusives.length,
      totalAfterDedup: allBlindspots.length,
      duplicatesRemoved: (unexploredGenre.length + hiddenGems.length + classicGaps.length + adjacentInterests.length + serviceExclusives.length) - allBlindspots.length,
    });

    // Shuffle and limit
    const shuffled = allBlindspots.sort(() => Math.random() - 0.5);
    const results = shuffled.slice(0, limit);

    console.log('[Blindspot] Returning', results.length, 'blindspot recommendations');
    console.log('[Blindspot] Breakdown:', {
      unexplored_genre: results.filter(b => b.blindspotReason === 'unexplored_genre').length,
      hidden_gem: results.filter(b => b.blindspotReason === 'hidden_gem').length,
      classic_gap: results.filter(b => b.blindspotReason === 'classic_gap').length,
      adjacent_interest: results.filter(b => b.blindspotReason === 'adjacent_interest').length,
      service_exclusive: results.filter(b => b.blindspotReason === 'service_exclusive').length,
    });

    return results;
  } catch (error) {
    console.error('[Blindspot] Error generating blindspot recommendations:', error);
    return [];
  }
};

/**
 * Get icon for blindspot reason
 */
export const getBlindspotIcon = (reason: BlindspotReason): string => {
  switch (reason) {
    case 'unexplored_genre':
      return '🧭'; // Compass - explore new territory
    case 'hidden_gem':
      return '💎'; // Gem - rare find
    case 'classic_gap':
      return '🏛️'; // Classic pillar
    case 'adjacent_interest':
      return '🔗'; // Link - connected interests
    case 'service_exclusive':
      return '🔒'; // Lock - exclusive
  }
};

/**
 * Get human-readable label for blindspot reason
 */
export const getBlindspotLabel = (reason: BlindspotReason): string => {
  switch (reason) {
    case 'unexplored_genre':
      return 'UNEXPLORED GENRE';
    case 'hidden_gem':
      return 'HIDDEN GEM';
    case 'classic_gap':
      return 'CLASSIC GAP';
    case 'adjacent_interest':
      return 'ADJACENT INTEREST';
    case 'service_exclusive':
      return 'SERVICE EXCLUSIVE';
  }
};
