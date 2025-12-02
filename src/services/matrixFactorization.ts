/**
 * Matrix Factorization Service
 * Netflix-style SVD (Singular Value Decomposition) for collaborative filtering
 *
 * This implements personalized recommendations by:
 * 1. Building a user-item interaction matrix from watchlist data
 * 2. Decomposing it using SVD into User factors × Item factors
 * 3. Predicting ratings for unseen content
 * 4. Caching results in Supabase for fast lookups
 */

import { Matrix, SingularValueDecomposition } from 'ml-matrix';
import { supabase } from '@/config/supabase';

/**
 * User interaction with content
 * Ratings derived from watchlist status:
 * - watched: 5.0 (loved it, finished it)
 * - watching: 4.0 (currently enjoying)
 * - want_to_watch: 3.0 (interested)
 * - hidden: 1.0 (not interested)
 */
export interface UserInteraction {
  userId: string;
  tmdbId: number;
  rating: number;
  timestamp: Date;
}

/**
 * Predicted recommendation
 */
export interface Prediction {
  tmdbId: number;
  predictedRating: number;
  confidence: number;
}

/**
 * Convert watchlist status to rating
 */
const statusToRating = (status: string): number => {
  switch (status) {
    case 'watched':
      return 5.0;
    case 'watching':
      return 4.0;
    case 'want_to_watch':
      return 3.0;
    case 'hidden':
      return 1.0;
    default:
      return 3.0;
  }
};

/**
 * Fetch all user interactions from database
 */
export const getUserInteractions = async (): Promise<UserInteraction[]> => {
  console.log('[SVD] Fetching user interactions from database...');

  const { data, error } = await supabase
    .from('watchlist_items')
    .select(`
      user_id,
      content!inner(tmdb_id),
      status,
      created_at
    `);

  if (error) {
    console.error('[SVD] Error fetching interactions:', error);
    throw error;
  }

  const interactions: UserInteraction[] = data
    .filter(item => item.content && (item.content as any).tmdb_id)
    .map(item => ({
      userId: item.user_id,
      tmdbId: (item.content as any).tmdb_id,
      rating: statusToRating(item.status),
      timestamp: new Date(item.created_at),
    }));

  console.log(`[SVD] Loaded ${interactions.length} user interactions`);
  return interactions;
};

/**
 * Build user-item interaction matrix
 * Rows = users, Columns = items, Values = ratings
 */
export const buildInteractionMatrix = (
  interactions: UserInteraction[]
): {
  matrix: Matrix;
  userIds: string[];
  itemIds: number[];
  userIndexMap: Map<string, number>;
  itemIndexMap: Map<number, number>;
} => {
  console.log('[SVD] Building interaction matrix...');

  // Get unique users and items
  const userSet = new Set(interactions.map(i => i.userId));
  const itemSet = new Set(interactions.map(i => i.tmdbId));

  const userIds = Array.from(userSet);
  const itemIds = Array.from(itemSet);

  console.log(`[SVD] Matrix dimensions: ${userIds.length} users × ${itemIds.length} items`);

  // Create index maps for O(1) lookup
  const userIndexMap = new Map(userIds.map((id, idx) => [id, idx]));
  const itemIndexMap = new Map(itemIds.map((id, idx) => [id, idx]));

  // Initialize matrix with zeros (missing values)
  const matrixData: number[][] = Array(userIds.length)
    .fill(0)
    .map(() => Array(itemIds.length).fill(0));

  // Fill matrix with ratings
  let filledCells = 0;
  interactions.forEach(interaction => {
    const userIdx = userIndexMap.get(interaction.userId);
    const itemIdx = itemIndexMap.get(interaction.tmdbId);

    if (userIdx !== undefined && itemIdx !== undefined) {
      matrixData[userIdx][itemIdx] = interaction.rating;
      filledCells++;
    }
  });

  const sparsity = (1 - filledCells / (userIds.length * itemIds.length)) * 100;
  console.log(`[SVD] Matrix sparsity: ${sparsity.toFixed(2)}% (${filledCells} filled cells)`);

  const matrix = new Matrix(matrixData);

  return {
    matrix,
    userIds,
    itemIds,
    userIndexMap,
    itemIndexMap,
  };
};

/**
 * Perform SVD matrix factorization
 * Decomposes matrix R into U × S × V^T
 *
 * @param matrix User-item interaction matrix
 * @param nFactors Number of latent factors (default: 50)
 * @returns SVD decomposition
 */
