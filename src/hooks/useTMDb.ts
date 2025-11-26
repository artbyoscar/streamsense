/**
 * TMDb React Query Hooks
 * Cached hooks for The Movie Database API with optimized stale times
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import * as tmdbService from '@/services/tmdb';
import type {
  TMDbMovieDetails,
  TMDbTVDetails,
  TMDbMovieListResponse,
  TMDbTVListResponse,
  TMDbMultiSearchResponse,
  UnifiedContent,
} from '@/types/tmdb';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const tmdbKeys = {
  all: ['tmdb'] as const,

  // Search
  search: () => [...tmdbKeys.all, 'search'] as const,
  searchContent: (query: string, page?: number) =>
    [...tmdbKeys.search(), 'content', query, page] as const,
  searchMovies: (query: string, page?: number) =>
    [...tmdbKeys.search(), 'movies', query, page] as const,
  searchTVShows: (query: string, page?: number) =>
    [...tmdbKeys.search(), 'tv', query, page] as const,

  // Details
  details: () => [...tmdbKeys.all, 'details'] as const,
  movieDetails: (id: number) => [...tmdbKeys.details(), 'movie', id] as const,
  tvDetails: (id: number) => [...tmdbKeys.details(), 'tv', id] as const,
  contentDetails: (id: number, type: 'movie' | 'tv') =>
    [...tmdbKeys.details(), type, id] as const,

  // Lists
  lists: () => [...tmdbKeys.all, 'lists'] as const,
  trending: (timeWindow?: string, page?: number) =>
    [...tmdbKeys.lists(), 'trending', timeWindow, page] as const,
  trendingMovies: (timeWindow?: string, page?: number) =>
    [...tmdbKeys.lists(), 'trending', 'movies', timeWindow, page] as const,
  trendingTVShows: (timeWindow?: string, page?: number) =>
    [...tmdbKeys.lists(), 'trending', 'tv', timeWindow, page] as const,
  popularMovies: (page?: number) =>
    [...tmdbKeys.lists(), 'popular', 'movies', page] as const,
  popularTVShows: (page?: number) =>
    [...tmdbKeys.lists(), 'popular', 'tv', page] as const,
  topRatedMovies: (page?: number) =>
    [...tmdbKeys.lists(), 'top-rated', 'movies', page] as const,
  topRatedTVShows: (page?: number) =>
    [...tmdbKeys.lists(), 'top-rated', 'tv', page] as const,
  nowPlaying: (page?: number) =>
    [...tmdbKeys.lists(), 'now-playing', page] as const,
  onTheAir: (page?: number) =>
    [...tmdbKeys.lists(), 'on-the-air', page] as const,
};

// ============================================================================
// CACHE TIMES
// ============================================================================

const CACHE_TIMES = {
  search: 1 * 60 * 60 * 1000, // 1 hour for search results
  details: 24 * 60 * 60 * 1000, // 24 hours for details
  lists: 6 * 60 * 60 * 1000, // 6 hours for trending/popular lists
};

// ============================================================================
// SEARCH HOOKS
// ============================================================================

/**
 * Search for movies and TV shows
 */
export function useSearchContent(
  query: string,
  page: number = 1,
  options?: Omit<UseQueryOptions<TMDbMultiSearchResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.searchContent(query, page),
    queryFn: () => tmdbService.searchContent(query, page),
    enabled: query.trim().length > 0,
    staleTime: CACHE_TIMES.search,
    gcTime: CACHE_TIMES.search * 2, // Keep in cache for 2 hours
    ...options,
  });
}

/**
 * Search for movies only
 */
export function useSearchMovies(
  query: string,
  page: number = 1,
  options?: Omit<UseQueryOptions<TMDbMovieListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.searchMovies(query, page),
    queryFn: () => tmdbService.searchMovies(query, page),
    enabled: query.trim().length > 0,
    staleTime: CACHE_TIMES.search,
    gcTime: CACHE_TIMES.search * 2,
    ...options,
  });
}

/**
 * Search for TV shows only
 */
export function useSearchTVShows(
  query: string,
  page: number = 1,
  options?: Omit<UseQueryOptions<TMDbTVListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.searchTVShows(query, page),
    queryFn: () => tmdbService.searchTVShows(query, page),
    enabled: query.trim().length > 0,
    staleTime: CACHE_TIMES.search,
    gcTime: CACHE_TIMES.search * 2,
    ...options,
  });
}

// ============================================================================
// DETAILS HOOKS
// ============================================================================

/**
 * Get movie details by ID
 */
export function useMovieDetails(
  movieId: number,
  options?: Omit<UseQueryOptions<TMDbMovieDetails>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.movieDetails(movieId),
    queryFn: () => tmdbService.getMovieDetails(movieId),
    enabled: !!movieId,
    staleTime: CACHE_TIMES.details,
    gcTime: CACHE_TIMES.details * 2, // Keep in cache for 48 hours
    ...options,
  });
}

/**
 * Get TV show details by ID
 */
