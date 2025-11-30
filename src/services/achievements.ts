/**
 * Achievements & Gamification Service
 * Award badges for smart subscription management habits
 */

import { supabase } from '@/config/supabase';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  category: 'savings' | 'value' | 'rotation' | 'discovery';
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: Date;
  achievement: Achievement;
}

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Savings Achievements
  {
    id: 'first_cancel',
    name: 'Smart Saver',
    description: 'Canceled your first unused subscription',
    icon: '🏆',
    tier: 'bronze',
    category: 'savings',
  },
  {
    id: 'savings_50',
    name: 'Thrifty Fifty',
    description: 'Saved $50 by canceling unused services',
    icon: '💵',
    tier: 'bronze',
    category: 'savings',
  },
  {
    id: 'savings_100',
    name: 'Century Saver',
    description: 'Saved $100 this year',
    icon: '💰',
    tier: 'silver',
    category: 'savings',
  },
  {
    id: 'savings_250',
    name: 'Master Saver',
    description: 'Saved $250 this year',
    icon: '🤑',
    tier: 'gold',
    category: 'savings',
  },
  {
    id: 'savings_500',
    name: 'Elite Economizer',
    description: 'Saved $500 this year',
    icon: '💎',
    tier: 'platinum',
    category: 'savings',
  },

  // Value Achievements
  {
    id: 'value_hunter',
    name: 'Value Hunter',
    description: 'Maintained under $1/hour on all services for a month',
    icon: '🎯',
    tier: 'gold',
    category: 'value',
  },
  {
    id: 'binge_master',
    name: 'Binge Master',
    description: 'Watched 50+ hours of content in a month',
    icon: '📺',
    tier: 'bronze',
    category: 'value',
  },
  {
    id: 'efficiency_expert',
    name: 'Efficiency Expert',
    description: 'Achieved excellent value (under $0.50/hr) on 3+ services',
    icon: '⚡',
    tier: 'platinum',
    category: 'value',
  },

  // Rotation Achievements
  {
    id: 'first_rotation',
    name: 'Rotation Rookie',
    description: 'Completed your first subscription rotation',
    icon: '🔄',
    tier: 'bronze',
    category: 'rotation',
  },
  {
    id: 'rotation_master',
    name: 'Rotation Master',
    description: 'Successfully rotated 3 services in a year',
    icon: '🌀',
    tier: 'silver',
    category: 'rotation',
  },
  {
    id: 'rotation_ninja',
    name: 'Rotation Ninja',
    description: 'Rotated 6+ services without overlap',
    icon: '🥷',
    tier: 'gold',
    category: 'rotation',
  },

  // Discovery Achievements
  {
    id: 'watchlist_10',
    name: 'Curator',
    description: 'Added 10 items to your watchlist',
    icon: '📝',
    tier: 'bronze',
    category: 'discovery',
  },
  {
    id: 'watchlist_50',
    name: 'Film Buff',
    description: 'Added 50 items to your watchlist',
    icon: '🎬',
    tier: 'silver',
    category: 'discovery',
  },
  {
    id: 'genre_explorer',
    name: 'Genre Explorer',
    description: 'Watched content from 5+ different genres',
    icon: '🗺️',
    tier: 'silver',
    category: 'discovery',
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Watched 25 items from your watchlist',
    icon: '✅',
    tier: 'gold',
    category: 'discovery',
  },
];

/**
 * Get user's unlocked achievements
 */
export const getUserAchievements = async (userId: string): Promise<UserAchievement[]> => {
  try {
    // For now, we'll store achievements in user_metadata or a separate table
    // Let's check AsyncStorage first as a simple solution
    const { data: profile } = await supabase
      .from('profiles')
      .select('achievements')
      .eq('id', userId)
      .single();

    if (!profile?.achievements) {
      return [];
    }

    const unlockedIds: Array<{ id: string; unlockedAt: string }> =
      JSON.parse(profile.achievements || '[]');

    return unlockedIds.map(({ id, unlockedAt }) => ({
      achievementId: id,
      unlockedAt: new Date(unlockedAt),
      achievement: ACHIEVEMENTS.find(a => a.id === id)!,
    })).filter(ua => ua.achievement);
  } catch (error) {
    console.error('[Achievements] Error loading user achievements:', error);
    return [];
  }
};

