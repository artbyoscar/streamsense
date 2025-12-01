/**
 * User Behavior Pattern Service
 * Tracks user interaction velocity to adapt recommendations
 *
 * Modes:
 * - Discovery: User adding 5+ items per session → Show variety, new genres
 * - Intentional: User adding 1-4 items per session → Show deep matches
 * - Passive: User adding <1 item per session → Re-engage with highlights
 */

import { supabase } from '@/config/supabase';

// Behavior thresholds
export const BEHAVIOR_CONFIG = {
  DISCOVERY_THRESHOLD: 5,    // 5+ items per session = discovery mode
  INTENTIONAL_THRESHOLD: 1,  // 1-4 items per session = intentional mode
  SESSION_GAP_MINUTES: 30,   // 30 min gap = new session
  ANALYSIS_DAYS: 7,          // Analyze last 7 days
} as const;

export type UserMode = 'discovery' | 'intentional' | 'passive';

export interface UserBehaviorPattern {
  mode: UserMode;
  averageItemsPerSession: number;
  totalSessions: number;
  totalActions: number;
  recentActivity: number; // Actions in last 7 days
  confidence: number;     // 0-1, how confident we are in this mode
}

export interface RecommendationStrategy {
  mode: UserMode;
  varietyRatio: number;      // 0-1, how much variety vs precision
  newGenreRatio: number;     // 0-1, how much to introduce new genres
  popularityBoost: number;   // 0-1, how much to boost popular items
  similarityThreshold: number; // 0-1, minimum similarity to user tastes
  description: string;
}

/**
 * Group actions into sessions based on time gaps
 */
const groupIntoSessions = (
  actions: { created_at: string }[]
): { created_at: string }[][] => {
  if (actions.length === 0) return [];

  const sessions: { created_at: string }[][] = [];
  let currentSession: { created_at: string }[] = [actions[0]];

  for (let i = 1; i < actions.length; i++) {
    const prevTime = new Date(actions[i - 1].created_at).getTime();
    const currTime = new Date(actions[i].created_at).getTime();
    const gapMinutes = (currTime - prevTime) / (1000 * 60);

    if (gapMinutes <= BEHAVIOR_CONFIG.SESSION_GAP_MINUTES) {
      // Same session
      currentSession.push(actions[i]);
    } else {
      // New session
      sessions.push(currentSession);
      currentSession = [actions[i]];
    }
  }

  // Add final session
  if (currentSession.length > 0) {
    sessions.push(currentSession);
  }

  return sessions;
};

/**
 * Get recent user actions for behavior analysis
 */
const getRecentActions = async (
  userId: string,
  days: number = BEHAVIOR_CONFIG.ANALYSIS_DAYS
): Promise<{ created_at: string }[]> => {
  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { data, error } = await supabase
      .from('watchlist_items')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[UserBehavior] Error fetching recent actions:', error);
    return [];
  }
};

/**
 * Detect user's current interaction mode
 *
 * @param userId - User ID
 * @returns User behavior pattern with detected mode
 */
export const detectUserMode = async (userId: string): Promise<UserBehaviorPattern> => {
  try {
    // Get recent actions
    const recentActions = await getRecentActions(userId);

    if (recentActions.length === 0) {
      return {
        mode: 'passive',
        averageItemsPerSession: 0,
        totalSessions: 0,
        totalActions: 0,
        recentActivity: 0,
        confidence: 1.0,
      };
    }

    // Group into sessions
    const sessions = groupIntoSessions(recentActions);
    const sessionSizes = sessions.map(s => s.length);
    const avgItemsPerSession = sessionSizes.reduce((a, b) => a + b, 0) / sessions.length;

    // Determine mode
    let mode: UserMode;
    let confidence = 1.0;

    if (avgItemsPerSession >= BEHAVIOR_CONFIG.DISCOVERY_THRESHOLD) {
      mode = 'discovery';
      // Higher confidence if consistently high across sessions
      const highSessions = sessionSizes.filter(s => s >= BEHAVIOR_CONFIG.DISCOVERY_THRESHOLD).length;
      confidence = highSessions / sessions.length;
    } else if (avgItemsPerSession >= BEHAVIOR_CONFIG.INTENTIONAL_THRESHOLD) {
      mode = 'intentional';
      // Confidence based on consistency
      const midSessions = sessionSizes.filter(
        s => s >= BEHAVIOR_CONFIG.INTENTIONAL_THRESHOLD && s < BEHAVIOR_CONFIG.DISCOVERY_THRESHOLD
      ).length;
      confidence = midSessions / sessions.length;
    } else {
      mode = 'passive';
      confidence = 1.0 - (avgItemsPerSession / BEHAVIOR_CONFIG.INTENTIONAL_THRESHOLD);
    }

    const pattern: UserBehaviorPattern = {
      mode,
      averageItemsPerSession: Math.round(avgItemsPerSession * 10) / 10,
      totalSessions: sessions.length,
      totalActions: recentActions.length,
      recentActivity: recentActions.length,
      confidence: Math.round(confidence * 100) / 100,
    };

    console.log('[UserBehavior] Detected pattern:', pattern);
    return pattern;
  } catch (error) {
    console.error('[UserBehavior] Error detecting user mode:', error);
    return {
      mode: 'intentional', // Default to balanced mode
      averageItemsPerSession: 2,
      totalSessions: 1,
      totalActions: 2,
      recentActivity: 2,
      confidence: 0.5,
    };
  }
};

