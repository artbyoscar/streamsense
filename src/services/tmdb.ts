/**
 * TMDb API Service
 * The Movie Database API integration for content data
 */

import Constants from 'expo-constants';
import type {
  TMDbMovie,
  TMDbMovieDetails,
  TMDbTVShow,
  TMDbTVDetails,
  TMDbMovieListResponse,
  TMDbTVListResponse,
  TMDbMultiSearchResponse,
  TMDbConfiguration,
  UnifiedContent,
  TMDbError,
} from '@/types/tmdb';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TMDB_API_KEY = Constants.expoConfig?.extra?.tmdbApiKey || process.env.TMDB_API_KEY;
const TMDB_ACCESS_TOKEN =
  Constants.expoConfig?.extra?.tmdbAccessToken || process.env.TMDB_ACCESS_TOKEN;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Make authenticated request to TMDb API
 */
async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);

  // Add query parameters
  const searchParams = new URLSearchParams({
    ...params,
    api_key: TMDB_API_KEY,
  });

  url.search = searchParams.toString();

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = (await response.json()) as TMDbError;
    throw new Error(error.status_message || 'TMDb API request failed');
  }

  return response.json();
}

/**
 * Get full image URL from TMDb path
 */
export function getImageUrl(
  path: string | null,
  size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Get poster URL (optimized sizes)
 */
export function getPosterUrl(
  path: string | null,
  size: 'small' | 'medium' | 'large' | 'original' = 'medium'
): string | null {
  const sizeMap = {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original',
  } as const;

  return getImageUrl(path, sizeMap[size]);
}

/**
 * Get backdrop URL (optimized sizes)
 */
export function getBackdropUrl(
  path: string | null,
  size: 'small' | 'medium' | 'large' | 'original' = 'large'
): string | null {
  const sizeMap = {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  } as const;

  return getImageUrl(path, sizeMap[size] as any);
}

/**
 * Convert TMDb movie to unified content
 */
export function movieToUnifiedContent(movie: TMDbMovie | TMDbMovieDetails): UnifiedContent {
  const isDetails = 'runtime' in movie;

  return {
    id: movie.id,
    type: 'movie',
    title: movie.title,
    originalTitle: movie.original_title,
    overview: movie.overview,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    releaseDate: movie.release_date || null,
    genres: isDetails ? movie.genres : [],
    rating: movie.vote_average,
    voteCount: movie.vote_count,
    popularity: movie.popularity,
    language: movie.original_language,
    runtime: isDetails ? movie.runtime : undefined,
  };
}

/**
 * Convert TMDb TV show to unified content
 */
export function tvToUnifiedContent(tv: TMDbTVShow | TMDbTVDetails): UnifiedContent {
  const isDetails = 'number_of_seasons' in tv;

  return {
    id: tv.id,
    type: 'tv',
    title: tv.name,
    originalTitle: tv.original_name,
    overview: tv.overview,
    posterPath: tv.poster_path,
    backdropPath: tv.backdrop_path,
    releaseDate: tv.first_air_date || null,
    genres: isDetails ? tv.genres : [],
    rating: tv.vote_average,
    voteCount: tv.vote_count,
    popularity: tv.popularity,
    language: tv.original_language,
    numberOfSeasons: isDetails ? tv.number_of_seasons : undefined,
    numberOfEpisodes: isDetails ? tv.number_of_episodes : undefined,
    status: isDetails ? tv.status : undefined,
  };
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Search for movies and TV shows
 */
export async function searchContent(
  query: string,
  page: number = 1
): Promise<TMDbMultiSearchResponse> {
  if (!query.trim()) {
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    };
  }

  return tmdbFetch<TMDbMultiSearchResponse>('/search/multi', {
    query: query.trim(),
    page: page.toString(),
    include_adult: 'false',
  });
}

/**
 * Search for movies only
 */
export async function searchMovies(query: string, page: number = 1): Promise<TMDbMovieListResponse> {
  if (!query.trim()) {
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    };
  }

  return tmdbFetch<TMDbMovieListResponse>('/search/movie', {
    query: query.trim(),
    page: page.toString(),
    include_adult: 'false',
  });
}

/**
 * Search for TV shows only
 */
export async function searchTVShows(query: string, page: number = 1): Promise<TMDbTVListResponse> {
  if (!query.trim()) {
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    };
  }

  return tmdbFetch<TMDbTVListResponse>('/search/tv', {
    query: query.trim(),
    page: page.toString(),
    include_adult: 'false',
  });
}