export const performSVD = (
  matrix: Matrix,
  nFactors: number = 50
): {
  U: Matrix;
  S: number[];
  V: Matrix;
  reducedRank: number;
} => {
  console.log(`[SVD] Performing SVD with ${nFactors} latent factors...`);
  const startTime = Date.now();

  // Perform SVD decomposition
  const svd = new SingularValueDecomposition(matrix, {
    computeLeftSingularVectors: true,
    computeRightSingularVectors: true,
    autoTranspose: true,
  });

  // Get matrices
  const U = svd.leftSingularVectors; // User factors (users × factors)
  const S = svd.diagonal; // Singular values
  const V = svd.rightSingularVectors; // Item factors (items × factors)

  // Reduce to k factors for efficiency
  const k = Math.min(nFactors, S.length);
  console.log(`[SVD] Reducing to ${k} factors (${S.length} available)`);

  // Truncate matrices to k dimensions
  const Uk = U.subMatrix(0, U.rows - 1, 0, k - 1);
  const Sk = S.slice(0, k);
  const Vk = V.subMatrix(0, V.rows - 1, 0, k - 1);

  const elapsed = Date.now() - startTime;
  console.log(`[SVD] SVD completed in ${elapsed}ms`);
  console.log(`[SVD] Singular values (top 10):`, Sk.slice(0, 10).map(v => v.toFixed(2)));

  return {
    U: Uk,
    S: Sk,
    V: Vk,
    reducedRank: k,
  };
};

/**
 * Predict rating for a specific user-item pair
 */
export const predictRating = (
  userId: string,
  itemId: number,
  U: Matrix,
  S: number[],
  V: Matrix,
  userIndexMap: Map<string, number>,
  itemIndexMap: Map<number, number>
): number | null => {
  const userIdx = userIndexMap.get(userId);
  const itemIdx = itemIndexMap.get(itemId);

  if (userIdx === undefined || itemIdx === undefined) {
    return null;
  }

  // Reconstruct rating: user_vector × S × item_vector^T
  const userVector = U.getRow(userIdx);
  const itemVector = V.getRow(itemIdx);

  let prediction = 0;
  for (let k = 0; k < S.length; k++) {
    prediction += userVector[k] * S[k] * itemVector[k];
  }

  // Clamp to rating scale [1, 5]
  return Math.max(1, Math.min(5, prediction));
};

/**
 * Get top N recommendations for a user
 */
export const getRecommendationsForUser = (
  userId: string,
  candidateItems: number[],
  U: Matrix,
  S: number[],
  V: Matrix,
  userIndexMap: Map<string, number>,
  itemIndexMap: Map<number, number>,
  topN: number = 20
): Prediction[] => {
  console.log(`[SVD] Generating recommendations for user ${userId}...`);

  const predictions: Prediction[] = [];

  candidateItems.forEach(itemId => {
    const rating = predictRating(userId, itemId, U, S, V, userIndexMap, itemIndexMap);

    if (rating !== null) {
      // Calculate confidence based on item popularity and singular values
      // Higher singular values = more confident predictions
      const itemIdx = itemIndexMap.get(itemId);
      let confidence = 0.5;

      if (itemIdx !== undefined) {
        const itemVector = V.getRow(itemIdx);
        // Confidence is weighted by how much the item aligns with top factors
        const weightedSum = itemVector.reduce((sum, val, idx) => sum + Math.abs(val) * S[idx], 0);
        const maxPossible = S.reduce((sum, val) => sum + val, 0);
        confidence = weightedSum / maxPossible;
      }

      predictions.push({
        tmdbId: itemId,
        predictedRating: rating,
        confidence: Math.max(0, Math.min(1, confidence)),
      });
    }
  });

  // Sort by predicted rating (descending)
  predictions.sort((a, b) => b.predictedRating - a.predictedRating);

  console.log(`[SVD] Generated ${predictions.length} predictions, returning top ${topN}`);

  return predictions.slice(0, topN);
};

/**
 * Cache recommendations in Supabase for fast lookups
 */
export const cacheRecommendations = async (
  userId: string,
  recommendations: Prediction[]
): Promise<void> => {
  console.log(`[SVD] Caching ${recommendations.length} recommendations for user ${userId}...`);

  // Delete old recommendations
  await supabase
    .from('svd_recommendations')
    .delete()
    .eq('user_id', userId);

  // Insert new recommendations
  const { error } = await supabase
    .from('svd_recommendations')
    .insert(
      recommendations.map((rec, index) => ({
        user_id: userId,
        tmdb_id: rec.tmdbId,
        predicted_rating: rec.predictedRating,
        confidence: rec.confidence,
        rank: index + 1,
        computed_at: new Date().toISOString(),
      }))
    );

  if (error) {
    console.error('[SVD] Error caching recommendations:', error);
    throw error;
  }

  console.log(`[SVD] Successfully cached recommendations for user ${userId}`);
};

