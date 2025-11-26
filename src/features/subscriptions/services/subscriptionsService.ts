/**
 * Subscriptions Service
 * API calls for subscription management
 */

import { supabase } from '@/config/supabase';
import type {
  UserSubscription,
  UserSubscriptionInsert,
  UserSubscriptionUpdate,
  SubscriptionStatus,
  BillingCycle,
} from '@/types';

// ============================================================================
// FETCH SUBSCRIPTIONS
// ============================================================================

/**
 * Fetch all subscriptions for the current user
 */
export async function fetchSubscriptions(): Promise<UserSubscription[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      service:streaming_services(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Fetch active subscriptions only
 */
export async function fetchActiveSubscriptions(): Promise<UserSubscription[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      service:streaming_services(*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Fetch single subscription by ID
 */
export async function fetchSubscriptionById(
  subscriptionId: string
): Promise<UserSubscription> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      service:streaming_services(*)
    `)
    .eq('id', subscriptionId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// ============================================================================
// CREATE SUBSCRIPTION
// ============================================================================

/**
 * Create a new subscription
 */
export async function createSubscription(
  subscription: UserSubscriptionInsert
): Promise<UserSubscription> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      ...subscription,
      user_id: user.id,
    })
    .select(`
      *,
      service:streaming_services(*)
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// ============================================================================
// UPDATE SUBSCRIPTION
// ============================================================================

/**
 * Update an existing subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: UserSubscriptionUpdate
): Promise<UserSubscription> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select(`
      *,
      service:streaming_services(*)
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus
): Promise<UserSubscription> {
  const updates: UserSubscriptionUpdate = { status };

  if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString();
  }

  return updateSubscription(subscriptionId, updates);
}

// ============================================================================
// DELETE SUBSCRIPTION
// ============================================================================

/**
 * Delete a subscription
 */
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_subscriptions')
    .delete()
    .eq('id', subscriptionId);

  if (error) {
    throw new Error(error.message);
  }
}

// ============================================================================
// SUBSCRIPTION STATISTICS
// ============================================================================

/**
 * Get subscription statistics
 */
export async function fetchSubscriptionStats(): Promise<{
  totalActive: number;
  totalCancelled: number;
  monthlySpending: number;
  yearlySpending: number;
  mostExpensiveService: string | null;
  mostExpensivePrice: number | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('get_subscription_stats', {
    p_user_id: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] || {
    totalActive: 0,
    totalCancelled: 0,
    monthlySpending: 0,
    yearlySpending: 0,
    mostExpensiveService: null,
    mostExpensivePrice: null,
  };
}

/**
 * Get upcoming renewals
 */
export async function fetchUpcomingRenewals(daysAhead: number = 7): Promise<
  Array<{
    subscriptionId: string;
    serviceName: string;
    price: number;
    nextBillingDate: string;
    daysUntilRenewal: number;
  }>
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('get_upcoming_renewals', {
    p_user_id: user.id,
    p_days_ahead: daysAhead,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

// ============================================================================
// SUGGESTED SUBSCRIPTIONS
// ============================================================================

/**
 * Fetch pending subscription suggestions
 */
export async function fetchSuggestedSubscriptions(): Promise<any[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('suggested_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('confidence_score', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Accept a suggested subscription
 */
export async function acceptSuggestedSubscription(
  suggestionId: string
): Promise<UserSubscription> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get the suggestion
  const { data: suggestion, error: fetchError } = await supabase
    .from('suggested_subscriptions')
    .select('*')
    .eq('id', suggestionId)
    .single();

  if (fetchError || !suggestion) {
    throw new Error('Suggestion not found');
  }

  // Create subscription from suggestion
  const subscription = await createSubscription({
    service_id: suggestion.service_id,
    service_name: suggestion.merchant_name,
    price: suggestion.suggested_amount,
    billing_cycle: suggestion.suggested_billing_cycle,
    status: 'active',
    detected_from: 'plaid',
  });

  // Update suggestion status
  await supabase
    .from('suggested_subscriptions')
    .update({
      status: 'accepted',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  return subscription;
}

/**
 * Reject a suggested subscription
 */
export async function rejectSuggestedSubscription(suggestionId: string): Promise<void> {
  await supabase
    .from('suggested_subscriptions')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);
}
