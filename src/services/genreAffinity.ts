/**
 * Genre Affinity Service
 * Tracks user preferences for movie/TV genres based on their interactions
 *
 * Features:
 * - Temporal Decay: Recent interactions matter more than old ones
 * - Half-life of 30 days: Affinity scores halve every 30 days without interaction
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

// Temporal decay configuration
export const DECAY_CONFIG = {
  HALF_LIFE_DAYS: 30, // Score halves every 30 days of inactivity
  MIN_SCORE: 0.1,     // Minimum effective score (prevent complete decay)
} as const;

export interface GenreAffinityWithDecay {
  genreId: number;
  genreName: string;
  rawScore: number;
  lastInteractionAt: Date;
  daysSinceInteraction: number;
  decayFactor: number;
  effectiveScore: number;
}

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
 * Calculate temporal decay factor for a genre based on last interaction
 * Uses exponential decay with configurable half-life
 *
 * @param lastInteractionAt - When user last interacted with this genre
 * @returns Decay factor between 0 and 1
 */
export const calculateDecayFactor = (lastInteractionAt: Date): number => {
  const now = new Date();
  const daysSinceInteraction = Math.floor(
    (now.getTime() - lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Exponential decay: score * 0.5^(days / half_life)
  const decayFactor = Math.pow(0.5, daysSinceInteraction / DECAY_CONFIG.HALF_LIFE_DAYS);

  // Ensure minimum score to prevent complete decay
  return Math.max(decayFactor, DECAY_CONFIG.MIN_SCORE);
};

/**
 * Calculate effective affinity score with temporal decay applied
 *
 * @param rawScore - Original affinity score from database
 * @param lastInteractionAt - When user last interacted with this genre
 * @returns Decayed effective score
 */
export const calculateEffectiveScore = (
  rawScore: number,
  lastInteractionAt: Date
): number => {
  const decayFactor = calculateDecayFactor(lastInteractionAt);
  return rawScore * decayFactor;
};

/**
 * Get user's top genres by affinity score (with temporal decay)
 *
 * @param userId - User ID
 * @param limit - Number of genres to return
 * @param useDecay - Whether to apply temporal decay (default: true)
 * @returns Top genres sorted by effective score
 */
export const getUserTopGenres = async (
  userId: string,
  limit: number = 5,
  useDecay: boolean = true
): Promise<{ genreId: number; genreName: string; score: number }[]> => {
  try {
    const { data, error } = await supabase
      .from('user_genre_affinity')
      .select('genre_id, genre_name, affinity_score, last_interaction_at')
      .eq('user_id', userId)
      .gt('affinity_score', 0)
      .order('affinity_score', { ascending: false });

    if (error) throw error;

    const genres = (data || []).map(row => {
      const lastInteraction = new Date(row.last_interaction_at);
      const effectiveScore = useDecay
        ? calculateEffectiveScore(row.affinity_score, lastInteraction)
        : row.affinity_score;

      return {
        genreId: row.genre_id,
        genreName: row.genre_name,
        score: effectiveScore,
      };
    });

    // Re-sort by effective score (may have changed due to decay)
    return genres
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error('[GenreAffinity] Error fetching top genres:', error);
    return [];
  }
};

/**
 * Get detailed genre affinity with decay metrics (for debugging/analytics)
 *
 * @param userId - User ID
 * @param limit - Number of genres to return
 * @returns Genre affinity with full decay breakdown
 */
export const getUserTopGenresWithDecayMetrics = async (
  userId: string,
  limit: number = 5
): Promise<GenreAffinityWithDecay[]> => {
  try {
    const { data, error } = await supabase
      .from('user_genre_affinity')
      .select('genre_id, genre_name, affinity_score, last_interaction_at')
      .eq('user_id', userId)
      .gt('affinity_score', 0)
      .order('affinity_score', { ascending: false });

    if (error) throw error;

    const now = new Date();
    const genres: GenreAffinityWithDecay[] = (data || []).map(row => {
      const lastInteraction = new Date(row.last_interaction_at);
      const daysSinceInteraction = Math.floor(
        (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
      );
      const decayFactor = calculateDecayFactor(lastInteraction);
      const effectiveScore = row.affinity_score * decayFactor;

      return {
        genreId: row.genre_id,
        genreName: row.genre_name,
        rawScore: row.affinity_score,
        lastInteractionAt: lastInteraction,
        daysSinceInteraction,
        decayFactor,
        effectiveScore,
      };
    });

    // Sort by effective score
    return genres
      .sort((a, b) => b.effectiveScore - a.effectiveScore)
      .slice(0, limit);
  } catch (error) {
    console.error('[GenreAffinity] Error fetching genre metrics:', error);
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
