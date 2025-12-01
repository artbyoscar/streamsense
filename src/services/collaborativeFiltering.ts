/**
 * Collaborative Filtering Service (Lite)
 * "Users like you also enjoyed..."
 *
 * Privacy-Conscious Implementation:
 * - Only uses public watchlist data
 * - No personal information shared
 * - Requires minimum overlap threshold
 * - Falls back gracefully with small user base
 *
 * Algorithm:
 * 1. Find users with similar watchlists (20%+ overlap)
 * 2. Aggregate popular items among similar users
 * 3. Recommend items this user hasn't seen yet
 */

import { supabase } from '@/config/supabase';

export interface CollaborativeRecommendation {
  id: number;
  title: string;
  mediaType: 'movie' | 'tv';
  genreIds: number[];
  rating: number;
  popularityScore: number;  // How many similar users have it
  confidence: number;       // 0-1, based on similar user count
}

export interface SimilarUserProfile {
  userId: string;
  overlapCount: number;
  overlapRatio: number;
  totalWatchlistSize: number;
}

// Configuration
export const COLLAB_CONFIG = {
  MIN_OVERLAP_RATIO: 0.15,        // 15% watchlist overlap minimum
  MIN_OVERLAP_COUNT: 3,           // At least 3 shared items
  MIN_SIMILAR_USERS: 2,           // Need at least 2 similar users
  MIN_RECOMMENDATIONS_FROM: 2,    // Item must be in 2+ similar users' watchlists
  MAX_SIMILAR_USERS: 50,          // Cap for performance
} as const;

/**
 * Find users with similar watchlists
 *
 * @param userId - Current user ID
 * @returns Array of similar user profiles
 */
export const findSimilarUsers = async (
  userId: string
): Promise<SimilarUserProfile[]> => {
  try {
    // Get current user's watchlist (JOIN with content table to get tmdb_id)
    const { data: userWatchlist, error: watchlistError } = await supabase
      .from('watchlist_items')
      .select('content(tmdb_id)')
      .eq('user_id', userId);

    if (watchlistError) throw watchlistError;
    if (!userWatchlist || userWatchlist.length < COLLAB_CONFIG.MIN_OVERLAP_COUNT) {
      console.log('[Collab] User watchlist too small for collaborative filtering');
      return [];
    }

    const userWatchlistIds = new Set(
      userWatchlist
        .filter(w => w.content)
        .map(w => (w.content as any).tmdb_id)
    );
    const userWatchlistSize = userWatchlistIds.size;

    // Get all other users' watchlists (JOIN with content table to get tmdb_id)
    const { data: otherUsersWatchlists, error: othersError } = await supabase
      .from('watchlist_items')
      .select('user_id, content(tmdb_id)')
      .neq('user_id', userId); // Exclude current user

    if (othersError) throw othersError;
    if (!otherUsersWatchlists || otherUsersWatchlists.length === 0) {
      console.log('[Collab] No other users found for collaborative filtering');
      return [];
    }

    // Group by user
    const userWatchlistsMap = new Map<string, Set<number>>();
    otherUsersWatchlists.forEach(item => {
      if (item.content) { // Only process items with content
        if (!userWatchlistsMap.has(item.user_id)) {
          userWatchlistsMap.set(item.user_id, new Set());
        }
        userWatchlistsMap.get(item.user_id)!.add((item.content as any).tmdb_id);
      }
    });

    // Calculate overlap with each user
    const similarUsers: SimilarUserProfile[] = [];
    userWatchlistsMap.forEach((otherWatchlist, otherUserId) => {
      // Calculate intersection
      const overlap = Array.from(userWatchlistIds).filter(id => otherWatchlist.has(id));
      const overlapCount = overlap.length;

      // Calculate overlap ratio (Jaccard similarity)
      const union = new Set([...userWatchlistIds, ...otherWatchlist]);
      const overlapRatio = overlapCount / union.size;

      // Check if meets threshold
      if (
        overlapCount >= COLLAB_CONFIG.MIN_OVERLAP_COUNT &&
        overlapRatio >= COLLAB_CONFIG.MIN_OVERLAP_RATIO
      ) {
        similarUsers.push({
          userId: otherUserId,
          overlapCount,
          overlapRatio: Math.round(overlapRatio * 100) / 100,
          totalWatchlistSize: otherWatchlist.size,
        });
      }
    });

    // Sort by overlap ratio (descending)
    similarUsers.sort((a, b) => b.overlapRatio - a.overlapRatio);

    // Limit to top N similar users
    const topSimilarUsers = similarUsers.slice(0, COLLAB_CONFIG.MAX_SIMILAR_USERS);

    console.log('[Collab] Found', topSimilarUsers.length, 'similar users');
    if (topSimilarUsers.length > 0) {
      console.log('[Collab] Top 3 similar users:', topSimilarUsers.slice(0, 3).map(u => ({
        overlap: u.overlapCount,
        ratio: `${(u.overlapRatio * 100).toFixed(1)}%`,
      })));
    }

    return topSimilarUsers;
  } catch (error) {
    console.error('[Collab] Error finding similar users:', error);
    return [];
  }
};

