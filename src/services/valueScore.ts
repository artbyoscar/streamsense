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
  displayLabel: string;
  color?: string;
}

/**
 * Calculate value score for a subscription
 */
export const calculateValueScore = (
  monthlyCost: number,
  hoursWatched: number
): {
  score: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  costPerHour: number;
  displayLabel: string;
  message: string;
  color?: string;
} => {
  // 1. Unused / Low Usage (The "Use it or lose it" logic)
  if (hoursWatched < 1) {
    return {
      score: 'poor',
      costPerHour: monthlyCost, // Technically infinite/high, keep for sorting
      displayLabel: 'LOW USAGE',
      message: `Only ${(hoursWatched * 60).toFixed(0)} mins watched. Use it or lose it!`,
      color: '#FF4444' // Red/Orange
    };
  }

  const cph = monthlyCost / hoursWatched;

  // 2. The "Good Value" Logic (The Disney+ Fix)
  // If it costs less than a rental ($4) per hour, it's just "Good Value".
  // Don't show the math unless it's insanely cheap.
  if (cph <= 4.0) {
    return {
      score: 'good',
      costPerHour: cph,
      // Hide the $2.00/hr. Just say "Active" or "Good Value"
      displayLabel: cph < 0.50 ? 'GREAT VALUE' : 'GOOD VALUE',
      message: 'You are getting your money\'s worth.',
      color: '#00C851' // Green
    };
  }

  // 3. The "Expensive" Logic (Show the cost to shock them)
  return {
    score: 'fair',
    costPerHour: cph,
    displayLabel: `$${cph.toFixed(2)}/HR`,
    message: 'Consider watching more to justify the cost.',
    color: '#FFBB33' // Yellow
  };
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
      const { score, costPerHour, displayLabel, message, color } = calculateValueScore(monthlyCost, watchHours);

      return {
        subscriptionId: sub.id,
        serviceName: sub.service_name || (sub as any).name,
        monthlyCost,
        totalWatchHours: Math.round(watchHours * 10) / 10,
        costPerHour: Math.round(costPerHour * 100) / 100,
        rating: score,
        recommendation: message,
        displayLabel,
        color
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
