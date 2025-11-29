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
