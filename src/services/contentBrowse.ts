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

// Comprehensive genre mappings with keywords
const GENRE_INFO: Record<number, { name: string; emoji: string; keywords: string[] }> = {
  28: { name: 'Action', emoji: '💥', keywords: ['explosive', 'thrilling'] },
  12: { name: 'Adventure', emoji: '🗺️', keywords: ['epic', 'journey'] },
  16: { name: 'Animation', emoji: '🎨', keywords: ['animated', 'cartoon'] },
  35: { name: 'Comedy', emoji: '😂', keywords: ['funny', 'hilarious'] },
  80: { name: 'Crime', emoji: '🔪', keywords: ['criminal', 'heist'] },
  99: { name: 'Documentary', emoji: '📹', keywords: ['real', 'true story'] },
  18: { name: 'Drama', emoji: '🎭', keywords: ['emotional', 'powerful'] },
  10751: { name: 'Family', emoji: '👨‍👩‍👧', keywords: ['wholesome', 'kids'] },
  14: { name: 'Fantasy', emoji: '🧙', keywords: ['magical', 'mythical'] },
  36: { name: 'History', emoji: '📜', keywords: ['historical', 'period'] },
  27: { name: 'Horror', emoji: '👻', keywords: ['scary', 'terrifying'] },
  10402: { name: 'Music', emoji: '🎵', keywords: ['musical', 'songs'] },
  9648: { name: 'Mystery', emoji: '🔍', keywords: ['suspenseful', 'whodunit'] },
  10749: { name: 'Romance', emoji: '💕', keywords: ['love', 'romantic'] },
  878: { name: 'Science Fiction', emoji: '🚀', keywords: ['futuristic', 'space'] },
  53: { name: 'Thriller', emoji: '😰', keywords: ['suspense', 'tension'] },
  10752: { name: 'War', emoji: '⚔️', keywords: ['military', 'battle'] },
  37: { name: 'Western', emoji: '🤠', keywords: ['cowboy', 'frontier'] },
  10759: { name: 'Action & Adventure', emoji: '💥', keywords: ['action-packed'] },
  10762: { name: 'Kids', emoji: '👶', keywords: ['children', 'young'] },
  10765: { name: 'Sci-Fi & Fantasy', emoji: '🛸', keywords: ['otherworldly'] },
  10768: { name: 'War & Politics', emoji: '🏛️', keywords: ['political'] },
};

// Legacy mappings for compatibility
const GENRE_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(GENRE_INFO).map(([id, info]) => [id, info.name])
);

const GENRE_EMOJIS: Record<number, string> = Object.fromEntries(
  Object.entries(GENRE_INFO).map(([id, info]) => [id, info.emoji])
);

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
 * Netflix-level personalization with mood-based and niche categories
 */