export function useTVDetails(
  tvId: number,
  options?: Omit<UseQueryOptions<TMDbTVDetails>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.tvDetails(tvId),
    queryFn: () => tmdbService.getTVDetails(tvId),
    enabled: !!tvId,
    staleTime: CACHE_TIMES.details,
    gcTime: CACHE_TIMES.details * 2,
    ...options,
  });
}

/**
 * Get content details (auto-detect type)
 */
export function useContentDetails(
  id: number,
  type: 'movie' | 'tv',
  options?: Omit<UseQueryOptions<UnifiedContent>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.contentDetails(id, type),
    queryFn: () => tmdbService.getContentDetails(id, type),
    enabled: !!id && !!type,
    staleTime: CACHE_TIMES.details,
    gcTime: CACHE_TIMES.details * 2,
    ...options,
  });
}

// ============================================================================
// TRENDING HOOKS
// ============================================================================

/**
 * Get trending movies
 */
export function useTrendingMovies(
  timeWindow: 'day' | 'week' = 'week',
  page: number = 1,
  options?: Omit<UseQueryOptions<TMDbMovieListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.trendingMovies(timeWindow, page),
    queryFn: () => tmdbService.getTrendingMovies(timeWindow, page),
    staleTime: CACHE_TIMES.lists,
    gcTime: CACHE_TIMES.lists * 2,
    ...options,
  });
}

/**
 * Get trending TV shows
 */
export function useTrendingTVShows(
  timeWindow: 'day' | 'week' = 'week',
  page: number = 1,
  options?: Omit<UseQueryOptions<TMDbTVListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.trendingTVShows(timeWindow, page),
    queryFn: () => tmdbService.getTrendingTVShows(timeWindow, page),
    staleTime: CACHE_TIMES.lists,
    gcTime: CACHE_TIMES.lists * 2,
    ...options,
  });
}

/**
 * Get trending content (movies and TV)
 */
export function useTrending(
  timeWindow: 'day' | 'week' = 'week',
  page: number = 1,
  options?: Omit<UseQueryOptions<TMDbMultiSearchResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.trending(timeWindow, page),
    queryFn: () => tmdbService.getTrending(timeWindow, page),
    staleTime: CACHE_TIMES.lists,
    gcTime: CACHE_TIMES.lists * 2,
    ...options,
  });
}

// ============================================================================
// POPULAR HOOKS
// ============================================================================

/**
 * Get popular movies
 */
export function usePopularMovies(
  page: number = 1,
  options?: Omit<UseQueryOptions<TMDbMovieListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.popularMovies(page),
    queryFn: () => tmdbService.getPopularMovies(page),
    staleTime: CACHE_TIMES.lists,
    gcTime: CACHE_TIMES.lists * 2,
    ...options,
  });
}

/**
 * Get popular TV shows
 */
export function usePopularTVShows(
  page: number = 1,
  options?: Omit<UseQueryOptions<TMDbTVListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.popularTVShows(page),
    queryFn: () => tmdbService.getPopularTVShows(page),
    staleTime: CACHE_TIMES.lists,
    gcTime: CACHE_TIMES.lists * 2,
    ...options,
  });
}

// ============================================================================
// TOP RATED HOOKS
// ============================================================================

/**
 * Get top rated movies
 */
export function useTopRatedMovies(
  page: number = 1,
  options?: Omit<UseQueryOptions<TMDbMovieListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.topRatedMovies(page),
    queryFn: () => tmdbService.getTopRatedMovies(page),
    staleTime: CACHE_TIMES.lists,
    gcTime: CACHE_TIMES.lists * 2,
    ...options,
  });
}

/**
 * Get top rated TV shows
 */
export function useTopRatedTVShows(
  page: number = 1,
  options?: Omit<UseQueryOptions<TMDbTVListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.topRatedTVShows(page),
    queryFn: () => tmdbService.getTopRatedTVShows(page),
    staleTime: CACHE_TIMES.lists,
    gcTime: CACHE_TIMES.lists * 2,
    ...options,
  });
}

// ============================================================================
// NOW PLAYING / ON THE AIR HOOKS
// ============================================================================

/**
 * Get movies currently in theaters
 */
export function useNowPlayingMovies(
  page: number = 1,
  options?: Omit<UseQueryOptions<TMDbMovieListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.nowPlaying(page),
    queryFn: () => tmdbService.getNowPlayingMovies(page),
    staleTime: CACHE_TIMES.lists,
    gcTime: CACHE_TIMES.lists * 2,
    ...options,
  });
}

/**
 * Get TV shows currently airing
 */
export function useOnTheAirTVShows(
  page: number = 1,
  options?: Omit<UseQueryOptions<TMDbTVListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tmdbKeys.onTheAir(page),
    queryFn: () => tmdbService.getOnTheAirTVShows(page),
    staleTime: CACHE_TIMES.lists,
    gcTime: CACHE_TIMES.lists * 2,
    ...options,
  });
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export {
  // Image helpers
  getImageUrl,
  getPosterUrl,
  getBackdropUrl,
  // Content converters
  movieToUnifiedContent,
  tvToUnifiedContent,
} from '@/services/tmdb';
