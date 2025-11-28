/**
 * Personalized Recommendations Service
 * Generates content recommendations based on user genre preferences
 */

import { tmdbApi } from './tmdb';
import { getUserTopGenres } from './genreAffinity';
import type { UnifiedContent } from '@/types';

/**
 * Get personalized recommendations for a specific media type
 */
export const getPersonalizedRecommendations = async (
  userId: string,
  mediaType: 'movie' | 'tv' = 'movie',
  limit: number = 20
): Promise<UnifiedContent[]> => {
  console.log('[PersonalizedRecs] Starting for user:', userId, 'mediaType:', mediaType);
  console.log('[PersonalizedRecs] tmdbApi exists:', !!tmdbApi);

  try {
    const topGenres = await getUserTopGenres(userId, 3);
    console.log('[PersonalizedRecs] User top genres:', topGenres.map(g => g.genreName).join(', '));

    if (topGenres.length === 0) {
      console.log('[Recommendations] No genre preferences, returning popular content');
      const endpoint = mediaType === 'tv' ? '/tv/popular' : '/movie/popular';
      const response = await tmdbApi.get(endpoint);
      return mapToUnifiedContent(response.data.results.slice(0, limit), mediaType);
    }

    console.log('[Recommendations] Top genres:', topGenres.map(g => g.genreName));
    const genreIds = topGenres.map(g => g.genreId).join(',');

    const endpoint = mediaType === 'tv' ? '/discover/tv' : '/discover/movie';
    const response = await tmdbApi.get(endpoint, {
      params: {
        with_genres: genreIds,
        sort_by: 'popularity.desc',
        'vote_count.gte': 100,
        page: 1,
      },
    });

    console.log('[PersonalizedRecs] Got', response.data.results?.length || 0, 'results from TMDb');
    return mapToUnifiedContent(response.data.results.slice(0, limit), mediaType);
  } catch (error) {
    console.error('[Recommendations] Error fetching personalized recommendations:', error);
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
    const [movies, tvShows] = await Promise.all([
      getPersonalizedRecommendations(userId, 'movie', Math.ceil(limit / 2)),
      getPersonalizedRecommendations(userId, 'tv', Math.floor(limit / 2)),
    ]);

    // Interleave movies and TV shows
    const mixed: UnifiedContent[] = [];
    const maxLen = Math.max(movies.length, tvShows.length);

    for (let i = 0; i < maxLen; i++) {
      if (movies[i]) mixed.push(movies[i]);
      if (tvShows[i]) mixed.push(tvShows[i]);
    }

    return mixed.slice(0, limit);
  } catch (error) {
    console.error('[Recommendations] Error fetching mixed recommendations:', error);
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
