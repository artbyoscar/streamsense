import { supabase } from '@/config/supabase';
import type {
  UserSubscription,
  UserSubscriptionInsert,
  UserSubscriptionUpdate,
  Profile,
  ProfileInsert,
  ProfileUpdate,
} from '@/types/database';

// Backward compatibility aliases
type Subscription = UserSubscription;
type SubscriptionInsert = UserSubscriptionInsert;
type SubscriptionUpdate = UserSubscriptionUpdate;

/**
 * Database service layer
 * Provides typed helper functions for database operations
 */

// ====================================
// Subscriptions
// ====================================

/**
 * Get all subscriptions for the current user
 */
export async function getSubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('next_billing_date', { ascending: true });

  if (error) throw error;
  return data as Subscription[];
}

/**
 * Get active subscriptions only
 */
export async function getActiveSubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .order('next_billing_date', { ascending: true });

  if (error) throw error;
  return data as Subscription[];
}

/**
 * Get a single subscription by ID
 */
export async function getSubscriptionById(id: string) {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('id', id).single();

  if (error) throw error;
  return data as Subscription;
}

/**
 * Create a new subscription
 */
export async function createSubscription(subscription: SubscriptionInsert) {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(subscription)
    .select()
    .single();

  if (error) throw error;
  return data as Subscription;
}

/**
 * Update a subscription
 */
export async function updateSubscription(id: string, updates: SubscriptionUpdate) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Subscription;
}

/**
 * Delete a subscription
 */
export async function deleteSubscription(id: string) {
  const { error } = await supabase.from('subscriptions').delete().eq('id', id);

  if (error) throw error;
}

/**
 * Get subscriptions by category
 */
export async function getSubscriptionsByCategory(category: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('category', category)
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Subscription[];
}

/**
 * Calculate total monthly spending
 */
export async function calculateMonthlySpending() {
  const subscriptions = await getActiveSubscriptions();

  const total = subscriptions.reduce((sum, sub) => {
    let monthlyAmount = sub.price;

    // Convert to monthly
    switch (sub.billing_cycle) {
      case 'weekly':
        monthlyAmount = sub.price * 4.33; // Average weeks per month
        break;
      case 'quarterly':
        monthlyAmount = sub.price / 3;
        break;
      case 'yearly':
        monthlyAmount = sub.price / 12;
        break;
      // 'monthly' stays the same
    }

    return sum + monthlyAmount;
  }, 0);

  return Math.round(total * 100) / 100; // Round to 2 decimal places
}

/**
 * Get subscriptions expiring soon
 */
export async function getExpiringSubscriptions(daysAhead = 7) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .gte('next_billing_date', today.toISOString())
    .lte('next_billing_date', futureDate.toISOString())
    .order('next_billing_date', { ascending: true });

  if (error) throw error;
  return data as Subscription[];
}

// ====================================
// Profiles
// ====================================

/**
 * Get the current user's profile
 */
export async function getProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data as Profile;
}

/**
 * Create a new profile
 */
export async function createProfile(profile: ProfileInsert) {
  const { data, error } = await supabase.from('profiles').insert(profile).select().single();

  if (error) throw error;
  return data as Profile;
}

/**
 * Update the current user's profile
 */
export async function updateProfile(updates: ProfileUpdate) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

/**
 * Get or create profile for current user
 */
export async function getOrCreateProfile() {
  try {
    return await getProfile();
  } catch (error) {
    // Profile doesn't exist, create it
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    return await createProfile({
      id: user.id,
      email: user.email || '',
    });
  }
}
