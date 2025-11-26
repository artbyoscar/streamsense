/**
 * Premium Feature Hook
 * Checks premium status and enforces free tier limits
 */

import { useCallback } from 'react';
import { usePremiumStore } from '@/features/premium';

// ============================================================================
// FREE TIER LIMITS
// ============================================================================

export const FREE_TIER_LIMITS = {
  MAX_SUBSCRIPTIONS: 3,
  MAX_WATCHLIST_ITEMS: 10,
  BASIC_RECOMMENDATIONS_ONLY: true,
  EMAIL_REPORTS: false,
} as const;

export const PREMIUM_BENEFITS = {
  UNLIMITED_SUBSCRIPTIONS: true,
  UNLIMITED_WATCHLIST: true,
  ALL_RECOMMENDATIONS: true,
  EMAIL_REPORTS: true,
} as const;

// ============================================================================
// TYPES
// ============================================================================

export type FeatureKey =
  | 'subscriptions'
  | 'watchlist'
  | 'recommendations'
  | 'email_reports';

export interface FeatureCheckResult {
  allowed: boolean;
  isPremium: boolean;
  limit?: number;
  current?: number;
  remaining?: number;
  feature: FeatureKey;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to check if a premium feature is accessible
 * Returns whether the action is allowed and shows paywall if limit reached
 */
export const usePremiumFeature = () => {
  const isPremium = usePremiumStore((state) => state.isPremium);

  /**
   * Check if user can add a new subscription
   */
  const canAddSubscription = useCallback(
    (currentCount: number): FeatureCheckResult => {
      if (isPremium) {
        return {
          allowed: true,
          isPremium: true,
          feature: 'subscriptions',
        };
      }

      const limit = FREE_TIER_LIMITS.MAX_SUBSCRIPTIONS;
      const allowed = currentCount < limit;

      return {
        allowed,
        isPremium: false,
        limit,
        current: currentCount,
        remaining: Math.max(0, limit - currentCount),
        feature: 'subscriptions',
      };
    },
    [isPremium]
  );

  /**
   * Check if user can add a new watchlist item
   */
  const canAddWatchlistItem = useCallback(
    (currentCount: number): FeatureCheckResult => {
      if (isPremium) {
        return {
          allowed: true,
          isPremium: true,
          feature: 'watchlist',
        };
      }

      const limit = FREE_TIER_LIMITS.MAX_WATCHLIST_ITEMS;
      const allowed = currentCount < limit;

      return {
        allowed,
        isPremium: false,
        limit,
        current: currentCount,
        remaining: Math.max(0, limit - currentCount),
        feature: 'watchlist',
      };
    },
    [isPremium]
  );

  /**
   * Check if user can access advanced recommendations
   */
  const canAccessAdvancedRecommendations = useCallback((): FeatureCheckResult => {
    return {
      allowed: isPremium,
      isPremium,
      feature: 'recommendations',
    };
  }, [isPremium]);

  /**
   * Check if user can access email reports
   */
  const canAccessEmailReports = useCallback((): FeatureCheckResult => {
    return {
      allowed: isPremium,
      isPremium,
      feature: 'email_reports',
    };
  }, [isPremium]);

  /**
   * Get feature limits for display
   */
  const getFeatureLimits = useCallback(() => {
    if (isPremium) {
      return {
        subscriptions: 'Unlimited',
        watchlist: 'Unlimited',
        recommendations: 'All types',
        emailReports: 'Enabled',
      };
    }

    return {
      subscriptions: `${FREE_TIER_LIMITS.MAX_SUBSCRIPTIONS} max`,
      watchlist: `${FREE_TIER_LIMITS.MAX_WATCHLIST_ITEMS} max`,
      recommendations: 'Basic only',
      emailReports: 'Not available',
    };
  }, [isPremium]);

  /**
   * Check a generic feature by key
   */
  const checkFeature = useCallback(
    (feature: FeatureKey, currentCount?: number): FeatureCheckResult => {
      switch (feature) {
        case 'subscriptions':
          return canAddSubscription(currentCount || 0);
        case 'watchlist':
          return canAddWatchlistItem(currentCount || 0);
        case 'recommendations':
          return canAccessAdvancedRecommendations();
        case 'email_reports':
          return canAccessEmailReports();
        default:
          return {
            allowed: false,
            isPremium,
            feature,
          };
      }
    },
    [
      isPremium,
      canAddSubscription,
      canAddWatchlistItem,
      canAccessAdvancedRecommendations,
      canAccessEmailReports,
    ]
  );

  return {
    isPremium,
    canAddSubscription,
    canAddWatchlistItem,
    canAccessAdvancedRecommendations,
    canAccessEmailReports,
    getFeatureLimits,
    checkFeature,
  };
};

/**
 * Hook to get current usage counts
 * Returns whether limits are being approached
 */
export const useFeatureUsage = (
  subscriptionCount: number,
  watchlistCount: number
) => {
  const isPremium = usePremiumStore((state) => state.isPremium);

  const subscriptionLimit = FREE_TIER_LIMITS.MAX_SUBSCRIPTIONS;
  const watchlistLimit = FREE_TIER_LIMITS.MAX_WATCHLIST_ITEMS;

  const subscriptionUsage = {
    count: subscriptionCount,
    limit: isPremium ? Infinity : subscriptionLimit,
    percentage: isPremium
      ? 0
      : Math.round((subscriptionCount / subscriptionLimit) * 100),
    isNearLimit: !isPremium && subscriptionCount >= subscriptionLimit - 1,
    isAtLimit: !isPremium && subscriptionCount >= subscriptionLimit,
  };

  const watchlistUsage = {
    count: watchlistCount,
    limit: isPremium ? Infinity : watchlistLimit,
    percentage: isPremium
      ? 0
      : Math.round((watchlistCount / watchlistLimit) * 100),
    isNearLimit: !isPremium && watchlistCount >= watchlistLimit - 2,
    isAtLimit: !isPremium && watchlistCount >= watchlistLimit,
  };

  return {
    isPremium,
    subscriptions: subscriptionUsage,
    watchlist: watchlistUsage,
  };
};
