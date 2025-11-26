/**
 * Subscriptions Feature
 * Central export for subscriptions functionality
 */

// Store
export { useSubscriptionsStore, formatCurrency } from './store/subscriptionsStore';
export type {
  SuggestedSubscription,
  SubscriptionStats,
  UpcomingRenewal,
} from './store/subscriptionsStore';

// Hooks
export {
  useSubscriptions,
  useActiveSubscriptions,
  useSubscription,
  useSubscriptionStats,
  useUpcomingRenewals,
  useSuggestedSubscriptions,
  useCreateSubscription,
  useUpdateSubscription,
  useUpdateSubscriptionStatus,
  useDeleteSubscription,
  useAcceptSuggestion,
  useRejectSuggestion,
  useSubscriptionsData,
  calculateMonthlySpend,
  calculateAnnualSpend,
  groupByService,
  getServiceBreakdown,
  subscriptionsKeys,
} from './hooks/useSubscriptions';

// Services
export * as subscriptionsService from './services/subscriptionsService';

// Screens
export { SubscriptionDetailScreen } from './screens/SubscriptionDetailScreen';
