/**
 * useSubscriptions Hook
 * React Query integration for subscriptions with caching and automatic refetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  UserSubscription,
  UserSubscriptionInsert,
  UserSubscriptionUpdate,
  SubscriptionStatus,
} from '@/types';
import * as subscriptionsService from '../services/subscriptionsService';
import { useSubscriptionsStore } from '../store/subscriptionsStore';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const subscriptionsKeys = {
  all: ['subscriptions'] as const,
  lists: () => [...subscriptionsKeys.all, 'list'] as const,
  list: (filters: string) => [...subscriptionsKeys.lists(), { filters }] as const,
  details: () => [...subscriptionsKeys.all, 'detail'] as const,
  detail: (id: string) => [...subscriptionsKeys.details(), id] as const,
  stats: () => [...subscriptionsKeys.all, 'stats'] as const,
  renewals: (days: number) => [...subscriptionsKeys.all, 'renewals', days] as const,
  suggestions: () => [...subscriptionsKeys.all, 'suggestions'] as const,
};

// ============================================================================
// FETCH HOOKS
// ============================================================================

/**
 * Fetch all subscriptions with React Query
 */
export function useSubscriptions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: subscriptionsKeys.lists(),
    queryFn: subscriptionsService.fetchSubscriptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });

  return {
    ...query,
    subscriptions: query.data || [],
    refetch,
  };
}

/**
 * Fetch active subscriptions only
 */
export function useActiveSubscriptions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: subscriptionsKeys.list('active'),
    queryFn: subscriptionsService.fetchActiveSubscriptions,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });

  return {
    ...query,
    subscriptions: query.data || [],
    refetch,
  };
}

/**
 * Fetch subscription by ID
 */
export function useSubscription(subscriptionId: string) {
  return useQuery({
    queryKey: subscriptionsKeys.detail(subscriptionId),
    queryFn: () => subscriptionsService.fetchSubscriptionById(subscriptionId),
    enabled: !!subscriptionId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch subscription statistics
 */
export function useSubscriptionStats() {
  return useQuery({
    queryKey: subscriptionsKeys.stats(),
    queryFn: subscriptionsService.fetchSubscriptionStats,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch upcoming renewals
 */
export function useUpcomingRenewals(daysAhead: number = 7) {
  return useQuery({
    queryKey: subscriptionsKeys.renewals(daysAhead),
    queryFn: () => subscriptionsService.fetchUpcomingRenewals(daysAhead),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch suggested subscriptions
 */
export function useSuggestedSubscriptions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: subscriptionsKeys.suggestions(),
    queryFn: subscriptionsService.fetchSuggestedSubscriptions,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: subscriptionsKeys.suggestions() });

  return {
    ...query,
    suggestions: query.data || [],
    refetch,
  };
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create subscription mutation
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscription: UserSubscriptionInsert) =>
      subscriptionsService.createSubscription(subscription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
    },
  });
}

/**
 * Update subscription mutation
 */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UserSubscriptionUpdate;
    }) => subscriptionsService.updateSubscription(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.detail(variables.id) });
    },
  });
}

/**
 * Update subscription status mutation
 */
export function useUpdateSubscriptionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SubscriptionStatus }) =>
      subscriptionsService.updateSubscriptionStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete subscription mutation
 */
export function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => subscriptionsService.deleteSubscription(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
      queryClient.removeQueries({ queryKey: subscriptionsKeys.detail(id) });
    },
  });
}

/**
 * Accept suggested subscription mutation
 */
export function useAcceptSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (suggestionId: string) =>
      subscriptionsService.acceptSuggestedSubscription(suggestionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.suggestions() });
    },
  });
}

/**
 * Reject suggested subscription mutation
 */
export function useRejectSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (suggestionId: string) =>
      subscriptionsService.rejectSuggestedSubscription(suggestionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.suggestions() });
    },
  });
}

// ============================================================================
// COMPUTED/DERIVED VALUES
// ============================================================================

/**
 * Calculate total monthly spend from subscriptions
 */
export function calculateMonthlySpend(subscriptions: UserSubscription[]): number {
  return subscriptions
    .filter((sub) => sub.status === 'active')
    .reduce((total, sub) => {
      let monthlyAmount = sub.price;

      switch (sub.billing_cycle) {
        case 'weekly':
          monthlyAmount = sub.price * 4.33;
          break;
        case 'quarterly':
          monthlyAmount = sub.price / 3;
          break;
        case 'yearly':
          monthlyAmount = sub.price / 12;
          break;
      }

      return total + monthlyAmount;
    }, 0);
}

/**
 * Calculate total annual spend
 */
export function calculateAnnualSpend(subscriptions: UserSubscription[]): number {
  return calculateMonthlySpend(subscriptions) * 12;
}

/**
 * Group subscriptions by service
 */
export function groupByService(
  subscriptions: UserSubscription[]
): Map<string, UserSubscription[]> {
  const grouped = new Map<string, UserSubscription[]>();

  subscriptions.forEach((sub) => {
    const serviceName = sub.service_name;
    if (!grouped.has(serviceName)) {
      grouped.set(serviceName, []);
    }
    grouped.get(serviceName)!.push(sub);
  });

  return grouped;
}

/**
 * Get subscription breakdown by service
 */
export function getServiceBreakdown(subscriptions: UserSubscription[]): Array<{
  serviceName: string;
  count: number;
  monthlyTotal: number;
  subscriptions: UserSubscription[];
}> {
  const grouped = groupByService(subscriptions);
  const breakdown: Array<{
    serviceName: string;
    count: number;
    monthlyTotal: number;
    subscriptions: UserSubscription[];
  }> = [];

  grouped.forEach((subs, serviceName) => {
    const monthlyTotal = calculateMonthlySpend(subs);
    breakdown.push({
      serviceName,
      count: subs.length,
      monthlyTotal,
      subscriptions: subs,
    });
  });

  return breakdown.sort((a, b) => b.monthlyTotal - a.monthlyTotal);
}

// ============================================================================
// COMBINED HOOK
// ============================================================================

/**
 * Combined hook with all subscription data and actions
 */
export function useSubscriptionsData() {
  const { subscriptions, isLoading, error, refetch } = useSubscriptions();
  const { suggestions } = useSuggestedSubscriptions();
  const { data: stats } = useSubscriptionStats();
  const { data: upcomingRenewals } = useUpcomingRenewals(7);

  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();
  const deleteMutation = useDeleteSubscription();
  const acceptMutation = useAcceptSuggestion();
  const rejectMutation = useRejectSuggestion();

  const monthlySpend = calculateMonthlySpend(subscriptions);
  const annualSpend = calculateAnnualSpend(subscriptions);
  const activeSubscriptions = subscriptions.filter((sub) => sub.status === 'active');
  const serviceBreakdown = getServiceBreakdown(subscriptions);

  return {
    // Data
    subscriptions,
    suggestions,
    stats,
    upcomingRenewals: upcomingRenewals || [],
    activeSubscriptions,
    serviceBreakdown,

    // Computed
    monthlySpend,
    annualSpend,
    totalActive: activeSubscriptions.length,
    totalCancelled: subscriptions.filter((sub) => sub.status === 'cancelled').length,

    // State
    isLoading,
    error,

    // Actions
    refetch,
    createSubscription: createMutation.mutateAsync,
    updateSubscription: updateMutation.mutateAsync,
    deleteSubscription: deleteMutation.mutateAsync,
    acceptSuggestion: acceptMutation.mutateAsync,
    rejectSuggestion: rejectMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
