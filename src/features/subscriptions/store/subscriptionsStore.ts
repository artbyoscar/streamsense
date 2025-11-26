/**
 * Subscriptions Store
 * Global state management for subscriptions using Zustand
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  UserSubscription,
  UserSubscriptionInsert,
  UserSubscriptionUpdate,
  SubscriptionStatus,
  BillingCycle,
} from '@/types';
import * as subscriptionsService from '../services/subscriptionsService';

// ============================================================================
// TYPES
// ============================================================================

export interface SuggestedSubscription {
  id: string;
  userId: string;
  serviceId: string | null;
  merchantName: string;
  confidenceScore: number;
  suggestedAmount: number;
  suggestedBillingCycle: BillingCycle;
  transactionCount: number;
  detectionMetadata: any;
  status: 'pending' | 'accepted' | 'rejected' | 'ignored';
  reviewedAt: string | null;
  createdAt: string;
}

export interface SubscriptionStats {
  totalActive: number;
  totalCancelled: number;
  monthlySpending: number;
  yearlySpending: number;
  mostExpensiveService: string | null;
  mostExpensivePrice: number | null;
}

export interface UpcomingRenewal {
  subscriptionId: string;
  serviceName: string;
  price: number;
  nextBillingDate: string;
  daysUntilRenewal: number;
}

interface SubscriptionsState {
  // State
  subscriptions: UserSubscription[];
  suggestedSubscriptions: SuggestedSubscription[];
  stats: SubscriptionStats | null;
  upcomingRenewals: UpcomingRenewal[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSubscriptions: () => Promise<void>;
  fetchActiveSubscriptions: () => Promise<void>;
  fetchSubscriptionStats: () => Promise<void>;
  fetchUpcomingRenewals: (daysAhead?: number) => Promise<void>;
  fetchSuggestedSubscriptions: () => Promise<void>;
  addSubscription: (subscription: UserSubscriptionInsert) => Promise<UserSubscription>;
  updateSubscription: (
    id: string,
    updates: UserSubscriptionUpdate
  ) => Promise<UserSubscription>;
  updateSubscriptionStatus: (id: string, status: SubscriptionStatus) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  acceptSuggestion: (suggestionId: string) => Promise<void>;
  rejectSuggestion: (suggestionId: string) => Promise<void>;
  reset: () => void;

  // Computed/Derived Values
  getTotalMonthlySpend: () => number;
  getTotalAnnualSpend: () => number;
  getActiveSubscriptions: () => UserSubscription[];
  getSubscriptionsByService: () => Map<string, UserSubscription[]>;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  subscriptions: [],
  suggestedSubscriptions: [],
  stats: null,
  upcomingRenewals: [],
  isLoading: false,
  error: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useSubscriptionsStore = create<SubscriptionsState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================================================
      // FETCH SUBSCRIPTIONS
      // ========================================================================

      fetchSubscriptions: async () => {
        set({ isLoading: true, error: null });
        try {
          const subscriptions = await subscriptionsService.fetchSubscriptions();
          set({ subscriptions, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      fetchActiveSubscriptions: async () => {
        set({ isLoading: true, error: null });
        try {
          const subscriptions = await subscriptionsService.fetchActiveSubscriptions();
          set({ subscriptions, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      fetchSubscriptionStats: async () => {
        set({ isLoading: true, error: null });
        try {
          const stats = await subscriptionsService.fetchSubscriptionStats();
          set({ stats, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      fetchUpcomingRenewals: async (daysAhead = 7) => {
        set({ isLoading: true, error: null });
        try {
          const upcomingRenewals = await subscriptionsService.fetchUpcomingRenewals(
            daysAhead
          );
          set({ upcomingRenewals, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      fetchSuggestedSubscriptions: async () => {
        set({ isLoading: true, error: null });
        try {
          const suggestedSubscriptions =
            await subscriptionsService.fetchSuggestedSubscriptions();
          set({ suggestedSubscriptions, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // ========================================================================
      // ADD SUBSCRIPTION
      // ========================================================================

      addSubscription: async (subscription: UserSubscriptionInsert) => {
        set({ isLoading: true, error: null });
        try {
          const newSubscription = await subscriptionsService.createSubscription(
            subscription
          );
          set((state) => ({
            subscriptions: [newSubscription, ...state.subscriptions],
            isLoading: false,
          }));
          return newSubscription;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // ========================================================================
      // UPDATE SUBSCRIPTION
      // ========================================================================

      updateSubscription: async (id: string, updates: UserSubscriptionUpdate) => {
        set({ isLoading: true, error: null });
        try {
          const updatedSubscription = await subscriptionsService.updateSubscription(
            id,
            updates
          );
          set((state) => ({
            subscriptions: state.subscriptions.map((sub) =>
              sub.id === id ? updatedSubscription : sub
            ),
            isLoading: false,
          }));
          return updatedSubscription;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateSubscriptionStatus: async (id: string, status: SubscriptionStatus) => {
        set({ isLoading: true, error: null });
        try {
          const updatedSubscription =
            await subscriptionsService.updateSubscriptionStatus(id, status);
          set((state) => ({
            subscriptions: state.subscriptions.map((sub) =>
              sub.id === id ? updatedSubscription : sub
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // ========================================================================
      // DELETE SUBSCRIPTION
      // ========================================================================

      deleteSubscription: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await subscriptionsService.deleteSubscription(id);
          set((state) => ({
            subscriptions: state.subscriptions.filter((sub) => sub.id !== id),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // ========================================================================
      // SUGGESTED SUBSCRIPTIONS
      // ========================================================================

      acceptSuggestion: async (suggestionId: string) => {
        set({ isLoading: true, error: null });
        try {
          const newSubscription = await subscriptionsService.acceptSuggestedSubscription(
            suggestionId
          );
          set((state) => ({
            subscriptions: [newSubscription, ...state.subscriptions],
            suggestedSubscriptions: state.suggestedSubscriptions.filter(
              (s) => s.id !== suggestionId
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      rejectSuggestion: async (suggestionId: string) => {
        set({ isLoading: true, error: null });
        try {
          await subscriptionsService.rejectSuggestedSubscription(suggestionId);
          set((state) => ({
            suggestedSubscriptions: state.suggestedSubscriptions.filter(
              (s) => s.id !== suggestionId
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // ========================================================================
      // RESET
      // ========================================================================

      reset: () => {
        set(initialState);
      },

      // ========================================================================
      // COMPUTED/DERIVED VALUES
      // ========================================================================

      getTotalMonthlySpend: () => {
        const { subscriptions } = get();
        return subscriptions
          .filter((sub) => sub.status === 'active')
          .reduce((total, sub) => {
            const monthlyAmount = calculateMonthlyAmount(sub.price, sub.billing_cycle);
            return total + monthlyAmount;
          }, 0);
      },

      getTotalAnnualSpend: () => {
        return get().getTotalMonthlySpend() * 12;
      },

      getActiveSubscriptions: () => {
        return get().subscriptions.filter((sub) => sub.status === 'active');
      },

      getSubscriptionsByService: () => {
        const { subscriptions } = get();
        const grouped = new Map<string, UserSubscription[]>();

        subscriptions.forEach((sub) => {
          const serviceName = sub.service_name;
          if (!grouped.has(serviceName)) {
            grouped.set(serviceName, []);
          }
          grouped.get(serviceName)!.push(sub);
        });

        return grouped;
      },
    }),
    { name: 'SubscriptionsStore' }
  )
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate monthly amount from any billing cycle
 */
function calculateMonthlyAmount(price: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly':
      return price * 4.33; // Average weeks per month
    case 'monthly':
      return price;
    case 'quarterly':
      return price / 3;
    case 'yearly':
      return price / 12;
    default:
      return price;
  }
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
