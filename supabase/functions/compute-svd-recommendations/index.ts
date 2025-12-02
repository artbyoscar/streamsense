/**
 * Supabase Edge Function: Compute SVD Recommendations
 *
 * This function computes Netflix-style collaborative filtering recommendations
 * using SVD (Singular Value Decomposition) matrix factorization.
 *
 * Trigger this function:
 * - Manually via HTTP POST request
 * - Scheduled via cron job (nightly)
 * - After significant watchlist changes
 *
 * Usage:
 *   POST /compute-svd-recommendations
 *   Headers:
 *     Authorization: Bearer <service_role_key>
 *   Body:
 *     {
 *       "userId": "optional-specific-user-id",
 *       "force": true
 *     }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Note: In Deno, we'll use a simpler collaborative filtering approach
// For full SVD, trigger this from the React Native app using the matrixFactorization service

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, content-type',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { userId, force } = await req.json().catch(() => ({}));

    console.log('[SVD Edge] Starting computation', { userId, force });

    // Get all user interactions
    const { data: interactions, error: interactionsError } = await supabase
      .from('watchlist_items')
      .select(`
        user_id,
        content!inner(tmdb_id),
        status,
        created_at
      `);

    if (interactionsError) {
      throw interactionsError;
    }

    console.log(`[SVD Edge] Loaded ${interactions.length} interactions`);

    // Convert status to rating
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

    // Build user-item map
    const userItems = new Map<string, Map<number, number>>();
    const allItems = new Set<number>();

    interactions.forEach((interaction: any) => {
      if (!interaction.content || !interaction.content.tmdb_id) return;

      const userId = interaction.user_id;
      const tmdbId = interaction.content.tmdb_id;
      const rating = statusToRating(interaction.status);

      if (!userItems.has(userId)) {
        userItems.set(userId, new Map());
      }

      userItems.get(userId)!.set(tmdbId, rating);
      allItems.add(tmdbId);
    });

    console.log(`[SVD Edge] Processing ${userItems.size} users and ${allItems.size} items`);

    // Simple collaborative filtering using item-item similarity
    // For each user, recommend items similar to what they liked
    let totalRecommendations = 0;

    for (const [currentUserId, userRatings] of userItems.entries()) {
      // Skip if only computing for specific user
      if (userId && currentUserId !== userId) continue;

      // Get items user liked (rating >= 4)
      const likedItems = Array.from(userRatings.entries())
        .filter(([_, rating]) => rating >= 4)
        .map(([itemId, _]) => itemId);

      if (likedItems.length === 0) {
        console.log(`[SVD Edge] User ${currentUserId} has no liked items, skipping`);
        continue;
      }

      // Find similar users (users who also liked these items)
      const similarUsers = new Map<string, number>();

      for (const [otherUserId, otherRatings] of userItems.entries()) {
        if (otherUserId === currentUserId) continue;

        // Count common liked items
        let commonLikes = 0;
        for (const itemId of likedItems) {
          if (otherRatings.has(itemId) && otherRatings.get(itemId)! >= 4) {
            commonLikes++;
          }
        }

        if (commonLikes > 0) {
          similarUsers.set(otherUserId, commonLikes);
        }
      }

      // Get candidate items from similar users
      const candidateScores = new Map<number, { score: number; count: number }>();

      for (const [similarUserId, similarity] of similarUsers.entries()) {
        const similarUserRatings = userItems.get(similarUserId)!;

        for (const [itemId, rating] of similarUserRatings.entries()) {
          // Skip if user already has this item
          if (userRatings.has(itemId)) continue;

          // Weight by similarity and rating
          const score = similarity * (rating / 5.0);

          if (!candidateScores.has(itemId)) {
            candidateScores.set(itemId, { score: 0, count: 0 });
          }

          const current = candidateScores.get(itemId)!;
          current.score += score;
          current.count += 1;
        }
      }

      // Calculate average scores and sort
      const recommendations = Array.from(candidateScores.entries())
        .map(([tmdbId, { score, count }]) => ({
          tmdb_id: tmdbId,
          predicted_rating: Math.min(5, (score / count) * 5), // Normalize to 1-5
          confidence: Math.min(1, count / similarUsers.size), // More votes = higher confidence
        }))
        .sort((a, b) => b.predicted_rating - a.predicted_rating)
        .slice(0, 50); // Top 50 recommendations

      if (recommendations.length === 0) {
        console.log(`[SVD Edge] No recommendations for user ${currentUserId}`);
        continue;
      }

      // Delete old recommendations
      await supabase
        .from('svd_recommendations')
        .delete()
        .eq('user_id', currentUserId);

      // Insert new recommendations
      const { error: insertError } = await supabase
        .from('svd_recommendations')
        .insert(
          recommendations.map((rec, index) => ({
            user_id: currentUserId,
            tmdb_id: rec.tmdb_id,
            predicted_rating: rec.predicted_rating,
            confidence: rec.confidence,
            rank: index + 1,
            computed_at: new Date().toISOString(),
          }))
        );

      if (insertError) {
        console.error(`[SVD Edge] Error inserting recommendations for ${currentUserId}:`, insertError);
      } else {
        totalRecommendations += recommendations.length;
        console.log(`[SVD Edge] Cached ${recommendations.length} recommendations for ${currentUserId}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Computed ${totalRecommendations} recommendations for ${userId || userItems.size + ' users'}`,
        totalUsers: userId ? 1 : userItems.size,
        totalRecommendations,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('[SVD Edge] Error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
