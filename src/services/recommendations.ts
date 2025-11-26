/**
 * Recommendations Service
 * Rule-based recommendation engine for subscription optimization
 * Tier 1 AI - No API costs, pure business logic
 */

import { supabase } from '@/lib/supabase';
import type {
  UserSubscription,
  WatchlistItem,
  ViewingLog,
  Transaction,
  BillingCycle,
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export type RecommendationType =
  | 'BUNDLE_OPPORTUNITY'
  | 'UNUSED_SERVICE'
  | 'PRICE_INCREASE'
  | 'ROTATION_SUGGESTION';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  potentialSavings: number; // Monthly savings in dollars
  impactScore: number; // 0-100, higher = more important
  affectedSubscriptions: string[]; // Subscription IDs
  actionable: boolean;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface BundleOpportunity {
  bundleName: string;
  services: string[]; // Service names
  currentMonthlyPrice: number;
  bundleMonthlyPrice: number;
  monthlySavings: number;
  annualSavings: number;
}

export interface UnusedServiceAlert {
  subscriptionId: string;
  serviceName: string;
  monthlyPrice: number;
  lastViewedAt: string | null;
  daysSinceLastViewed: number;
}

export interface PriceIncreaseAlert {
  subscriptionId: string;
  serviceName: string;
  oldPrice: number;
  newPrice: number;
  increaseAmount: number;
  increasePercentage: number;
  detectedAt: string;
}

export interface RotationSuggestion {
  pauseServiceId: string;
  pauseServiceName: string;
  watchServiceId: string;
  watchServiceName: string;
  unwatchedContentCount: number;
  monthlySavings: number;
  reason: string;
}

// ============================================================================
// BUNDLE DEFINITIONS
// ============================================================================

const KNOWN_BUNDLES: Array<{
  name: string;
  services: string[];
  monthlyPrice: number;
  description: string;
}> = [
  {
    name: 'Disney Bundle (Trio)',
    services: ['Disney+', 'Disney Plus', 'Hulu', 'ESPN+', 'ESPN Plus'],
    monthlyPrice: 24.99,
    description: 'Disney+, Hulu, and ESPN+ together',
  },
  {
    name: 'Hulu + Disney+',
    services: ['Disney+', 'Disney Plus', 'Hulu'],
    monthlyPrice: 19.99,
    description: 'Hulu and Disney+ together',
  },
  {
    name: 'Apple One',
    services: [
      'Apple Music',
      'Apple TV+',
      'Apple TV Plus',
      'Apple Arcade',
      'iCloud+',
      'iCloud Plus',
    ],
    monthlyPrice: 19.95,
    description: 'Apple Music, TV+, Arcade, and iCloud+',
  },
  {
    name: 'YouTube Premium Family',
    services: ['YouTube Premium', 'YouTube Music'],
    monthlyPrice: 22.99,
    description: 'YouTube Premium and YouTube Music for family',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert any billing cycle to monthly amount
 */
function calculateMonthlyAmount(price: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly':
      return price * 4.33;
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
 * Generate unique recommendation ID
 */
function generateRecommendationId(type: RecommendationType, ...parts: string[]): string {
  return `${type}-${parts.join('-')}-${Date.now()}`;
}

/**
 * Calculate impact score (0-100)
 */
function calculateImpactScore(
  type: RecommendationType,
  potentialSavings: number,
  metadata: Record<string, any>
): number {
  let score = 0;

  // Base score from savings (max 50 points)
  score += Math.min(potentialSavings * 2, 50);

  // Type-specific bonuses
  switch (type) {
    case 'BUNDLE_OPPORTUNITY':
      // High impact if saving >20%
      if (metadata.savingsPercentage > 20) score += 20;
      break;

    case 'UNUSED_SERVICE':
      // Higher impact the longer it's unused
      const daysSinceViewed = metadata.daysSinceLastViewed || 0;
      if (daysSinceViewed > 60) score += 30;
      else if (daysSinceViewed > 30) score += 20;
      break;

    case 'PRICE_INCREASE':
      // High impact for significant increases
      if (metadata.increasePercentage > 20) score += 25;
      else if (metadata.increasePercentage > 10) score += 15;
      break;

    case 'ROTATION_SUGGESTION':
      // Impact based on unwatched content
      if (metadata.unwatchedContentCount > 5) score += 20;
      break;
  }

  return Math.min(Math.round(score), 100);
}

// ============================================================================
// BUNDLE OPPORTUNITY DETECTION
// ============================================================================

/**
 * Detect bundle opportunities from user's subscriptions
 */
export async function detectBundleOpportunities(
  subscriptions: UserSubscription[]
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');

  for (const bundle of KNOWN_BUNDLES) {
    // Find subscriptions that match bundle services
    const matchingSubscriptions = activeSubscriptions.filter((sub) =>
      bundle.services.some(
        (serviceName) =>
          sub.service_name.toLowerCase().includes(serviceName.toLowerCase()) ||
          serviceName.toLowerCase().includes(sub.service_name.toLowerCase())
      )
    );

    // Need at least 2 services to recommend a bundle
    if (matchingSubscriptions.length >= 2) {
      const currentMonthlyPrice = matchingSubscriptions.reduce(
        (sum, sub) => sum + calculateMonthlyAmount(sub.price, sub.billing_cycle),
        0
      );

      const monthlySavings = currentMonthlyPrice - bundle.monthlyPrice;

      // Only recommend if there's actual savings
      if (monthlySavings > 0) {
        const savingsPercentage = (monthlySavings / currentMonthlyPrice) * 100;

        const recommendation: Recommendation = {
          id: generateRecommendationId(
            'BUNDLE_OPPORTUNITY',
            bundle.name.replace(/\s/g, '-')
          ),
          type: 'BUNDLE_OPPORTUNITY',
          title: `Bundle Opportunity: ${bundle.name}`,
          description: `You're paying $${currentMonthlyPrice.toFixed(
            2
          )}/month for ${matchingSubscriptions
            .map((s) => s.service_name)
            .join(', ')}. Switch to ${bundle.name} for $${bundle.monthlyPrice.toFixed(
            2
          )}/month and save ${savingsPercentage.toFixed(0)}%!`,
          potentialSavings: monthlySavings,
          impactScore: calculateImpactScore('BUNDLE_OPPORTUNITY', monthlySavings, {
            savingsPercentage,
          }),
          affectedSubscriptions: matchingSubscriptions.map((s) => s.id),
          actionable: true,
          metadata: {
            bundleName: bundle.name,
            services: matchingSubscriptions.map((s) => s.service_name),
            currentMonthlyPrice,
            bundleMonthlyPrice: bundle.monthlyPrice,
            monthlySavings,
            annualSavings: monthlySavings * 12,
            savingsPercentage,
            bundleDescription: bundle.description,
          },
          createdAt: new Date().toISOString(),
        };

        recommendations.push(recommendation);
      }
    }
  }

  return recommendations;
}

// ============================================================================
// UNUSED SERVICE DETECTION
// ============================================================================

/**
 * Detect subscriptions with no recent viewing activity
 */
export async function detectUnusedServices(
  subscriptions: UserSubscription[]
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');

  // Get viewing logs for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return recommendations;

  const { data: viewingLogs } = await supabase
    .from('viewing_logs')
    .select('content_id, watched_at, content:content(streaming_service_id)')
    .eq('user_id', user.id)
    .gte('watched_at', thirtyDaysAgo.toISOString());

  for (const subscription of activeSubscriptions) {
    // Check if there are any viewing logs for this service
    const hasRecentActivity = viewingLogs?.some(
      (log) => log.content?.streaming_service_id === subscription.service_id
    );

    if (!hasRecentActivity) {
      const monthlyPrice = calculateMonthlyAmount(subscription.price, subscription.billing_cycle);

      // Find last viewing activity if any
      const { data: lastViewing } = await supabase
        .from('viewing_logs')
        .select('watched_at, content:content(streaming_service_id)')
        .eq('user_id', user.id)
        .eq('content.streaming_service_id', subscription.service_id)
        .order('watched_at', { ascending: false })
        .limit(1)
        .single();

      const lastViewedAt = lastViewing?.watched_at || subscription.created_at;
      const daysSinceLastViewed = Math.floor(
        (new Date().getTime() - new Date(lastViewedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      const recommendation: Recommendation = {
        id: generateRecommendationId('UNUSED_SERVICE', subscription.id),
        type: 'UNUSED_SERVICE',
        title: `${subscription.service_name} appears unused`,
        description: `You haven't watched anything on ${
          subscription.service_name
        } in ${daysSinceLastViewed} days. Consider pausing or cancelling to save $${monthlyPrice.toFixed(
          2
        )}/month.`,
        potentialSavings: monthlyPrice,
        impactScore: calculateImpactScore('UNUSED_SERVICE', monthlyPrice, {
          daysSinceLastViewed,
        }),
        affectedSubscriptions: [subscription.id],
        actionable: true,
        metadata: {
          subscriptionId: subscription.id,
          serviceName: subscription.service_name,
          monthlyPrice,
          lastViewedAt,
          daysSinceLastViewed,
          annualSavings: monthlyPrice * 12,
        },
        createdAt: new Date().toISOString(),
      };

      recommendations.push(recommendation);
    }
  }

  return recommendations;
}

// ============================================================================
// PRICE INCREASE DETECTION
// ============================================================================

/**
 * Detect price increases in subscriptions
 */
export async function detectPriceIncreases(
  subscriptions: UserSubscription[]
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return recommendations;

  for (const subscription of subscriptions) {
    if (subscription.status !== 'active') continue;

    // Get transaction history for this subscription
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, date, merchant_name')
      .eq('user_id', user.id)
      .ilike('merchant_name', `%${subscription.service_name}%`)
      .order('date', { ascending: false })
      .limit(2);

    if (transactions && transactions.length >= 2) {
      const latestTransaction = transactions[0];
      const previousTransaction = transactions[1];

      const latestAmount = Math.abs(latestTransaction.amount);
      const previousAmount = Math.abs(previousTransaction.amount);

      // Detect if price increased by more than $0.50
      if (latestAmount > previousAmount + 0.5) {
        const increaseAmount = latestAmount - previousAmount;
        const increasePercentage = (increaseAmount / previousAmount) * 100;

        // Convert to monthly if needed
        const monthlyIncrease = calculateMonthlyAmount(
          increaseAmount,
          subscription.billing_cycle
        );

        const recommendation: Recommendation = {
          id: generateRecommendationId('PRICE_INCREASE', subscription.id),
          type: 'PRICE_INCREASE',
          title: `${subscription.service_name} price increased`,
          description: `${
            subscription.service_name
          } increased from $${previousAmount.toFixed(
            2
          )} to $${latestAmount.toFixed(
            2
          )} (+${increasePercentage.toFixed(
            0
          )}%). This costs you $${monthlyIncrease.toFixed(2)} more per month.`,
          potentialSavings: 0, // Not a savings opportunity, but worth knowing
          impactScore: calculateImpactScore('PRICE_INCREASE', monthlyIncrease, {
            increasePercentage,
          }),
          affectedSubscriptions: [subscription.id],
          actionable: true,
          metadata: {
            subscriptionId: subscription.id,
            serviceName: subscription.service_name,
            oldPrice: previousAmount,
            newPrice: latestAmount,
            increaseAmount,
            increasePercentage,
            monthlyIncrease,
            annualIncrease: monthlyIncrease * 12,
            detectedAt: latestTransaction.date,
          },
          createdAt: new Date().toISOString(),
        };

        recommendations.push(recommendation);
      }
    }
  }

  return recommendations;
}

// ============================================================================
// ROTATION SUGGESTION
// ============================================================================

/**
 * Suggest service rotation based on watchlist
 */
export async function suggestServiceRotation(
  subscriptions: UserSubscription[]
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return recommendations;

  // Get user's watchlist
  const { data: watchlist } = await supabase
    .from('watchlist_items')
    .select(`
      *,
      content:content(
        *,
        streaming_service_id
      )
    `)
    .eq('user_id', user.id)
    .eq('watched', false);

  if (!watchlist || watchlist.length === 0) return recommendations;

  // Count unwatched content per service
  const contentByService = new Map<string, number>();

  watchlist.forEach((item) => {
    const serviceId = item.content?.streaming_service_id;
    if (serviceId) {
      contentByService.set(serviceId, (contentByService.get(serviceId) || 0) + 1);
    }
  });

  // Find services with lots of unwatched content
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');

  for (const [serviceId, contentCount] of contentByService.entries()) {
    // Need at least 3 unwatched items to suggest rotation
    if (contentCount < 3) continue;

    // Find services with 0 unwatched content
    const unusedSubscriptions = activeSubscriptions.filter(
      (sub) => sub.service_id !== serviceId && !contentByService.has(sub.service_id!)
    );

    for (const unusedSub of unusedSubscriptions) {
      const monthlyPrice = calculateMonthlyAmount(unusedSub.price, unusedSub.billing_cycle);

      // Find the service name for the watchlist service
      const { data: targetService } = await supabase
        .from('streaming_services')
        .select('name')
        .eq('id', serviceId)
        .single();

      if (!targetService) continue;

      const recommendation: Recommendation = {
        id: generateRecommendationId('ROTATION_SUGGESTION', unusedSub.id, serviceId),
        type: 'ROTATION_SUGGESTION',
        title: `Consider rotating to ${targetService.name}`,
        description: `You have ${contentCount} unwatched items on ${targetService.name} but no recent activity on ${unusedSub.service_name}. Pause ${unusedSub.service_name} temporarily to save $${monthlyPrice.toFixed(2)}/month while you watch through your ${targetService.name} list.`,
        potentialSavings: monthlyPrice,
        impactScore: calculateImpactScore('ROTATION_SUGGESTION', monthlyPrice, {
          unwatchedContentCount: contentCount,
        }),
        affectedSubscriptions: [unusedSub.id],
        actionable: true,
        metadata: {
          pauseServiceId: unusedSub.id,
          pauseServiceName: unusedSub.service_name,
          watchServiceId: serviceId,
          watchServiceName: targetService.name,
          unwatchedContentCount: contentCount,
          monthlySavings: monthlyPrice,
          annualSavings: monthlyPrice * 12,
          reason: 'Focus on watchlist content',
        },
        createdAt: new Date().toISOString(),
      };

      recommendations.push(recommendation);
    }
  }

  return recommendations;
}

// ============================================================================
// MAIN RECOMMENDATION ENGINE
// ============================================================================

/**
 * Generate all recommendations for a user
 */
export async function generateRecommendations(
  subscriptions: UserSubscription[]
): Promise<Recommendation[]> {
  const allRecommendations: Recommendation[] = [];

  try {
    // Run all detection algorithms in parallel
    const [bundleRecs, unusedRecs, priceRecs, rotationRecs] = await Promise.all([
      detectBundleOpportunities(subscriptions),
      detectUnusedServices(subscriptions),
      detectPriceIncreases(subscriptions),
      suggestServiceRotation(subscriptions),
    ]);

    allRecommendations.push(...bundleRecs, ...unusedRecs, ...priceRecs, ...rotationRecs);

    // Sort by impact score (highest first)
    allRecommendations.sort((a, b) => b.impactScore - a.impactScore);

    return allRecommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return [];
  }
}

/**
 * Calculate total potential monthly savings
 */
export function calculateTotalSavings(recommendations: Recommendation[]): number {
  return recommendations.reduce((total, rec) => total + rec.potentialSavings, 0);
}

/**
 * Get recommendations by type
 */
export function getRecommendationsByType(
  recommendations: Recommendation[],
  type: RecommendationType
): Recommendation[] {
  return recommendations.filter((rec) => rec.type === type);
}

/**
 * Get high-impact recommendations (score >= 70)
 */
export function getHighImpactRecommendations(
  recommendations: Recommendation[]
): Recommendation[] {
  return recommendations.filter((rec) => rec.impactScore >= 70);
}
