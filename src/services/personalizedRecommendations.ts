/**
 * Personalized Recommendations Service
 * Generates content recommendations based on user genre preferences
 */

import { tmdbApi } from './tmdb';
import { getUserTopGenres } from './genreAffinity';
import { MOVIE_GENRES, TV_GENRES } from '@/constants/genres';
import type { UnifiedContent } from '@/types';

// Map TV genre IDs to equivalent movie genre IDs
const TV_TO_MOVIE_GENRE_MAP: Record<number, number> = {
  10759: 28,    // Action & Adventure → Action
  10765: 878,   // Sci-Fi & Fantasy → Science Fiction
  10768: 10752, // War & Politics → War
};

const getMovieEquivalentGenres = (genreIds: number[]): number[] => {
  return genreIds.map(id => TV_TO_MOVIE_GENRE_MAP[id] || id);
};

/**
 * Get personalized recommendations for a specific media type
 */
export const getPersonalizedRecommendations = async (
  userId: string,
  mediaType: 'movie' | 'tv' = 'movie',
  limit: number = 20
): Promise<UnifiedContent[]> => {
  try {
    // Get more genres for variety (top 5 instead of 3)
    const topGenres = await getUserTopGenres(userId, 5);

    if (topGenres.length === 0) {
      console.log('[Recommendations] No preferences, returning popular');
      const endpoint = mediaType === 'tv' ? '/tv/popular' : '/movie/popular';
      const response = await tmdbApi.get(endpoint);
      return mapToUnifiedContent(response.data.results.slice(0, limit), mediaType);
    }

    let genreIds = topGenres.map(g => g.genreId);

    // Convert TV genres to movie equivalents if needed
    if (mediaType === 'movie') {
      genreIds = getMovieEquivalentGenres(genreIds);
    }

    // Filter to valid genres for this media type
    const validGenres = mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES;
    genreIds = genreIds.filter(id => validGenres[id]);

    if (genreIds.length === 0) {
      console.log('[Recommendations] No valid genres for', mediaType);
      const endpoint = mediaType === 'tv' ? '/tv/popular' : '/movie/popular';
      const response = await tmdbApi.get(endpoint);
      return mapToUnifiedContent(response.data.results.slice(0, limit), mediaType);
    }

    console.log('[Recommendations] Using genres:', genreIds.join(','), 'for', mediaType);

    // Use OR logic (with_genres uses OR when comma-separated with |)
    // This returns content matching ANY of the genres, not ALL
    const genreParam = genreIds.slice(0, 3).join('|');

    const endpoint = mediaType === 'tv' ? '/discover/tv' : '/discover/movie';
    const response = await tmdbApi.get(endpoint, {
      params: {
        with_genres: genreParam,
        sort_by: 'popularity.desc',
        'vote_count.gte': 50,  // Lower threshold for more results
        'vote_average.gte': 6, // Quality filter
        page: 1,
      },
    });

    const results = mapToUnifiedContent(response.data.results.slice(0, limit), mediaType);
    console.log('[Recommendations] Got', results.length, mediaType, 'results');
    return results;
  } catch (error) {
    console.error('[Recommendations] Error:', error);
    return [];
  }
};

/**
 * Get mixed recommendations (both movies and TV shows)
 */
export const getMixedRecommendations = async (
  userId: string,
  limit: number = 20
): Promise<UnifiedContent[]> => {
  try {
    // Get both in parallel
    const [movies, tvShows] = await Promise.all([
      getPersonalizedRecommendations(userId, 'movie', limit),
      getPersonalizedRecommendations(userId, 'tv', limit),
    ]);

    // Smarter mixing: weighted by user's content type preference
    // For now, alternate but prioritize whichever has more content
    const mixed: UnifiedContent[] = [];
    let movieIdx = 0;
    let tvIdx = 0;

    while (mixed.length < limit && (movieIdx < movies.length || tvIdx < tvShows.length)) {
      // Add 2 from the larger set, 1 from smaller for variety
      if (movies.length >= tvShows.length) {
        if (movieIdx < movies.length) mixed.push(movies[movieIdx++]);
        if (movieIdx < movies.length && mixed.length < limit) mixed.push(movies[movieIdx++]);
        if (tvIdx < tvShows.length && mixed.length < limit) mixed.push(tvShows[tvIdx++]);
      } else {
        if (tvIdx < tvShows.length) mixed.push(tvShows[tvIdx++]);
        if (tvIdx < tvShows.length && mixed.length < limit) mixed.push(tvShows[tvIdx++]);
        if (movieIdx < movies.length && mixed.length < limit) mixed.push(movies[movieIdx++]);
      }
    }

    return mixed;
  } catch (error) {
    console.error('[Recommendations] Error mixing:', error);
    return [];
  }
};

/**
 * Get "Discover New" recommendations - content OUTSIDE user's usual genres
 */
export const getDiscoveryRecommendations = async (
  userId: string,
  limit: number = 10
): Promise<UnifiedContent[]> => {
  try {
    const userGenres = await getUserTopGenres(userId, 5);
    const userGenreIds = new Set(userGenres.map(g => g.genreId));

    // Get popular content from genres user HASN'T explored
    const allGenres = Object.keys(MOVIE_GENRES).map(Number);
    const newGenres = allGenres.filter(id => !userGenreIds.has(id));

    if (newGenres.length === 0) {
      return [];
    }

    // Pick 2-3 random unexplored genres
    const shuffled = newGenres.sort(() => Math.random() - 0.5);
    const discoveryGenres = shuffled.slice(0, 3).join('|');

    const response = await tmdbApi.get('/discover/movie', {
      params: {
        with_genres: discoveryGenres,
        sort_by: 'popularity.desc',
        'vote_average.gte': 7,
        'vote_count.gte': 500,
      },
    });

    return mapToUnifiedContent(response.data.results.slice(0, limit), 'movie');
  } catch (error) {
    console.error('[Recommendations] Discovery error:', error);
    return [];
  }
};

/**
 * Map TMDB results to UnifiedContent format
 */
const mapToUnifiedContent = (results: any[], mediaType: 'movie' | 'tv'): UnifiedContent[] => {
  return results.map((item: any) => ({
    id: item.id,
    title: item.title || item.name,
    originalTitle: item.original_title || item.original_name || item.title || item.name,
    type: mediaType,
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    overview: item.overview || '',
    releaseDate: item.release_date || item.first_air_date || null,
    rating: item.vote_average || 0,
    voteCount: item.vote_count || 0,
    popularity: item.popularity || 0,
    language: item.original_language || '',
    genres: item.genre_ids || [],
  }));
};
