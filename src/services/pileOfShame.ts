/**
 * Pile of Shame Service (Blindspot Algorithm)
 * "Oh by the way, you might like this that we have not recommended to you yet."
 *
 * Shows content the user WOULDN'T normally see:
 * - Unexplored genres
 * - Hidden gems
 * - Classic gaps
 * - Adjacent interests
 * - Service exclusives
 *
 * This is INTENTIONALLY different from main "For You" recommendations.
 */

import { supabase } from '@/config/supabase';
import {
  generateBlindspotRecommendations,
  getBlindspotIcon,
  getBlindspotLabel,
  type BlindspotItem,
  type BlindspotReason,
} from './blindspotRecommendations';

export interface ShameItem {
  id: number;
  title: string;
  type: 'movie' | 'tv';
  service: string;
  rating: number;
  voteCount: number;
  posterPath: string | null;
  overview: string;
  message: string; // This is now the blindspot pitch
  releaseYear: string;
  genres: string[];

  // Blindspot metadata
  blindspotReason: BlindspotReason;
  blindspotIcon: string;
  blindspotLabel: string;
}

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
 * Get user's "Pile of Shame" - content they wouldn't normally discover
 *
 * Uses the Blindspot Algorithm to surface:
 * - Unexplored genres
 * - Hidden gems (high rating, low popularity)
 * - Classic gaps (acclaimed older content)
 * - Adjacent interests (genres that fans of user's genres love)
 * - Service exclusives (content on user's services)
 */
export const getPileOfShame = async (userId: string): Promise<ShameItem[]> => {
  try {
    console.log('[PileOfShame] Generating blindspot recommendations for user:', userId);

    // Get blindspot recommendations
    const blindspots = await generateBlindspotRecommendations(userId, 12);

    if (blindspots.length === 0) {
      console.log('[PileOfShame] No blindspot recommendations found');
      return [];
    }

    // Get user's subscriptions for service attribution
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('service_name')
      .eq('user_id', userId)
      .eq('status', 'active');

    const defaultService = subscriptions?.[0]?.service_name || 'Streaming Services';

    // Transform blindspot items to ShameItem format
    const shameItems: ShameItem[] = blindspots.map(blindspot => ({
      id: blindspot.id,
      title: blindspot.title,
      type: blindspot.mediaType,
      service: blindspot.service || defaultService,
      rating: blindspot.rating,
      voteCount: blindspot.voteCount,
      posterPath: blindspot.posterPath,
      overview: blindspot.rawData?.overview || '',
      message: blindspot.pitch, // Use personalized pitch as message
      releaseYear: blindspot.releaseYear.toString(),
      genres: blindspot.genres
        .slice(0, 3)
        .map(genreId => getGenreName(genreId, blindspot.mediaType === 'tv')),

      // Blindspot metadata
      blindspotReason: blindspot.blindspotReason,
      blindspotIcon: getBlindspotIcon(blindspot.blindspotReason),
      blindspotLabel: getBlindspotLabel(blindspot.blindspotReason),
    }));

    console.log('[PileOfShame] Returning', shameItems.length, 'blindspot items');
    console.log('[PileOfShame] Breakdown by type:', {
      unexplored_genre: shameItems.filter(i => i.blindspotReason === 'unexplored_genre').length,
      hidden_gem: shameItems.filter(i => i.blindspotReason === 'hidden_gem').length,
      classic_gap: shameItems.filter(i => i.blindspotReason === 'classic_gap').length,
      adjacent_interest: shameItems.filter(i => i.blindspotReason === 'adjacent_interest').length,
      service_exclusive: shameItems.filter(i => i.blindspotReason === 'service_exclusive').length,
    });

    return shameItems;
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
  blindspotBreakdown: Record<BlindspotReason, number>;
}> => {
  const items = await getPileOfShame(userId);

  if (items.length === 0) {
    return {
      totalItems: 0,
      averageRating: 0,
      topGenres: [],
      blindspotBreakdown: {
        unexplored_genre: 0,
        hidden_gem: 0,
        classic_gap: 0,
        adjacent_interest: 0,
        service_exclusive: 0,
      },
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

  // Count blindspot types
  const blindspotBreakdown: Record<BlindspotReason, number> = {
    unexplored_genre: items.filter(i => i.blindspotReason === 'unexplored_genre').length,
    hidden_gem: items.filter(i => i.blindspotReason === 'hidden_gem').length,
    classic_gap: items.filter(i => i.blindspotReason === 'classic_gap').length,
    adjacent_interest: items.filter(i => i.blindspotReason === 'adjacent_interest').length,
    service_exclusive: items.filter(i => i.blindspotReason === 'service_exclusive').length,
  };

  return {
    totalItems: items.length,
    averageRating,
    topGenres,
    blindspotBreakdown,
  };
};