/**
 * Unlock an achievement for a user
 */
const unlockAchievement = async (userId: string, achievementId: string): Promise<boolean> => {
  try {
    // Get current achievements
    const { data: profile } = await supabase
      .from('profiles')
      .select('achievements')
      .eq('id', userId)
      .single();

    const current: Array<{ id: string; unlockedAt: string }> =
      JSON.parse(profile?.achievements || '[]');

    // Check if already unlocked
    if (current.some(a => a.id === achievementId)) {
      return false;
    }

    // Add new achievement
    current.push({
      id: achievementId,
      unlockedAt: new Date().toISOString(),
    });

    // Update profile
    await supabase
      .from('profiles')
      .update({ achievements: JSON.stringify(current) })
      .eq('id', userId);

    console.log('[Achievements] Unlocked:', achievementId);
    return true;
  } catch (error) {
    console.error('[Achievements] Error unlocking achievement:', error);
    return false;
  }
};

/**
 * Check and award achievements based on user stats
 */
export const checkAchievements = async (userId: string): Promise<string[]> => {
  const newAchievements: string[] = [];

  try {
    // Get user's current achievements
    const userAchievements = await getUserAchievements(userId);
    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

    // Get user stats
    const stats = await calculateUserStats(userId);

    console.log('[Achievements] User stats:', stats);

    // Check savings achievements
    if (!unlockedIds.has('first_cancel') && stats.totalCancellations >= 1) {
      if (await unlockAchievement(userId, 'first_cancel')) {
        newAchievements.push('first_cancel');
      }
    }

    if (!unlockedIds.has('savings_50') && stats.totalSavings >= 50) {
      if (await unlockAchievement(userId, 'savings_50')) {
        newAchievements.push('savings_50');
      }
    }

    if (!unlockedIds.has('savings_100') && stats.totalSavings >= 100) {
      if (await unlockAchievement(userId, 'savings_100')) {
        newAchievements.push('savings_100');
      }
    }

    if (!unlockedIds.has('savings_250') && stats.totalSavings >= 250) {
      if (await unlockAchievement(userId, 'savings_250')) {
        newAchievements.push('savings_250');
      }
    }

    if (!unlockedIds.has('savings_500') && stats.totalSavings >= 500) {
      if (await unlockAchievement(userId, 'savings_500')) {
        newAchievements.push('savings_500');
      }
    }

    // Check value achievements
    if (!unlockedIds.has('value_hunter') && stats.allServicesUnderOneDollar) {
      if (await unlockAchievement(userId, 'value_hunter')) {
        newAchievements.push('value_hunter');
      }
    }

    if (!unlockedIds.has('binge_master') && stats.monthlyWatchHours >= 50) {
      if (await unlockAchievement(userId, 'binge_master')) {
        newAchievements.push('binge_master');
      }
    }

    if (!unlockedIds.has('efficiency_expert') && stats.servicesUnderFiftyCents >= 3) {
      if (await unlockAchievement(userId, 'efficiency_expert')) {
        newAchievements.push('efficiency_expert');
      }
    }

    // Check rotation achievements
    if (!unlockedIds.has('first_rotation') && stats.rotationCount >= 1) {
      if (await unlockAchievement(userId, 'first_rotation')) {
        newAchievements.push('first_rotation');
      }
    }

    if (!unlockedIds.has('rotation_master') && stats.rotationCount >= 3) {
      if (await unlockAchievement(userId, 'rotation_master')) {
        newAchievements.push('rotation_master');
      }
    }

    if (!unlockedIds.has('rotation_ninja') && stats.rotationCount >= 6) {
      if (await unlockAchievement(userId, 'rotation_ninja')) {
        newAchievements.push('rotation_ninja');
      }
    }

    // Check discovery achievements
    if (!unlockedIds.has('watchlist_10') && stats.watchlistCount >= 10) {
      if (await unlockAchievement(userId, 'watchlist_10')) {
        newAchievements.push('watchlist_10');
      }
    }

    if (!unlockedIds.has('watchlist_50') && stats.watchlistCount >= 50) {
      if (await unlockAchievement(userId, 'watchlist_50')) {
        newAchievements.push('watchlist_50');
      }
    }

    if (!unlockedIds.has('genre_explorer') && stats.uniqueGenres >= 5) {
      if (await unlockAchievement(userId, 'genre_explorer')) {
        newAchievements.push('genre_explorer');
      }
    }

    if (!unlockedIds.has('completionist') && stats.watchedCount >= 25) {
      if (await unlockAchievement(userId, 'completionist')) {
        newAchievements.push('completionist');
      }
    }

    return newAchievements;
  } catch (error) {
    console.error('[Achievements] Error checking achievements:', error);
    return [];
  }
};

