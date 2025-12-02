/**
 * Genre Utilities
 * Helper functions for genre detection and filtering
 */

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
