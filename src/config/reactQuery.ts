/**
 * React Query Configuration
 * Optimized settings for data fetching and caching
 */

import { QueryClient } from '@tanstack/react-query';
import { logger } from '@/utils';

/**
 * Optimized Query Client configuration
 *
 * Key optimizations:
 * - Aggressive caching for stable data (5 minutes)
 * - Background refetching for fresh data
 * - Retry with exponential backoff
 * - Network-aware refetching
 * - Proper error handling
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Caching
      staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for 5 min
      gcTime: 1000 * 60 * 10, // 10 minutes - keep unused data for 10 min (formerly cacheTime)

      // Refetching
      refetchOnWindowFocus: true, // Refetch when app comes to foreground
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch on component mount

      // Retry
      retry: 3, // Retry failed requests 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff

      // Network
      networkMode: 'online', // Only fetch when online

      // Error handling
      onError: (error) => {
        logger.error('[React Query] Query error:', error);
      },
    },
    mutations: {
      // Retry
      retry: 1, // Retry mutations once
      retryDelay: 1000,

      // Network
      networkMode: 'online',

      // Error handling
      onError: (error) => {
        logger.error('[React Query] Mutation error:', error);
      },
    },
  },
});

/**
 * Query keys for type-safe queries
 */
export const queryKeys = {
  // User
  user: ['user'] as const,
  userProfile: (userId: string) => ['user', 'profile', userId] as const,

  // Subscriptions
  subscriptions: ['subscriptions'] as const,
  subscriptionDetail: (id: string) => ['subscriptions', id] as const,
  subscriptionStats: ['subscriptions', 'stats'] as const,
  suggestedSubscriptions: ['subscriptions', 'suggested'] as const,

  // Watchlist
  watchlist: ['watchlist'] as const,
  watchlistItem: (id: string) => ['watchlist', id] as const,

  // Content
  content: ['content'] as const,
  contentDetail: (id: string) => ['content', id] as const,
  contentSearch: (query: string) => ['content', 'search', query] as const,

  // Recommendations
  recommendations: ['recommendations'] as const,

  // Plaid
  plaidItems: ['plaid', 'items'] as const,
  plaidTransactions: (itemId: string) => ['plaid', 'transactions', itemId] as const,

  // Premium
  premiumOfferings: ['premium', 'offerings'] as const,
  premiumStatus: ['premium', 'status'] as const,
} as const;

/**
 * Helper to prefetch data
 *
 * @example
 * await prefetchQuery(
 *   queryKeys.subscriptions,
 *   () => fetchSubscriptions(userId)
 * );
 */
export async function prefetchQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
  });
}

/**
 * Helper to invalidate queries
 *
 * @example
 * await invalidateQueries(queryKeys.subscriptions);
 */
export async function invalidateQueries(queryKey: readonly unknown[]): Promise<void> {
  await queryClient.invalidateQueries({ queryKey });
}

/**
 * Helper to set query data
 *
 * @example
 * setQueryData(queryKeys.subscriptions, newData);
 */
export function setQueryData<T>(queryKey: readonly unknown[], data: T): void {
  queryClient.setQueryData(queryKey, data);
}

/**
 * Helper to get query data
 *
 * @example
 * const subscriptions = getQueryData(queryKeys.subscriptions);
 */
export function getQueryData<T>(queryKey: readonly unknown[]): T | undefined {
  return queryClient.getQueryData(queryKey);
}

/**
 * Optimistic update helper
 *
 * @example
 * await optimisticUpdate(
 *   queryKeys.subscriptions,
 *   (old) => [...old, newSubscription],
 *   async () => await createSubscription(data)
 * );
 */
export async function optimisticUpdate<T>(
  queryKey: readonly unknown[],
  optimisticData: (old: T) => T,
  mutationFn: () => Promise<any>
): Promise<void> {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey });

  // Snapshot previous value
  const previousData = queryClient.getQueryData<T>(queryKey);

  // Optimistically update
  if (previousData) {
    queryClient.setQueryData(queryKey, optimisticData(previousData));
  }

  try {
    // Perform mutation
    await mutationFn();

    // Invalidate to refetch
    await queryClient.invalidateQueries({ queryKey });
  } catch (error) {
    // Rollback on error
    if (previousData) {
      queryClient.setQueryData(queryKey, previousData);
    }
    throw error;
  }
}

/**
 * Clear all query cache
 * Use sparingly (e.g., on logout)
 */
export function clearAllQueries(): void {
  queryClient.clear();
  logger.info('[React Query] All queries cleared');
}
