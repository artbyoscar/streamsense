/**
 * useRecommendations Hook
 * Provides recommendation data for dashboard components
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { getSmartRecommendations } from '../../../services/smartRecommendations';
import type { UnifiedContent } from '../../../types';

export interface RecommendationItem {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  match_score?: number;
  reason?: string;
  media_type: 'movie' | 'tv';
}

export interface RecommendationLane {
  id: string;
  title: string;
  items: RecommendationItem[];
}

interface UseRecommendationLanesResult {
  data: RecommendationLane[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch recommendation lanes for dashboard
 */
export const useRecommendationLanes = (): UseRecommendationLanesResult => {
  const { user } = useAuth();
  const [data, setData] = useState<RecommendationLane[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const recommendations = await getSmartRecommendations({
        userId: user.id,
        limit: 20,
        mediaType: 'mixed',
        forceRefresh: false,
        excludeSessionItems: true, // 🔧 FIX: Exclude session items to prevent duplicates
      });

      // Transform UnifiedContent to RecommendationItem format
      const items: RecommendationItem[] = recommendations.map((item: UnifiedContent) => ({
        tmdb_id: item.id,
        title: item.title,
        poster_path: item.posterPath,
        match_score: item.rating ? item.rating / 10 : undefined, // Normalize rating to 0-1
        reason: 'Based on your taste',
        media_type: item.type,
      }));

      // Create a single "Picked For You" lane
      const lanes: RecommendationLane[] = [
        {
          id: 'picked-for-you',
          title: 'Picked For You',
          items,
        },
      ];

      setData(lanes);
    } catch (err) {
      console.error('[useRecommendationLanes] Error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch recommendations'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchRecommendations,
  };
};

export default useRecommendationLanes;