// ============================================================================
// DETAILS
// ============================================================================

/**
 * Get movie details by ID
 */
export async function getMovieDetails(movieId: number): Promise<TMDbMovieDetails> {
  return tmdbFetch<TMDbMovieDetails>(`/movie/${movieId}`, {
    append_to_response: 'credits,videos,images',
  });
}

/**
 * Get TV show details by ID
 */
export async function getTVDetails(tvId: number): Promise<TMDbTVDetails> {
  return tmdbFetch<TMDbTVDetails>(`/tv/${tvId}`, {
    append_to_response: 'credits,videos,images',
  });
}

/**
 * Get content details (auto-detect type)
 */
export async function getContentDetails(
  id: number,
  type: 'movie' | 'tv'
): Promise<UnifiedContent> {
  if (type === 'movie') {
    const movie = await getMovieDetails(id);
    return movieToUnifiedContent(movie);
  } else {
    const tv = await getTVDetails(id);
    return tvToUnifiedContent(tv);
  }
}

// ============================================================================
// TRENDING
// ============================================================================

/**
 * Get trending movies
 */
export async function getTrendingMovies(
  timeWindow: 'day' | 'week' = 'week',
  page: number = 1
): Promise<TMDbMovieListResponse> {
  return tmdbFetch<TMDbMovieListResponse>(`/trending/movie/${timeWindow}`, {
    page: page.toString(),
  });
}

/**
 * Get trending TV shows
 */
export async function getTrendingTVShows(
  timeWindow: 'day' | 'week' = 'week',
  page: number = 1
): Promise<TMDbTVListResponse> {
  return tmdbFetch<TMDbTVListResponse>(`/trending/tv/${timeWindow}`, {
    page: page.toString(),
  });
}

/**
 * Get trending content (movies and TV)
 */
export async function getTrending(
  timeWindow: 'day' | 'week' = 'week',
  page: number = 1
): Promise<TMDbMultiSearchResponse> {
  return tmdbFetch<TMDbMultiSearchResponse>(`/trending/all/${timeWindow}`, {
    page: page.toString(),
  });
}

// ============================================================================
// POPULAR
// ============================================================================

/**
 * Get popular movies
 */
export async function getPopularMovies(page: number = 1): Promise<TMDbMovieListResponse> {
  return tmdbFetch<TMDbMovieListResponse>('/movie/popular', {
    page: page.toString(),
  });
}

/**
 * Get popular TV shows
 */
export async function getPopularTVShows(page: number = 1): Promise<TMDbTVListResponse> {
  return tmdbFetch<TMDbTVListResponse>('/tv/popular', {
    page: page.toString(),
  });
}

/**
 * Get popular content (combined)
 */
export async function getPopular(type: 'movie' | 'tv' | 'all' = 'all', page: number = 1) {
  if (type === 'all') {
    // Combine both
    const [movies, tv] = await Promise.all([
      getPopularMovies(page),
      getPopularTVShows(page),
    ]);

    return {
      movies: movies.results,
      tv: tv.results,
    };
  } else if (type === 'movie') {
    return getPopularMovies(page);
  } else {
    return getPopularTVShows(page);
  }
}

// ============================================================================
// TOP RATED
// ============================================================================

/**
 * Get top rated movies
 */
export async function getTopRatedMovies(page: number = 1): Promise<TMDbMovieListResponse> {
  return tmdbFetch<TMDbMovieListResponse>('/movie/top_rated', {
    page: page.toString(),
  });
}

/**
 * Get top rated TV shows
 */
export async function getTopRatedTVShows(page: number = 1): Promise<TMDbTVListResponse> {
  return tmdbFetch<TMDbTVListResponse>('/tv/top_rated', {
    page: page.toString(),
  });
}

// ============================================================================
// NOW PLAYING / ON THE AIR
// ============================================================================

/**
 * Get movies currently in theaters
 */
export async function getNowPlayingMovies(page: number = 1): Promise<TMDbMovieListResponse> {
  return tmdbFetch<TMDbMovieListResponse>('/movie/now_playing', {
    page: page.toString(),
  });
}

/**
 * Get TV shows currently airing
 */
export async function getOnTheAirTVShows(page: number = 1): Promise<TMDbTVListResponse> {
  return tmdbFetch<TMDbTVListResponse>('/tv/on_the_air', {
    page: page.toString(),
  });
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get TMDb API configuration (image sizes, etc.)
 */
export async function getConfiguration(): Promise<TMDbConfiguration> {
  return tmdbFetch<TMDbConfiguration>('/configuration');
}