/**
 * Get collaborative filtering recommendations
 *
 * @param userId - Current user ID
 * @param limit - Maximum number of recommendations to return
 * @returns Recommendations based on similar users' watchlists
 */
export const getCollaborativeRecommendations = async (
  userId: string,
  limit: number = 20
): Promise<CollaborativeRecommendation[]> => {
  try {
    // Find similar users
    const similarUsers = await findSimilarUsers(userId);

    if (similarUsers.length < COLLAB_CONFIG.MIN_SIMILAR_USERS) {
      console.log('[Collab] Not enough similar users for recommendations');
      return [];
    }

    // Get current user's watchlist (to exclude)
    const { data: userWatchlist, error: watchlistError } = await supabase
      .from('watchlist_items')
      .select('content(tmdb_id)')
      .eq('user_id', userId);

    if (watchlistError) throw watchlistError;

    const userWatchlistIds = new Set(
      (userWatchlist || [])
        .filter(w => w.content)
        .map(w => (w.content as any).tmdb_id)
    );

    // Get watchlist items from similar users
    const similarUserIds = similarUsers.map(u => u.userId);
    const { data: similarUsersItems, error: itemsError } = await supabase
      .from('watchlist_items')
      .select('content(tmdb_id, title, type, genres, vote_average)')
      .in('user_id', similarUserIds);

    if (itemsError) throw itemsError;
    if (!similarUsersItems || similarUsersItems.length === 0) {
      return [];
    }

    // Count how many similar users have each item
    const itemCounts = new Map<number, {
      count: number;
      title: string;
      mediaType: 'movie' | 'tv';
      genres: number[];
      rating: number;
    }>();

    similarUsersItems.forEach(item => {
      if (!item.content) return; // Skip items without content

      const content = item.content as any;

      // Skip if current user already has this
      if (userWatchlistIds.has(content.tmdb_id)) {
        return;
      }

      if (itemCounts.has(content.tmdb_id)) {
        itemCounts.get(content.tmdb_id)!.count++;
      } else {
        itemCounts.set(content.tmdb_id, {
          count: 1,
          title: content.title || 'Unknown',
          mediaType: content.type as 'movie' | 'tv' || 'movie',
          genres: content.genres || [],
          rating: content.vote_average || 0,
        });
      }
    });

    // Filter to items recommended by multiple similar users
    const recommendations: CollaborativeRecommendation[] = [];
    itemCounts.forEach((data, tmdbId) => {
      if (data.count >= COLLAB_CONFIG.MIN_RECOMMENDATIONS_FROM) {
        recommendations.push({
          id: tmdbId,
          title: data.title,
          mediaType: data.mediaType,
          genreIds: data.genres,
          rating: data.rating,
          popularityScore: data.count,
          confidence: Math.min(data.count / similarUsers.length, 1.0),
        });
      }
    });

    // Sort by popularity score (descending)
    recommendations.sort((a, b) => b.popularityScore - a.popularityScore);

    console.log('[Collab] Generated', recommendations.length, 'collaborative recommendations');
    console.log('[Collab] Top 3:', recommendations.slice(0, 3).map(r => ({
      title: r.title,
      popularity: r.popularityScore,
      confidence: `${(r.confidence * 100).toFixed(0)}%`,
    })));

    return recommendations.slice(0, limit);
  } catch (error) {
    console.error('[Collab] Error getting collaborative recommendations:', error);
    return [];
  }
};