/**
 * Get cached recommendations from database
 */
export const getCachedRecommendations = async (
  userId: string,
  limit: number = 20
): Promise<Prediction[]> => {
  console.log(`[SVD] Fetching cached recommendations for user ${userId}...`);

  const { data, error } = await supabase
    .from('svd_recommendations')
    .select('tmdb_id, predicted_rating, confidence, rank')
    .eq('user_id', userId)
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[SVD] Error fetching cached recommendations:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('[SVD] No cached recommendations found');
    return [];
  }

  console.log(`[SVD] Found ${data.length} cached recommendations`);

  return data.map(row => ({
    tmdbId: row.tmdb_id,
    predictedRating: row.predicted_rating,
    confidence: row.confidence,
  }));
};

/**
 * Check if cached recommendations are fresh (< 24 hours old)
 */
export const areCachedRecommendationsFresh = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('svd_recommendations')
    .select('computed_at')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (error || !data) {
    return false;
  }

  const computedAt = new Date(data.computed_at);
  const now = new Date();
  const hoursSinceComputed = (now.getTime() - computedAt.getTime()) / (1000 * 60 * 60);

  return hoursSinceComputed < 24;
};

/**
 * Main function: Compute SVD recommendations for all users
 * This should be run periodically (e.g., nightly) or triggered manually
 */
export const computeAllRecommendations = async (): Promise<void> => {
  console.log('[SVD] Starting batch recommendation computation...');
  const startTime = Date.now();

  try {
    // 1. Fetch all interactions
    const interactions = await getUserInteractions();

    if (interactions.length === 0) {
      console.warn('[SVD] No interactions found, skipping computation');
      return;
    }

    // 2. Build interaction matrix
    const { matrix, userIds, itemIds, userIndexMap, itemIndexMap } =
      buildInteractionMatrix(interactions);

    // 3. Perform SVD
    const { U, S, V } = performSVD(matrix, 50);

    // 4. Get candidate items (all items not yet interacted with by each user)
    const allItems = new Set(itemIds);

    // 5. Generate recommendations for each user
    for (const userId of userIds) {
      // Get items user has already interacted with
      const userInteractions = interactions
        .filter(i => i.userId === userId)
        .map(i => i.tmdbId);

      // Candidate items = all items - user's items
      const candidateItems = Array.from(allItems).filter(
        item => !userInteractions.includes(item)
      );

      // Generate predictions
      const recommendations = getRecommendationsForUser(
        userId,
        candidateItems,
        U,
        S,
        V,
        userIndexMap,
        itemIndexMap,
        50 // Cache top 50 recommendations per user
      );

      // Cache in database
      await cacheRecommendations(userId, recommendations);

      console.log(`[SVD] Processed user ${userId}: ${recommendations.length} recommendations`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[SVD] Batch computation completed in ${(elapsed / 1000).toFixed(2)}s`);
    console.log(`[SVD] Processed ${userIds.length} users`);
  } catch (error) {
    console.error('[SVD] Error in batch computation:', error);
    throw error;
  }
};

/**
 * Get SVD recommendations for a user (from cache or compute on-demand)
 */
export const getSVDRecommendations = async (
  userId: string,
  limit: number = 20
): Promise<Prediction[]> => {
  console.log(`[SVD] Getting recommendations for user ${userId}...`);

  // Check if cached recommendations are fresh
  const isFresh = await areCachedRecommendationsFresh(userId);

  if (isFresh) {
    console.log('[SVD] Using fresh cached recommendations');
    return getCachedRecommendations(userId, limit);
  }

  console.log('[SVD] Cache is stale or missing, computing fresh recommendations...');

  // Compute recommendations on-demand for this user
  try {
    const interactions = await getUserInteractions();

    if (interactions.length === 0) {
      console.warn('[SVD] No interactions found');
      return [];
    }

    const { matrix, userIds, itemIds, userIndexMap, itemIndexMap } =
      buildInteractionMatrix(interactions);

    const { U, S, V } = performSVD(matrix, 50);

    // Get user's interactions
    const userInteractions = interactions
      .filter(i => i.userId === userId)
      .map(i => i.tmdbId);

    // Candidate items
    const candidateItems = Array.from(new Set(itemIds)).filter(
      item => !userInteractions.includes(item)
    );

    // Generate recommendations
    const recommendations = getRecommendationsForUser(
      userId,
      candidateItems,
      U,
      S,
      V,
      userIndexMap,
      itemIndexMap,
      50
    );

    // Cache for next time
    await cacheRecommendations(userId, recommendations);

    return recommendations.slice(0, limit);
  } catch (error) {
    console.error('[SVD] Error computing recommendations:', error);
    return [];
  }
};