/**
 * Calculate user statistics for achievement checking
 */
const calculateUserStats = async (userId: string) => {
  // Get cancelled subscriptions
  const { data: cancelled } = await supabase
    .from('user_subscriptions')
    .select('monthly_cost, cost, price, updated_at')
    .eq('user_id', userId)
    .eq('status', 'cancelled');

  const totalCancellations = cancelled?.length || 0;

  // Estimate savings (2 months per cancellation)
  const totalSavings = (cancelled || []).reduce((sum, sub) => {
    const cost = sub.monthly_cost || sub.cost || sub.price || 0;
    return sum + (cost * 2); // Assume 2 months saved
  }, 0);

  // Get watchlist stats
  const { data: watchlist } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('user_id', userId);

  const watchlistCount = watchlist?.length || 0;
  const watchedCount = watchlist?.filter(w => w.status === 'watched').length || 0;

  // Get genre diversity
  const { data: genreAffinity } = await supabase
    .from('user_genre_affinity')
    .select('genre_id')
    .eq('user_id', userId);

  const uniqueGenres = genreAffinity?.length || 0;

  // Get value scores
  const { data: subs } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  // Calculate watch hours (simplified - would need engagement log)
  const monthlyWatchHours = (watchlist || [])
    .filter(w => w.status === 'watching' || w.status === 'watched')
    .length * 2; // Rough estimate: 2 hours per item

  // Check value metrics (would use valueScore service in production)
  let allServicesUnderOneDollar = false;
  let servicesUnderFiftyCents = 0;

  if (subs && subs.length > 0) {
    // Simplified check - in production, use getUserValueScores
    allServicesUnderOneDollar = subs.length > 0 && monthlyWatchHours > subs.length * 10;
    servicesUnderFiftyCents = subs.filter(() => monthlyWatchHours > 20).length;
  }

  // Rotation count (subscribe/cancel cycles)
  const rotationCount = Math.floor(totalCancellations / 2);

  return {
    totalCancellations,
    totalSavings,
    watchlistCount,
    watchedCount,
    uniqueGenres,
    monthlyWatchHours,
    allServicesUnderOneDollar,
    servicesUnderFiftyCents,
    rotationCount,
  };
};

/**
 * Get achievement progress for display
 */
export const getAchievementProgress = async (userId: string): Promise<{
  unlocked: UserAchievement[];
  locked: Achievement[];
  totalPoints: number;
  progress: number;
}> => {
  const unlocked = await getUserAchievements(userId);
  const unlockedIds = new Set(unlocked.map(ua => ua.achievementId));
  const locked = ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id));

  // Calculate points (bronze=1, silver=2, gold=3, platinum=5)
  const tierPoints = { bronze: 1, silver: 2, gold: 3, platinum: 5 };
  const totalPoints = unlocked.reduce((sum, ua) => {
    return sum + tierPoints[ua.achievement.tier];
  }, 0);

  const progress = (unlocked.length / ACHIEVEMENTS.length) * 100;

  return {
    unlocked,
    locked,
    totalPoints,
    progress: Math.round(progress),
  };
};

/**
 * Get tier color for UI
 */
export const getTierColor = (tier: Achievement['tier']): string => {
  switch (tier) {
    case 'bronze': return '#CD7F32';
    case 'silver': return '#C0C0C0';
    case 'gold': return '#FFD700';
    case 'platinum': return '#E5E4E2';
    default: return '#9CA3AF';
  }
};