export const getPersonalizedCategories = async (userId: string): Promise<ContentCategory[]> => {
  const categories: ContentCategory[] = [];

  try {
    console.log('[ContentBrowse] Getting personalized categories for user:', userId);

    // Get user's genre affinity
    const { data: affinityData } = await supabase
      .from('user_genre_affinity')
      .select('genre_id, genre_name, affinity_score')
      .eq('user_id', userId)
      .order('affinity_score', { ascending: false })
      .limit(15);

    // Get user's watchlist stats for smarter recommendations
    const { data: watchlistStats } = await supabase
      .from('watchlist_items')
      .select('content_type, rating, status')
      .eq('user_id', userId);

    const highRatedCount = watchlistStats?.filter(w => (w.rating || 0) >= 4).length || 0;
    const watchedCount = watchlistStats?.filter(w => w.status === 'watched').length || 0;
    const movieCount = watchlistStats?.filter(w => w.content_type === 'movie').length || 0;
    const tvCount = watchlistStats?.filter(w => w.content_type === 'tv').length || 0;

    console.log('[ContentBrowse] Watchlist stats:', { highRatedCount, watchedCount, movieCount, tvCount });

    // 1. Trending (always first)
    categories.push({
      id: 'trending',
      title: '🔥 Trending Today',
      endpoint: '/trending/all/day',
      mediaType: 'all',
    });

    // 2. Personalized genre categories (top 4 genres)
    if (affinityData && affinityData.length > 0) {
      console.log('[ContentBrowse] Found', affinityData.length, 'genres in affinity table');

      const topGenres = affinityData.slice(0, 4);
      for (const genre of topGenres) {
        const genreInfo = GENRE_INFO[genre.genre_id];
        if (!genreInfo) continue;

        const isTvGenre = [10759, 10762, 10763, 10764, 10765, 10766, 10767, 10768].includes(genre.genre_id);

        categories.push({
          id: `genre-${genre.genre_id}`,
          title: `${genreInfo.emoji} ${genreInfo.name} For You`,
          endpoint: isTvGenre ? '/discover/tv' : '/discover/movie',
          mediaType: isTvGenre ? 'tv' : 'movie',
          params: {
            with_genres: String(genre.genre_id),
            sort_by: 'popularity.desc',
            'vote_average.gte': '6.5',
            'vote_count.gte': '100',
          },
        });
      }
    }

    // 3. "Because You Watched" style categories based on high-rated content
    if (highRatedCount >= 3) {
      categories.push({
        id: 'highly-rated-similar',
        title: '⭐ Because You Love Quality',
        endpoint: '/discover/movie',
        mediaType: 'movie',
        params: {
          sort_by: 'vote_average.desc',
          'vote_count.gte': '1000',
          'vote_average.gte': '7.5',
        },
      });
    }

    // 4. Hidden Gems - less popular but high quality
    categories.push({
      id: 'hidden-gems',
      title: '💎 Hidden Gems',
      endpoint: '/discover/movie',
      mediaType: 'movie',
      params: {
        sort_by: 'vote_average.desc',
        'vote_count.gte': '100',
        'vote_count.lte': '1000',
        'vote_average.gte': '7.5',
      },
    });

    // 5. Popular Movies
    categories.push({
      id: 'popular-movies',
      title: '🎬 Popular Movies',
      endpoint: '/movie/popular',
      mediaType: 'movie',
    });

    // 6. Binge-Worthy TV (if user watches TV)
    if (tvCount >= 3 || tvCount >= movieCount * 0.3) {
      categories.push({
        id: 'binge-worthy',
        title: '📺 Binge-Worthy Series',
        endpoint: '/discover/tv',
        mediaType: 'tv',
        params: {
          sort_by: 'popularity.desc',
          'vote_average.gte': '7.5',
          'vote_count.gte': '500',
        },
      });
    }

    // 7. Top Rated Movies
    categories.push({
      id: 'top-rated',
      title: '⭐ Top Rated',
      endpoint: '/movie/top_rated',
      mediaType: 'movie',
    });

    // 8. Award Winners / Critically Acclaimed
    categories.push({
      id: 'critically-acclaimed',
      title: '🏆 Critically Acclaimed',
      endpoint: '/discover/movie',
      mediaType: 'movie',
      params: {
        sort_by: 'vote_average.desc',
        'vote_count.gte': '2000',
        'vote_average.gte': '8.0',
      },
    });

    // 9. In Theaters Now
    categories.push({
      id: 'now-playing',
      title: '🎭 In Theaters Now',
      endpoint: '/movie/now_playing',
      mediaType: 'movie',
    });

    // 10. Coming Soon
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 180);

    categories.push({
      id: 'coming-soon',
      title: '🎟️ Coming Soon',
      endpoint: '/discover/movie',
      mediaType: 'movie',
      params: {
        'primary_release_date.gte': tomorrow.toISOString().split('T')[0],
        'primary_release_date.lte': futureDate.toISOString().split('T')[0],
        sort_by: 'primary_release_date.asc',
      },
    });

    // 11. Airing Today (TV)
    categories.push({
      id: 'airing-today',
      title: '📡 Airing Today',
      endpoint: '/tv/airing_today',
      mediaType: 'tv',
    });

    // 12. Mood-based categories based on user's top genres
    if (affinityData && affinityData.length > 0) {
      const topGenreIds = affinityData.slice(0, 3).map(g => g.genre_id);

      // Feel-Good (if they like comedy or family)
      if (topGenreIds.includes(35) || topGenreIds.includes(10751)) {
        categories.push({
          id: 'feel-good',
          title: '😊 Feel-Good Picks',
          endpoint: '/discover/movie',
          mediaType: 'movie',
          params: {
            with_genres: '35,10751',
            sort_by: 'popularity.desc',
            'vote_average.gte': '6.5',
          },
        });
      }

      // Edge of Your Seat (if they like thriller or horror)
      if (topGenreIds.includes(53) || topGenreIds.includes(27)) {
        categories.push({
          id: 'edge-of-seat',
          title: '😱 Edge of Your Seat',
          endpoint: '/discover/movie',
          mediaType: 'movie',
          params: {
            with_genres: '53,27',
            sort_by: 'popularity.desc',
            'vote_average.gte': '6.5',
          },
        });
      }

      // Epic Adventures (if they like action or adventure)
      if (topGenreIds.includes(28) || topGenreIds.includes(12)) {
        categories.push({
          id: 'epic-adventures',
          title: '🗡️ Epic Adventures',
          endpoint: '/discover/movie',
          mediaType: 'movie',
          params: {
            with_genres: '28,12',
            sort_by: 'popularity.desc',
            'vote_average.gte': '7.0',
            'vote_count.gte': '1000',
          },
        });
      }

      // Mind-Bending (if they like sci-fi or mystery)
      if (topGenreIds.includes(878) || topGenreIds.includes(9648)) {
        categories.push({
          id: 'mind-bending',
          title: '🧠 Mind-Bending',
          endpoint: '/discover/movie',
          mediaType: 'movie',
          params: {
            with_genres: '878,9648',
            sort_by: 'vote_average.desc',
            'vote_average.gte': '7.0',
            'vote_count.gte': '500',
          },
        });
      }
    }

    // 13. Classic Movies
    categories.push({
      id: 'classics',
      title: '📽️ Classic Cinema',
      endpoint: '/discover/movie',
      mediaType: 'movie',
      params: {
        'primary_release_date.lte': '1999-12-31',
        sort_by: 'vote_average.desc',
        'vote_count.gte': '1000',
        'vote_average.gte': '7.5',
      },
    });

    // 14. International Cinema
    categories.push({
      id: 'international',
      title: '🌍 International Cinema',
      endpoint: '/discover/movie',
      mediaType: 'movie',
      params: {
        with_original_language: 'ko|ja|fr|es|de|it',
        sort_by: 'popularity.desc',
        'vote_average.gte': '7.0',
        'vote_count.gte': '100',
      },
    });

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

export const fetchCategoryContent = async (
  category: ContentCategory,
  providerIds?: number[]
): Promise<UnifiedContent[]> => {
  console.log('[ContentBrowse] Fetching category:', category.title);
  console.log('[ContentBrowse] tmdbApi exists:', !!tmdbApi);
  console.log('[ContentBrowse] Provider IDs:', providerIds);

  try {
    // Build params - start with category params
    const params: Record<string, any> = { ...(category.params || {}) };

    // Add provider filtering for discover endpoints (TMDb only supports this for /discover)
    if (providerIds && providerIds.length > 0 && category.endpoint.includes('/discover/')) {
      params['watch_region'] = 'US';
      params['with_watch_providers'] = providerIds.join('|');
      console.log('[ContentBrowse] Adding provider filter:', params['with_watch_providers']);
    }

    // Include params if provided
    const response = await tmdbApi.get(category.endpoint, {
      params,
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

export const fetchMultipleCategories = async (
  categories: ContentCategory[],
  providerIds?: number[]
): Promise<Map<string, UnifiedContent[]>> => {
  const results = new Map<string, UnifiedContent[]>();

  await Promise.all(
    categories.map(async (category) => {
      const content = await fetchCategoryContent(category, providerIds);
      results.set(category.id, content);
    })
  );

  return results;
};