/**
 * Get recommendation strategy for user mode
 *
 * @param mode - User's interaction mode
 * @returns Strategy configuration for recommendations
 */
export const getRecommendationStrategy = (mode: UserMode): RecommendationStrategy => {
  switch (mode) {
    case 'discovery':
      return {
        mode,
        varietyRatio: 0.8,           // High variety
        newGenreRatio: 0.3,          // 30% new genres
        popularityBoost: 0.6,        // Moderate popularity boost
        similarityThreshold: 0.5,    // Lower similarity (more exploration)
        description: 'Discovery Mode - Exploring widely with variety',
      };

    case 'intentional':
      return {
        mode,
        varietyRatio: 0.5,           // Balanced variety
        newGenreRatio: 0.15,         // 15% new genres
        popularityBoost: 0.3,        // Low popularity boost
        similarityThreshold: 0.75,   // High similarity (deep matches)
        description: 'Intentional Mode - Curated deep matches',
      };

    case 'passive':
      return {
        mode,
        varietyRatio: 0.4,           // Lower variety
        newGenreRatio: 0.1,          // 10% new genres
        popularityBoost: 0.9,        // High popularity boost (re-engage)
        similarityThreshold: 0.6,    // Moderate similarity
        description: 'Passive Mode - Highlighting unmissable content',
      };
  }
};

/**
 * Get adaptive recommendation parameters based on user behavior
 *
 * @param userId - User ID
 * @returns Strategy and pattern for adaptive recommendations
 */
export const getAdaptiveRecommendationParams = async (
  userId: string
): Promise<{
  pattern: UserBehaviorPattern;
  strategy: RecommendationStrategy;
}> => {
  const pattern = await detectUserMode(userId);
  const strategy = getRecommendationStrategy(pattern.mode);

  console.log('[UserBehavior] Adaptive strategy:', {
    mode: pattern.mode,
    confidence: pattern.confidence,
    avgItemsPerSession: pattern.averageItemsPerSession,
    strategyDescription: strategy.description,
  });

  return { pattern, strategy };
};

/**
 * Get detailed behavior analytics for debugging/display
 */
export const getUserBehaviorAnalytics = async (userId: string) => {
  try {
    const recentActions = await getRecentActions(userId, 30); // Last 30 days
    const sessions = groupIntoSessions(recentActions);

    const sessionSizes = sessions.map(s => s.length);
    const avgPerSession = sessionSizes.length > 0
      ? sessionSizes.reduce((a, b) => a + b, 0) / sessions.length
      : 0;

    const maxSession = sessionSizes.length > 0 ? Math.max(...sessionSizes) : 0;
    const minSession = sessionSizes.length > 0 ? Math.min(...sessionSizes) : 0;

    // Activity by day of week
    const dayActivity = new Array(7).fill(0);
    recentActions.forEach(action => {
      const day = new Date(action.created_at).getDay();
      dayActivity[day]++;
    });

    return {
      totalActions: recentActions.length,
      totalSessions: sessions.length,
      avgItemsPerSession: Math.round(avgPerSession * 10) / 10,
      maxItemsInSession: maxSession,
      minItemsInSession: minSession,
      activityByDay: dayActivity,
      last7Days: await getRecentActions(userId, 7),
      last30Days: recentActions,
    };
  } catch (error) {
    console.error('[UserBehavior] Error getting analytics:', error);
    return null;
  }
};
