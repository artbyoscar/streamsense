/**
 * Genre Utilities
 * Helper functions for genre detection and filtering
 */

import { TMDbGenre } from '@/types';

// Complete TMDb genre ID to name mapping
export const GENRE_ID_TO_NAME: Record<number, string> = {
  // Movie genres
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
  // TV genres
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

/**
 * Detects if content is Japanese anime
 * Checks multiple signals: language, origin country, and animation genre
 */
export const isAnime = (item: any): boolean => {
  const genreIds = item.genre_ids || item.genres?.map((g: any) => (typeof g === 'number' ? g : g.id)) || [];

  // Must have Animation genre (ID 16)
  if (!genreIds.includes(16)) {
    return false;
  }

  // Check 1: Original language is Japanese
  if (item.original_language === 'ja') {
    return true;
  }

  // Check 2: Origin country is Japan
  const originCountries = item.origin_country || [];
  if (originCountries.includes('JP')) {
    return true;
  }

  // Check 3: Has "anime" keyword in genres (some sources add this)
  const genres = item.genres || [];
  if (genres.some((g: any) => g.name?.toLowerCase() === 'anime')) {
    return true;
  }

  return false;
};

/**
 * Detects if content is Western/non-Japanese animation
 * Excludes anime from animation results
 */
export const isWesternAnimation = (item: any): boolean => {
  const genreIds = item.genre_ids || item.genres?.map((g: any) => (typeof g === 'number' ? g : g.id)) || [];

  // Must have Animation genre (ID 16)
  if (!genreIds.includes(16)) {
    return false;
  }

  // If it's Japanese, it's anime not western animation
  if (item.original_language === 'ja') {
    return false;
  }

  if (item.origin_country?.includes('JP')) {
    return false;
  }

  return true;
};

/**
 * Get all genre IDs from an item
 * Handles both number arrays (genre_ids) and object arrays (genres)
 */
export const getItemGenreIds = (item: any): number[] => {
  const genreIds: number[] = [];

  if (item.genre_ids && Array.isArray(item.genre_ids)) {
    genreIds.push(...item.genre_ids);
  }

  if (item.genres && Array.isArray(item.genres)) {
    item.genres.forEach((g: any) => {
      if (typeof g === 'number') {
        genreIds.push(g);
      } else if (g && g.id) {
        genreIds.push(g.id);
      }
    });
  }

  return genreIds;
};

/**
 * Convert genre IDs to TMDbGenre objects
 * Maps genre IDs to their proper {id, name} format
 */
export const convertGenreIdsToObjects = (genreIds: number[]): TMDbGenre[] => {
  return genreIds
    .map(id => ({
      id,
      name: GENRE_ID_TO_NAME[id] || 'Unknown',
    }))
    .filter(g => g.name !== 'Unknown'); // Filter out unknown genres
};

/**
 * Genre equivalents mapping for TV vs Movie IDs
 * Maps movie genre IDs to their TV equivalents and vice versa
 * Useful for matching content across media types
 */
export const GENRE_EQUIVALENTS: Record<number, number[]> = {
  // Action: Movie 28 <-> TV 10759 (Action & Adventure)
  28: [28, 10759],
  10759: [28, 10759],

  // Adventure: Movie 12 <-> TV 10759 (Action & Adventure)
  12: [12, 10759],

  // Sci-Fi: Movie 878 <-> TV 10765 (Sci-Fi & Fantasy)
  878: [878, 10765],
  10765: [878, 10765],

  // Fantasy: Movie 14 <-> TV 10765 (Sci-Fi & Fantasy)
  14: [14, 10765],

  // All other genres map to themselves (no equivalents)
  18: [18],   // Drama
  35: [35],   // Comedy
  80: [80],   // Crime
  99: [99],   // Documentary
  27: [27],   // Horror
  10402: [10402], // Music
  9648: [9648],   // Mystery
  10749: [10749], // Romance
  53: [53],   // Thriller
  10752: [10752], // War
  37: [37],   // Western
  16: [16],   // Animation
  10751: [10751], // Family
  36: [36],   // History
  10770: [10770], // TV Movie
  10762: [10762], // Kids
  10763: [10763], // News
  10764: [10764], // Reality
  10766: [10766], // Soap
  10767: [10767], // Talk
  10768: [10768], // War & Politics
};
