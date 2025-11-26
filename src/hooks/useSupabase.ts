import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as db from '@/services/database';
import type { SubscriptionInsert, SubscriptionUpdate } from '@/types/database';

/**
 * React Query hooks for Supabase operations
 */

// ====================================
// Subscriptions Hooks
// ====================================

/**
 * Hook to fetch all subscriptions
 */
export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: db.getSubscriptions,
  });
}

/**
 * Hook to fetch active subscriptions only
 */
export function useActiveSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions', 'active'],
    queryFn: db.getActiveSubscriptions,
  });
}

/**
 * Hook to fetch a single subscription by ID
 */
export function useSubscription(id: string) {
  return useQuery({
    queryKey: ['subscriptions', id],
    queryFn: () => db.getSubscriptionById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch subscriptions by category
 */
export function useSubscriptionsByCategory(category: string) {
  return useQuery({
    queryKey: ['subscriptions', 'category', category],
    queryFn: () => db.getSubscriptionsByCategory(category),
    enabled: !!category,
  });
}

/**
 * Hook to calculate monthly spending
 */
export function useMonthlySpending() {
  return useQuery({
    queryKey: ['subscriptions', 'monthly-spending'],
    queryFn: db.calculateMonthlySpending,
  });
}

/**
 * Hook to fetch expiring subscriptions
 */
export function useExpiringSubscriptions(daysAhead = 7) {
  return useQuery({
    queryKey: ['subscriptions', 'expiring', daysAhead],
    queryFn: () => db.getExpiringSubscriptions(daysAhead),
  });
}

/**
 * Hook to create a new subscription
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscription: SubscriptionInsert) => db.createSubscription(subscription),
    onSuccess: () => {
      // Invalidate and refetch subscriptions
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

/**
 * Hook to update a subscription
 */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: SubscriptionUpdate }) =>
      db.updateSubscription(id, updates),
    onSuccess: (data, variables) => {
      // Invalidate specific subscription and list
      queryClient.invalidateQueries({ queryKey: ['subscriptions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

/**
 * Hook to delete a subscription
 */
export function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => db.deleteSubscription(id),
    onSuccess: () => {
      // Invalidate subscriptions list
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

// ====================================
// Profile Hooks
// ====================================

/**
 * Hook to fetch the current user's profile
 */
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: db.getOrCreateProfile,
  });
}

/**
 * Hook to update the current user's profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: db.updateProfile,
    onSuccess: () => {
      // Invalidate profile query
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
