/**
 * Genre Affinity Service
 * Tracks user preferences for movie/TV genres based on their interactions
 */

import { supabase } from '@/config/supabase';
import { getGenreName } from '@/constants/genres';

// Score weights for different actions
export const AFFINITY_WEIGHTS = {
  ADD_TO_WATCHLIST: 1,
  START_WATCHING: 2,
  COMPLETE_WATCHING: 3,
  RATE_HIGH: 2,      // 4-5 stars
  RATE_LOW: -1,      // 1-2 stars
  REMOVE_FROM_WATCHLIST: -0.5,
} as const;

export type AffinityAction = keyof typeof AFFINITY_WEIGHTS;

/**
 * Track genre interaction for affinity scoring
 */
export const trackGenreInteraction = async (
  userId: string,
  genreIds: number[],
  mediaType: 'movie' | 'tv',
  action: AffinityAction
): Promise<void> => {
  if (!userId || !genreIds || genreIds.length === 0) {
    console.log('[GenreAffinity] Skipping - missing userId or genreIds');
    return;
  }

  const scoreDelta = AFFINITY_WEIGHTS[action];
  console.log(`[GenreAffinity] Tracking ${action} for genres:`, genreIds);

  try {
    await Promise.all(
      genreIds.map(genreId =>
        supabase.rpc('update_genre_affinity', {
          p_user_id: userId,
          p_genre_id: genreId,
          p_genre_name: getGenreName(genreId, mediaType),
          p_score_delta: scoreDelta,
        })
      )
    );
    console.log('[GenreAffinity] Successfully updated affinity scores');
  } catch (error) {
    console.error('[GenreAffinity] Error tracking genre affinity:', error);
  }
};

/**
 * Get user's top genres by affinity score
 */
export const getUserTopGenres = async (
  userId: string,
  limit: number = 5
): Promise<{ genreId: number; genreName: string; score: number }[]> => {
  try {
    const { data, error } = await supabase
      .from('user_genre_affinity')
      .select('genre_id, genre_name, affinity_score')
      .eq('user_id', userId)
      .gt('affinity_score', 0)
      .order('affinity_score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(row => ({
      genreId: row.genre_id,
      genreName: row.genre_name,
      score: row.affinity_score,
    }));
  } catch (error) {
    console.error('[GenreAffinity] Error fetching top genres:', error);
    return [];
  }
};

/**
 * Get complete genre affinity profile for user
 */
export const getGenreAffinityProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_genre_affinity')
      .select('*')
      .eq('user_id', userId)
      .order('affinity_score', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[GenreAffinity] Error fetching affinity profile:', error);
    return [];
  }
};
