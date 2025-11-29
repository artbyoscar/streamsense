/**
 * Content Browse Service
 * Provides browse categories for discovering movies and TV shows
 */

import { tmdbApi } from './tmdb';
import type { UnifiedContent } from '@/types';

export interface ContentCategory {
  id: string;
  title: string;
  endpoint: string;
  mediaType: 'movie' | 'tv' | 'all';
  params?: Record<string, string>; // Optional query params
}

// Helper to get date strings (with proper timezone handling)
const getDateString = (daysFromNow: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  // Format as YYYY-MM-DD with proper padding
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const BROWSE_CATEGORIES: ContentCategory[] = [
  { id: 'trending', title: '🔥 Trending Today', endpoint: '/trending/all/day', mediaType: 'all' },
  { id: 'popular-movies', title: '🎬 Popular Movies', endpoint: '/movie/popular', mediaType: 'movie' },
  { id: 'popular-tv', title: '📺 Popular TV Shows', endpoint: '/tv/popular', mediaType: 'tv' },
  { id: 'top-movies', title: '⭐ Top Rated Movies', endpoint: '/movie/top_rated', mediaType: 'movie' },
  { id: 'top-tv', title: '⭐ Top Rated TV Shows', endpoint: '/tv/top_rated', mediaType: 'tv' },
  {
    id: 'upcoming',
    title: '🎟️ Coming Soon',
    endpoint: '/discover/movie',
    mediaType: 'movie',
    params: {
      'primary_release_date.gte': getDateString(1), // Tomorrow onwards
      'primary_release_date.lte': getDateString(120), // Next 4 months
      'sort_by': 'primary_release_date.asc',
      'with_release_type': '2|3', // Theatrical releases only
    },
  },
  { id: 'now-playing', title: '🍿 In Theaters', endpoint: '/movie/now_playing', mediaType: 'movie' },
  { id: 'airing-today', title: '📡 Airing Today', endpoint: '/tv/airing_today', mediaType: 'tv' },
];

export const fetchCategoryContent = async (category: ContentCategory): Promise<UnifiedContent[]> => {
  console.log('[ContentBrowse] Fetching category:', category.title);
  console.log('[ContentBrowse] tmdbApi exists:', !!tmdbApi);

  try {
    // Include params if provided
    const response = await tmdbApi.get(category.endpoint, {
      params: category.params || {},
    });
    let results = response.data.results || [];
    console.log('[ContentBrowse] Got response:', results.length, 'items for', category.title);

    // Extra filter for Coming Soon to ensure future dates only
    if (category.id === 'upcoming') {
      const today = getDateString(0);
      console.log('[ContentBrowse] Filtering Coming Soon, today is:', today);
      console.log('[ContentBrowse] Date range:', {
        from: category.params?.['primary_release_date.gte'],
        to: category.params?.['primary_release_date.lte'],
      });

      const beforeFilter = results.length;
      results = results.filter((item: any) => {
        const releaseDate = item.release_date;
        const isFuture = releaseDate && releaseDate > today;
        if (!isFuture && releaseDate) {
          console.log('[ContentBrowse] Filtering out:', item.title, 'released:', releaseDate);
        }
        return isFuture;
      });
      console.log('[ContentBrowse] After filter:', results.length, 'items (filtered out', beforeFilter - results.length, ')');
    }

    return results.slice(0, 10).map((item: any) => ({
      id: item.id,
      title: item.title || item.name,
      originalTitle: item.original_title || item.original_name || item.title || item.name,
      type: (category.mediaType === 'all' ? (item.media_type || 'movie') : category.mediaType) as 'movie' | 'tv',
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      overview: item.overview || '',
      releaseDate: item.release_date || item.first_air_date || null,
      rating: item.vote_average || 0,
      voteCount: item.vote_count || 0,
      popularity: item.popularity || 0,
      language: item.original_language || '',
      genres: [],
    }));
  } catch (error) {
    console.error(`[ContentBrowse] ❌ Error fetching ${category.title}:`, error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('[ContentBrowse] Response error:', (error as any).response?.data);
    }
    return [];
  }
};

export const fetchMultipleCategories = async (categoryIds: string[]): Promise<Map<string, UnifiedContent[]>> => {
  const results = new Map<string, UnifiedContent[]>();
  const categories = BROWSE_CATEGORIES.filter(c => categoryIds.includes(c.id));

  await Promise.all(
    categories.map(async (category) => {
      const content = await fetchCategoryContent(category);
      results.set(category.id, content);
    })
  );

  return results;
};