/**
 * Mix collaborative recommendations with regular recommendations
 *
 * @param userId - User ID
 * @param regularRecs - Regular recommendations
 * @param collabRatio - Ratio of collaborative recs to inject (0-1)
 * @returns Mixed recommendations
 */
export const mixCollaborativeRecommendations = async (
  userId: string,
  regularRecs: any[],
  collabRatio: number = 0.3 // 30% collaborative by default
): Promise<any[]> => {
  try {
    const collabRecs = await getCollaborativeRecommendations(userId, Math.ceil(regularRecs.length * collabRatio));

    if (collabRecs.length === 0) {
      // Not enough data for collaborative filtering, return regular recs
      return regularRecs;
    }

    // Create set of collab IDs for quick lookup
    const collabIds = new Set(collabRecs.map(r => r.id));

    // Remove collab items from regular recs to avoid duplicates
    const regularRecsFiltered = regularRecs.filter(r => !collabIds.has(r.id));

    // Interleave collaborative and regular recommendations
    const mixed: any[] = [];
    const collabInterval = Math.floor(regularRecsFiltered.length / collabRecs.length);

    let collabIndex = 0;
    regularRecsFiltered.forEach((rec, index) => {
      // Add regular rec
      mixed.push(rec);

      // Interleave collab rec at intervals
      if (
        collabIndex < collabRecs.length &&
        (index + 1) % collabInterval === 0
      ) {
        mixed.push(collabRecs[collabIndex]);
        collabIndex++;
      }
    });

    // Add any remaining collab recs at the end
    while (collabIndex < collabRecs.length) {
      mixed.push(collabRecs[collabIndex]);
      collabIndex++;
    }

    console.log('[Collab] Mixed recommendations:', {
      regular: regularRecsFiltered.length,
      collaborative: collabRecs.length,
      total: mixed.length,
    });

    return mixed;
  } catch (error) {
    console.error('[Collab] Error mixing collaborative recommendations:', error);
    return regularRecs; // Fallback to regular recs
  }
};

/**
 * Get analytics about collaborative filtering effectiveness
 */
export const getCollaborativeAnalytics = async (userId: string) => {
  try {
    const similarUsers = await findSimilarUsers(userId);

    if (similarUsers.length === 0) {
      return {
        enabled: false,
        reason: 'No similar users found',
        userWatchlistSize: 0,
        similarUserCount: 0,
      };
    }

    const { data: userWatchlist } = await supabase
      .from('watchlist_items')
      .select('id')
      .eq('user_id', userId);

    return {
      enabled: similarUsers.length >= COLLAB_CONFIG.MIN_SIMILAR_USERS,
      userWatchlistSize: userWatchlist?.length || 0,
      similarUserCount: similarUsers.length,
      avgOverlapRatio: similarUsers.reduce((sum, u) => sum + u.overlapRatio, 0) / similarUsers.length,
      topSimilarUsers: similarUsers.slice(0, 5).map(u => ({
        overlapCount: u.overlapCount,
        overlapRatio: `${(u.overlapRatio * 100).toFixed(1)}%`,
        watchlistSize: u.totalWatchlistSize,
      })),
    };
  } catch (error) {
    console.error('[Collab] Error getting analytics:', error);
    return null;
  }
};
