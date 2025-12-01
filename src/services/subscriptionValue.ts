/**
 * Subscription Value Service
 * Calculate subscription value based on actual watchlist engagement
 * instead of manually entered viewing hours
 */

import { supabase } from '@/config/supabase';

// Map streaming services to their TMDb watch provider IDs
const SERVICE_PROVIDERS: Record<string, number[]> = {
  'netflix': [8],
  'hulu': [15],
  'disney': [337],
  'disney+': [337],
  'disneyplus': [337],
  'prime': [9, 119],
  'amazon': [9, 119],
  'primevideo': [9, 119],
  'hbo': [384, 1899],
  'max': [384, 1899],
  'hbomax': [384, 1899],
  'apple': [350],
  'appletv': [350],
  'appletv+': [350],
  'paramount': [531],
  'paramount+': [531],
  'peacock': [386],
  'crunchyroll': [283],
};

export interface SubscriptionValueMetrics {
  contentWatched: number;
  averageRating: number;
  engagementScore: number;
  valueLabel: string;
  valueColor: string;
  costPerItem: number;
}

/**
 * Calculate subscription value based on watchlist engagement
 */
export const calculateSubscriptionValue = async (
  userId: string,
  serviceName: string,
  monthlyPrice: number
): Promise<SubscriptionValueMetrics> => {
  console.log('[SubscriptionValue] Calculating for:', serviceName, 'user:', userId);

  // Normalize service name for matching
  const serviceKey = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const providerIds = SERVICE_PROVIDERS[serviceKey] || [];

  console.log('[SubscriptionValue] Provider IDs:', providerIds);

  // Get all watchlist items for this user
  const { data: watchlistItems } = await supabase
    .from('watchlist_items')
    .select('id, status, rating, watch_providers, created_at, updated_at')
    .eq('user_id', userId);

  if (!watchlistItems || watchlistItems.length === 0) {
    console.log('[SubscriptionValue] No watchlist items found');
    return {
      contentWatched: 0,
      averageRating: 0,
      engagementScore: 0,
      valueLabel: 'New',
      valueColor: '#6B7280',
      costPerItem: monthlyPrice,
    };
  }

  console.log('[SubscriptionValue] Total watchlist items:', watchlistItems.length);

  // Filter items that are from this service
  // Check if watch_providers array includes any of our provider IDs
  const serviceItems = watchlistItems.filter((item) => {
    if (!item.watch_providers || !Array.isArray(item.watch_providers)) {
      return false;
    }
    return providerIds.some((providerId) => item.watch_providers.includes(providerId));
  });

  console.log('[SubscriptionValue] Items from this service:', serviceItems.length);

  // Count watched items
  const watchedItems = serviceItems.filter((item) => item.status === 'watched');
  const contentWatched = watchedItems.length;

  console.log('[SubscriptionValue] Watched items:', contentWatched);

  // Calculate average rating (only for rated items)
  const ratedItems = watchedItems.filter((item) => item.rating && item.rating > 0);
  const averageRating = ratedItems.length > 0
    ? ratedItems.reduce((sum, item) => sum + (item.rating || 0), 0) / ratedItems.length
    : 0;

  console.log('[SubscriptionValue] Average rating:', averageRating.toFixed(2));

  // Calculate engagement score (cost per item watched)
  const costPerItem = contentWatched > 0 ? monthlyPrice / contentWatched : monthlyPrice;

  // Determine value label and color based on engagement
  let valueLabel = 'New';
  let valueColor = '#6B7280'; // Gray for new/no data
  let engagementScore = 0;

  if (contentWatched >= 10) {
    // High engagement: < $2/item
    if (costPerItem < 2) {
      valueLabel = 'Great Value';
      valueColor = '#10B981'; // Green
      engagementScore = 90;
    }
    // Good engagement: $2-5/item
    else if (costPerItem < 5) {
      valueLabel = 'Good Value';
      valueColor = '#F59E0B'; // Amber
      engagementScore = 70;
    }
    // Low engagement: > $5/item
    else {
      valueLabel = 'Review Usage';
      valueColor = '#EF4444'; // Red
      engagementScore = 40;
    }
  } else if (contentWatched >= 5) {
    // Moderate usage
    if (costPerItem < 3) {
      valueLabel = 'Good Start';
      valueColor = '#10B981';
      engagementScore = 60;
    } else {
      valueLabel = 'Watch More';
      valueColor = '#F59E0B';
      engagementScore = 50;
    }
  } else if (contentWatched > 0) {
    // Low usage
    valueLabel = 'Light Usage';
    valueColor = '#F59E0B';
    engagementScore = 30;
  }

  // Boost score if average rating is high (shows quality engagement)
  if (averageRating >= 4.5) {
    engagementScore = Math.min(100, engagementScore + 10);
  } else if (averageRating >= 4.0) {
    engagementScore = Math.min(100, engagementScore + 5);
  }

  console.log('[SubscriptionValue] Result:', {
    contentWatched,
    averageRating,
    engagementScore,
    valueLabel,
    costPerItem: costPerItem.toFixed(2),
  });

  return {
    contentWatched,
    averageRating,
    engagementScore,
    valueLabel,
    valueColor,
    costPerItem,
  };
};

