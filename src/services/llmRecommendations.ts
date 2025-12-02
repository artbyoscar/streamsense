/**
 * LLM-Powered Recommendation Service
 * Layer 4: Uses Claude to provide deeply personalized, reasoning-based recommendations
 *
 * This goes beyond algorithmic matching to provide human-like taste understanding:
 * - Explains WHY recommendations fit the user's taste
 * - Makes thematic and tonal connections
 * - Identifies "stretch" recommendations for taste expansion
 * - Provides conversational explanations
 *
 * SECURITY: All LLM API calls are made through Supabase Edge Functions to protect API keys
 */

import { supabase } from '@/config/supabase';
import type { UserTasteProfile, ContentDNA } from './contentDNA';

interface ContentItem {
  tmdbId: number;
  title: string;
  reason: string;
  mediaType: 'movie' | 'tv';
}

interface LLMRecommendationRequest {
  query: string;
  userProfile?: {
    tasteSignature: string;
    topGenres: string[];
    topDirectors: string[];
    topActors: string[];
    watchedCount: number;
  };
  context?: string;
}

interface LLMRecommendationResponse {
  recommendations: ContentItem[];
  explanation: string;
  cached: boolean;
}

export class LLMRecommendationService {
  /**
   * Call the secure Supabase Edge Function for LLM recommendations
   */
  private async callEdgeFunction(
    request: LLMRecommendationRequest
  ): Promise<LLMRecommendationResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('User not authenticated');
      }

      console.log('[LLM] Calling Edge Function for recommendations');

      const { data, error } = await supabase.functions.invoke('llm-recommendations', {
        body: request,
      });

      if (error) {
        throw error;
      }

      console.log('[LLM] Received', data.recommendations.length, 'recommendations');
      console.log('[LLM] Cached:', data.cached);

      return data;
    } catch (error) {
      console.error('[LLM] Error calling Edge Function:', error);
      return {
        recommendations: [],
        explanation: 'Failed to generate LLM recommendations',
        cached: false,
      };
    }
  }

  /**
   * Get LLM-powered personalized recommendations
   */
  async getPersonalizedRecommendations(
    query: string,
    userProfile?: UserTasteProfile,
    context?: string
  ): Promise<LLMRecommendationResponse> {
    const request: LLMRecommendationRequest = {
      query,
      context,
    };

    // Map taste profile to Edge Function format
    if (userProfile) {
      request.userProfile = {
        tasteSignature: userProfile.tasteSignature,
        topGenres: userProfile.topGenres?.slice(0, 5) || [],
        topDirectors: userProfile.favoriteDirectors?.slice(0, 5).map(d => d.name) || [],
        topActors: userProfile.favoriteActors?.slice(0, 5).map(a => a.name) || [],
        watchedCount: userProfile.totalWatched || 0,
      };
    }

    return this.callEdgeFunction(request);
  }

  /**
   * Get mood-based recommendations with LLM reasoning
   */
  async getMoodBasedRecommendations(
    mood: string,
    userProfile?: UserTasteProfile
  ): Promise<LLMRecommendationResponse> {
    const query = `I'm in the mood for something ${mood}. Based on my taste profile, recommend movies or TV shows that match this mood.`;
    return this.getPersonalizedRecommendations(query, userProfile);
  }

  /**
   * Get recommendations similar to a specific title
   */
  async getMoreLikeThis(
    title: string,
    userProfile?: UserTasteProfile
  ): Promise<LLMRecommendationResponse> {
    const query = `I loved "${title}". Recommend similar movies or TV shows that I would enjoy based on my taste profile.`;
    return this.getPersonalizedRecommendations(query, userProfile);
  }

  /**
   * Get a weekly personalized newsletter of recommendations
   */
  async getWeeklyNewsletter(
    userProfile?: UserTasteProfile
  ): Promise<LLMRecommendationResponse> {
    const query = 'Create a personalized weekly newsletter with diverse recommendations including new releases, hidden gems, and classic films that match my taste profile.';
    return this.getPersonalizedRecommendations(query, userProfile);
  }

  /**
   * Check remaining LLM calls for the current user
   */
  async getRemainingCalls(): Promise<{ remaining: number; limit: number; resetAt: Date }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Count calls in the last 24 hours
      const { count } = await supabase
        .from('llm_recommendations_cache')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const limit = 5; // Rate limit per day
      const remaining = Math.max(0, limit - (count || 0));

      // Calculate reset time (24 hours from now)
      const resetAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      return { remaining, limit, resetAt };
    } catch (error) {
      console.error('[LLM] Error checking remaining calls:', error);
      return { remaining: 0, limit: 5, resetAt: new Date() };
    }
  }

  /**
   * Check if user has available LLM calls
   */
  async hasAvailableCalls(): Promise<boolean> {
    const { remaining } = await this.getRemainingCalls();
    return remaining > 0;
  }

}

// Export singleton instance
export const llmRecommendationService = new LLMRecommendationService();
