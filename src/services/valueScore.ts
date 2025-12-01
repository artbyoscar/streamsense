/**
 * Value Score Service
 * Calculate value metrics for streaming subscriptions based on watch time
 */

import { supabase } from '@/config/supabase';

// Average content durations (in minutes)
const AVG_MOVIE_DURATION = 120;
const AVG_TV_EPISODE_DURATION = 45;

interface ValueScoreResult {
  subscriptionId: string;
  serviceName: string;
  monthlyCost: number;
  totalWatchHours: number;
  costPerHour: number;
  rating: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  recommendation: string;
}

/**
 * Calculate value score for a subscription
 */
export const calculateValueScore = (
  monthlyCost: number,
  watchHours: number
): { costPerHour: number; rating: string } => {
  if (watchHours === 0 || monthlyCost === 0) {
    return { costPerHour: 0, rating: 'unknown' };
  }

  const costPerHour = monthlyCost / watchHours;

  let rating: string;
  if (costPerHour < 1) {
    rating = 'excellent';
  } else if (costPerHour < 2) {
    rating = 'good';
  } else if (costPerHour < 5) {
    rating = 'fair';
  } else {
    rating = 'poor';
  }

  return { costPerHour, rating };
};

/**
 * Get value scores for all user subscriptions
 */
export const getUserValueScores = async (
  userId: string
): Promise<ValueScoreResult[]> => {
  try {
    // Get user subscriptions with watch hours
    const { data: subs } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!subs || subs.length === 0) {
      return [];
    }

    // Calculate value scores using total_watch_hours from subscription records
    const results: ValueScoreResult[] = subs.map((sub) => {
      // Read watch hours directly from subscription record (logged via watch time feature)
      const watchHours = sub.total_watch_hours || 0;
      const monthlyCost = sub.monthly_cost || (sub as any).cost || (sub as any).price || 0;
      const { costPerHour, rating } = calculateValueScore(monthlyCost, watchHours);

      let recommendation = '';
      if (rating === 'excellent') {
        recommendation = 'Great value! Keep this subscription.';
      } else if (rating === 'good') {
        recommendation = 'Good value. Consider watching more content.';
      } else if (rating === 'fair') {
        recommendation = 'Average value. Review your watching habits.';
      } else if (rating === 'poor') {
        recommendation = 'Consider canceling or pausing this service.';
      } else {
        recommendation = 'Start watching to track value.';
      }

      return {
        subscriptionId: sub.id,
        serviceName: sub.service_name || (sub as any).name,
        monthlyCost,
        totalWatchHours: Math.round(watchHours * 10) / 10,
        costPerHour: Math.round(costPerHour * 100) / 100,
        rating: rating as any,
        recommendation,
      };
    });

    console.log('[ValueScore] Results:', results);

    return results.sort((a, b) => b.costPerHour - a.costPerHour);
  } catch (error) {
    console.error('[ValueScore] Error:', error);
    return [];
  }
};

/**
 * Log engagement when user marks content as watched
 */
export const logEngagement = async (
  userId: string,
  contentId: number,
  contentType: 'movie' | 'tv',
  streamingService: string,
  durationMinutes?: number
) => {
  try {
    // Find the subscription
    const { data: subs } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .ilike('service_name', `%${streamingService}%`)
      .single();

    if (subs) {
      await supabase.from('user_engagement_log').insert({
        user_id: userId,
        subscription_id: subs.id,
        content_id: contentId,
        content_type: contentType,
        duration_minutes: durationMinutes ||
          (contentType === 'movie' ? AVG_MOVIE_DURATION : AVG_TV_EPISODE_DURATION),
      });

      console.log('[ValueScore] Logged engagement:', {
        service: streamingService,
        contentId,
        duration: durationMinutes,
      });
    }
  } catch (error) {
    console.error('[ValueScore] Log engagement error:', error);
  }
};
