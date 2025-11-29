/**
 * Content Browse Service
 * Provides browse categories for discovering movies and TV shows
 * UPDATED: Now includes personalized categories based on user genre preferences
 */

import { tmdbApi } from './tmdb';
import { supabase } from '@/config/supabase';
import type { UnifiedContent } from '@/types';

export interface ContentCategory {
  id: string;
  title: string;
  endpoint: string;
  mediaType: 'movie' | 'tv' | 'all';
  params?: Record<string, string>; // Optional query params
}

// TMDb Genre ID to Name mapping
const GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science Fiction', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

// Genre emojis for visual appeal
const GENRE_EMOJIS: Record<number, string> = {
  28: '💥', 12: '🗺️', 16: '🎨', 35: '😂', 80: '🔪',
  99: '📹', 18: '🎭', 10751: '👨‍👩‍👧', 14: '🧙', 36: '📜',
  27: '👻', 10402: '🎵', 9648: '🔍', 10749: '💕',
  878: '🚀', 53: '😰', 10752: '⚔️', 37: '🤠',
  10759: '💥', 10762: '👶', 10765: '🛸', 10768: '🏛️',
};

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

/**
 * Get personalized content categories based on user's genre preferences
 */
export const getPersonalizedCategories = async (userId: string): Promise<ContentCategory[]> => {
  const categories: ContentCategory[] = [];

  try {
    console.log('[ContentBrowse] Getting personalized categories for user:', userId);

    // Get user's top genres from affinity table
    const { data: affinityData } = await supabase
      .from('user_genre_affinity')
      .select('genre_id, genre_name, affinity_score')
      .eq('user_id', userId)
      .order('affinity_score', { ascending: false })
      .limit(10);

    console.log('[ContentBrowse] Found', affinityData?.length || 0, 'genres in affinity table');

    // Static categories first
    categories.push(
      { id: 'trending', title: '🔥 Trending Today', endpoint: '/trending/all/day', mediaType: 'all' },
    );

    // Add personalized genre categories
    if (affinityData && affinityData.length > 0) {
      affinityData.slice(0, 6).forEach((genre) => {
        const genreName = genre.genre_name || GENRE_NAMES[genre.genre_id] || 'Unknown';
        const emoji = GENRE_EMOJIS[genre.genre_id] || '✨';
        const isTvGenre = [10759, 10762, 10763, 10764, 10765, 10766, 10767, 10768].includes(genre.genre_id);

        categories.push({
          id: `genre-${genre.genre_id}`,
          title: `${emoji} ${genreName} For You`,
          endpoint: isTvGenre ? '/discover/tv' : '/discover/movie',
          mediaType: isTvGenre ? 'tv' : 'movie',
          params: {
            with_genres: String(genre.genre_id),
            sort_by: 'popularity.desc',
            'vote_average.gte': '6.5',
            'vote_count.gte': '100',
          },
        });
      });

      console.log('[ContentBrowse] Added', affinityData.slice(0, 6).length, 'personalized genre categories');
    }

    // Add more static categories
    categories.push(
      { id: 'popular-movies', title: '🎬 Popular Movies', endpoint: '/movie/popular', mediaType: 'movie' },
      {
        id: 'popular-tv',
        title: '📺 Popular TV Shows',
        endpoint: '/discover/tv',
        mediaType: 'tv',
        params: {
          sort_by: 'popularity.desc',
          'first_air_date.lte': getDateString(0),
          'vote_count.gte': '50',
        },
      },
      { id: 'top-rated-movies', title: '⭐ Top Rated Movies', endpoint: '/movie/top_rated', mediaType: 'movie' },
      { id: 'top-rated-tv', title: '⭐ Top Rated TV', endpoint: '/tv/top_rated', mediaType: 'tv' },
      { id: 'now-playing', title: '🎭 In Theaters Now', endpoint: '/movie/now_playing', mediaType: 'movie' },
      {
        id: 'upcoming',
        title: '🎟️ Coming Soon',
        endpoint: '/discover/movie',
        mediaType: 'movie',
        params: {
          'primary_release_date.gte': getDateString(1),
          'primary_release_date.lte': getDateString(180),
          'sort_by': 'primary_release_date.asc',
        },
      },
      { id: 'airing-today', title: '📡 Airing Today', endpoint: '/tv/airing_today', mediaType: 'tv' },
    );

    console.log('[ContentBrowse] Total categories:', categories.length);
    return categories;
  } catch (error) {
    console.error('[ContentBrowse] Error getting personalized categories:', error);
    return getDefaultCategories();
  }
};

/**
 * Get default categories when personalization is not available
 */
export const getDefaultCategories = (): ContentCategory[] => {
  console.log('[ContentBrowse] Using default categories');
  return [
    { id: 'trending', title: '🔥 Trending Today', endpoint: '/trending/all/day', mediaType: 'all' },
    { id: 'popular-movies', title: '🎬 Popular Movies', endpoint: '/movie/popular', mediaType: 'movie' },
    { id: 'popular-tv', title: '📺 Popular TV Shows', endpoint: '/tv/popular', mediaType: 'tv' },
    { id: 'upcoming', title: '🎟️ Coming Soon', endpoint: '/movie/upcoming', mediaType: 'movie' },
  ];
};

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