/**
 * Calculate value for all user subscriptions
 */
export const calculateAllSubscriptionValues = async (
  userId: string
): Promise<Map<string, SubscriptionValueMetrics>> => {
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('id, service_name, price')
    .eq('user_id', userId)
    .eq('status', 'active');

  const results = new Map<string, SubscriptionValueMetrics>();

  if (!subscriptions) return results;

  await Promise.all(
    subscriptions.map(async (sub) => {
      const metrics = await calculateSubscriptionValue(userId, sub.service_name, sub.price);
      results.set(sub.id, metrics);
    })
  );

  return results;
};

export interface ValueContext {
  rating: 'unused' | 'minimal' | 'building' | 'fair' | 'good' | 'excellent';
  headline: string;
  detail: string;
  suggestion: string | null;
  color: string;
  icon: string;
}

/**
 * Get context-aware value messaging based on usage
 */
export const getValueContext = (
  costPerHour: number,
  totalHours: number,
  monthlyCost: number
): ValueContext => {
  // 0 hours: Unused
  if (totalHours === 0) {
    return {
      rating: 'unused',
      headline: 'No Usage This Month',
      detail: `You're paying $${monthlyCost.toFixed(2)}/month with no viewing.`,
      suggestion: 'Consider pausing or explore content to watch.',
      color: '#9CA3AF', // Gray
      icon: 'pause-circle',
    };
  }

  // < 1 hour: Minimal usage
  if (totalHours < 1) {
    return {
      rating: 'minimal',
      headline: 'Minimal Usage',
      detail: `${(totalHours * 60).toFixed(0)} minutes watched on a $${monthlyCost.toFixed(2)} subscription.`,
      suggestion: 'Watch 3+ hours to get reasonable value.',
      color: '#F97316', // Orange
      icon: 'alert-circle',
    };
  }

  // 1-3 hours: Building value
  if (totalHours < 3) {
    return {
      rating: 'building',
      headline: 'Building Value',
      detail: `${totalHours.toFixed(1)} hours so far. Watch ${(3 - totalHours).toFixed(1)} more hours for good value.`,
      suggestion: null,
      color: '#EAB308', // Yellow
      icon: 'trending-up',
    };
  }

  // 3+ hours: Calculate value rating
  let rating: 'fair' | 'good' | 'excellent';
  let color: string;
  let icon: string;
  let suggestion: string;

  if (costPerHour < 2) {
    rating = 'excellent';
    color = '#22C55E'; // Green
    icon = 'star';
    suggestion = 'Great value! Keep it up.';
  } else if (costPerHour < 4) {
    rating = 'good';
    color = '#84CC16'; // Light Green
    icon = 'check-circle';
    suggestion = 'Good value for your money.';
  } else {
    rating = 'fair';
    color = '#F97316'; // Orange
    icon = 'information';
    suggestion = 'Watch more to improve value.';
  }

  return {
    rating,
    headline: `$${costPerHour.toFixed(2)}/hour`,
    detail: `${totalHours.toFixed(1)} hours watched this month.`,
    suggestion,
    color,
    icon,
  };
};
