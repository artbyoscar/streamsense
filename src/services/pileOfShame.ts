/**
 * Pile of Shame Service
 * Show high-rated content on user's subscribed services that they haven't watched
 * Helps maximize value from existing subscriptions
 */

import { supabase } from '@/config/supabase';
import { tmdbApi } from './tmdb';
import { getUserProviderIds } from './watchProviders';

export interface ShameItem {
  id: number;
  title: string;
  type: 'movie' | 'tv';
  service: string;
  rating: number;
  voteCount: number;
  posterPath: string | null;
  overview: string;
  message: string;
  releaseYear: string;
  genres: string[];
}

/**
 * Get top-rated content available on a specific provider
 */
const getTopContentByProvider = async (
  providerIds: number[],
  contentType: 'movie' | 'tv'
): Promise<any[]> => {
  try {
    const endpoint = contentType === 'movie' ? '/discover/movie' : '/discover/tv';

    const response = await tmdbApi.get(endpoint, {
      params: {
        with_watch_providers: providerIds.join('|'),
        watch_region: 'US',
        sort_by: 'vote_average.desc',
        'vote_count.gte': contentType === 'movie' ? 500 : 200,
        'vote_average.gte': 7.0,
        page: 1,
      },
    });

    return response.data?.results || [];
  } catch (error) {
    console.error(`[PileOfShame] Error fetching top ${contentType} content:`, error);
    return [];
  }
};

/**
 * Get TMDb genre name from ID
 */
const getGenreName = (genreId: number, isTV: boolean): string => {
  const movieGenres: Record<number, string> = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
  };

  const tvGenres: Record<number, string> = {
    10759: 'Action & Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    10762: 'Kids',
    9648: 'Mystery',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
    37: 'Western',
  };

  const genreMap = isTV ? tvGenres : movieGenres;
  return genreMap[genreId] || 'Unknown';
};

/**
 * Get user's "Pile of Shame" - high-rated unwatched content on their services
 */
export const getPileOfShame = async (userId: string): Promise<ShameItem[]> => {
  try {
    console.log('[PileOfShame] Generating pile of shame for user:', userId);

    // Get user's active subscriptions
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[PileOfShame] No active subscriptions');
      return [];
    }

    // Get user's provider IDs
    const userProviderIds = await getUserProviderIds(userId);

    if (userProviderIds.length === 0) {
      console.log('[PileOfShame] No provider IDs found');
      return [];
    }

    console.log('[PileOfShame] User provider IDs:', userProviderIds);

    // Get user's watchlist IDs to exclude (only watched or currently watching)
    const { data: watchlist } = await supabase
      .from('watchlist_items')
      .select('tmdb_id, content_type, status')
      .eq('user_id', userId)
      .in('status', ['watched', 'watching']); // Only exclude engaged content

    const watchedIds = new Set(
      (watchlist || []).map(w => `${w.content_type}-${w.tmdb_id}`)
    );

    console.log('[PileOfShame] User has', watchedIds.size, 'watched/watching items to exclude');
    console.log('[PileOfShame] Excluded IDs sample:', Array.from(watchedIds).slice(0, 10));
    if (watchlist && watchlist.length > 0) {
      const statusBreakdown = watchlist.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('[PileOfShame] Status breakdown:', statusBreakdown);
    }

    // Get top movies and TV shows
    const [topMovies, topTVShows] = await Promise.all([
      getTopContentByProvider(userProviderIds, 'movie'),
      getTopContentByProvider(userProviderIds, 'tv'),
    ]);

    console.log('[PileOfShame] Found', topMovies.length, 'top movies and', topTVShows.length, 'top TV shows');

    // Format and filter unwatched content
    const unwatchedMovies = topMovies
      .filter(movie => !watchedIds.has(`movie-${movie.id}`))
      .slice(0, 8)
      .map(movie => ({
        id: movie.id,
        title: movie.title,
        type: 'movie' as const,
        service: subscriptions[0]?.service_name || 'Your services',
        rating: movie.vote_average,
        voteCount: movie.vote_count,
        posterPath: movie.poster_path,
        overview: movie.overview,
        message: `Rated ${movie.vote_average.toFixed(1)}/10 by ${(movie.vote_count / 1000).toFixed(1)}k viewers`,
        releaseYear: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : 'N/A',
        genres: (movie.genre_ids || []).slice(0, 3).map((id: number) => getGenreName(id, false)),
      }));

    const unwatchedTVShows = topTVShows
      .filter(show => !watchedIds.has(`tv-${show.id}`))
      .slice(0, 8)
      .map(show => ({
        id: show.id,
        title: show.name,
        type: 'tv' as const,
        service: subscriptions[0]?.service_name || 'Your services',
        rating: show.vote_average,
        voteCount: show.vote_count,
        posterPath: show.poster_path,
        overview: show.overview,
        message: `Rated ${show.vote_average.toFixed(1)}/10 by ${(show.vote_count / 1000).toFixed(1)}k viewers`,
        releaseYear: show.first_air_date ? new Date(show.first_air_date).getFullYear().toString() : 'N/A',
        genres: (show.genre_ids || []).slice(0, 3).map((id: number) => getGenreName(id, true)),
      }));

    // Combine and sort by rating
    const allUnwatched = [...unwatchedMovies, ...unwatchedTVShows]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 12); // Top 12 items

    console.log('[PileOfShame] Returning', allUnwatched.length, 'unwatched items');

    return allUnwatched;
  } catch (error) {
    console.error('[PileOfShame] Error generating pile of shame:', error);
    return [];
  }
};

/**
 * Get statistics about user's pile of shame
 */
export const getPileOfShameStats = async (userId: string): Promise<{
  totalItems: number;
  averageRating: number;
  topGenres: string[];
}> => {
  const items = await getPileOfShame(userId);

  if (items.length === 0) {
    return {
      totalItems: 0,
      averageRating: 0,
      topGenres: [],
    };
  }

  const averageRating = items.reduce((sum, item) => sum + item.rating, 0) / items.length;

  // Count genres
  const genreCounts: Record<string, number> = {};
  items.forEach(item => {
    item.genres.forEach(genre => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });

  const topGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([genre]) => genre);

  return {
    totalItems: items.length,
    averageRating,
    topGenres,
  };
};
