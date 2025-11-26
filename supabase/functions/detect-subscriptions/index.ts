/**
 * Detect Subscriptions Edge Function
 * Runs subscription detection algorithm on user transactions
 * Auto-creates high-confidence subscriptions and flags low-confidence for review
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONFIDENCE_THRESHOLD_AUTO = 80; // Auto-create subscriptions above this
const CONFIDENCE_THRESHOLD_SUGGEST = 60; // Suggest subscriptions above this

interface DetectSubscriptionsRequest {
  userId?: string; // Optional - defaults to authenticated user
  minTransactions?: number; // Minimum transactions to consider
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { userId: targetUserId, minTransactions = 2 }: DetectSubscriptionsRequest =
      await req.json().catch(() => ({}));

    const userId = targetUserId || user.id;

    // Verify user can only detect for themselves (unless admin)
    if (userId !== user.id) {
      throw new Error('Unauthorized');
    }

    // Get all streaming services
    const { data: services, error: servicesError } = await supabaseClient
      .from('streaming_services')
      .select('id, name, merchant_patterns, base_price');

    if (servicesError) {
      throw new Error('Failed to fetch streaming services');
    }

    // Get user's transactions (last 365 days)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: transactions, error: txnsError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', oneYearAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (txnsError) {
      throw new Error('Failed to fetch transactions');
    }

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({
          detected: 0,
          created: 0,
          suggested: 0,
          message: 'No transactions found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Group transactions by merchant
    const merchantGroups = groupTransactionsByMerchant(transactions);

    let detectedCount = 0;
    let createdCount = 0;
    let suggestedCount = 0;

    // Analyze each merchant group
    for (const [merchantName, merchantTxns] of Object.entries(merchantGroups)) {
      if (merchantTxns.length < minTransactions) continue;

      const detection = await detectSingleSubscription(
        merchantName,
        merchantTxns,
        services
      );

      if (!detection) continue;

      detectedCount++;

      // Auto-create high-confidence subscriptions
      if (detection.confidence >= CONFIDENCE_THRESHOLD_AUTO) {
        const created = await createSubscription(
          supabaseClient,
          userId,
          detection
        );
        if (created) createdCount++;
      }
      // Suggest medium-confidence subscriptions
      else if (detection.confidence >= CONFIDENCE_THRESHOLD_SUGGEST) {
        const suggested = await createSuggestedSubscription(
          supabaseClient,
          userId,
          detection,
          merchantTxns
        );
        if (suggested) suggestedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        detected: detectedCount,
        created: createdCount,
        suggested: suggestedCount,
        message: `Detected ${detectedCount} potential subscriptions. Created ${createdCount} high-confidence subscriptions. Suggested ${suggestedCount} for review.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in detect-subscriptions:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'Internal server error',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function groupTransactionsByMerchant(transactions: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};

  for (const txn of transactions) {
    const merchant = normalizeMerchantName(txn.merchant_name);
    if (!groups[merchant]) {
      groups[merchant] = [];
    }
    groups[merchant].push(txn);
  }

  return groups;
}

function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|company)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// SUBSCRIPTION DETECTION
// ============================================================================

async function detectSingleSubscription(
  merchantName: string,
  transactions: any[],
  services: any[]
): Promise<any | null> {
  if (transactions.length === 0) return null;

  // Match merchant to service
  const { service, score: merchantScore } = matchMerchantToService(
    merchantName,
    services
  );

  // Calculate amount consistency
  const amounts = transactions.map((t) => t.amount);
  const amountConsistency = calculateAmountConsistency(amounts);

  // Sort and calculate intervals
  const sortedTxns = transactions.sort(
    (a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let averageInterval = 0;
  let consistency = 0;

  if (sortedTxns.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < sortedTxns.length; i++) {
      const date1 = new Date(sortedTxns[i - 1].date);
      const date2 = new Date(sortedTxns[i].date);
      const diffDays = Math.round(
        (date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24)
      );
      intervals.push(diffDays);
    }

    averageInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) /
      intervals.length;

    const variance =
      intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - averageInterval, 2);
      }, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    consistency = Math.max(0, 1 - stdDev / Math.max(averageInterval, 30));
  }

  const datePatternScore = consistency * 100;
  const billingCycle = determineBillingCycle(averageInterval);
  const isRecurring = billingCycle !== null && consistency > 0.7;

  const confidence = calculateConfidenceScore(
    merchantScore,
    amountConsistency,
    datePatternScore,
    transactions.length
  );

  const averageAmount =
    amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

  return {
    confidence,
    merchantMatch: merchantScore,
    amountConsistency,
    datePatternScore,
    suggestedServiceId: service?.id || null,
    suggestedServiceName: service?.name || merchantName,
    detectedBillingCycle: billingCycle,
    averageAmount,
    transactionCount: transactions.length,
    isRecurring,
  };
}

function matchMerchantToService(
  merchantName: string,
  services: any[]
): { service: any | null; score: number } {
  let bestMatch: any | null = null;
  let bestScore = 0;

  const normalizedMerchant = normalizeMerchantName(merchantName);

  for (const service of services) {
    if (service.merchant_patterns && service.merchant_patterns.length > 0) {
      for (const pattern of service.merchant_patterns) {
        const normalizedPattern = normalizeMerchantName(pattern);

        if (normalizedMerchant.includes(normalizedPattern)) {
          return { service, score: 100 };
        }

        const similarity = stringSimilarity(
          normalizedMerchant,
          normalizedPattern
        );
        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = service;
        }
      }
    }

    const nameScore = stringSimilarity(normalizedMerchant, service.name);
    if (nameScore > bestScore) {
      bestScore = nameScore;
      bestMatch = service;
    }
  }

  return { service: bestMatch, score: bestScore };
}

function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(s1, s2);
  const similarity = (1 - distance / maxLen) * 100;

  return Math.max(0, Math.min(100, similarity));
}

function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

function calculateAmountConsistency(amounts: number[]): number {
  if (amounts.length === 0) return 0;

  const average =
    amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

  const variance =
    amounts.reduce((sum, amt) => sum + Math.pow(amt - average, 2), 0) /
    amounts.length;

  const stdDev = Math.sqrt(variance);
  const consistency = Math.max(0, 1 - stdDev / 2);

  return consistency * 100;
}

function calculateConfidenceScore(
  merchantScore: number,
  amountConsistency: number,
  datePatternScore: number,
  transactionCount: number
): number {
  const weights = {
    merchant: 0.4,
    amount: 0.25,
    pattern: 0.25,
    count: 0.1,
  };

  const countScore = Math.min(100, (transactionCount / 6) * 100);

  const confidence =
    merchantScore * weights.merchant +
    amountConsistency * weights.amount +
    datePatternScore * weights.pattern +
    countScore * weights.count;

  return Math.round(Math.max(0, Math.min(100, confidence)));
}

function determineBillingCycle(
  averageInterval: number
): 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null {
  if (Math.abs(averageInterval - 7) <= 7) return 'weekly';
  if (Math.abs(averageInterval - 30) <= 7) return 'monthly';
  if (Math.abs(averageInterval - 90) <= 14) return 'quarterly';
  if (Math.abs(averageInterval - 365) <= 30) return 'yearly';

  return null;
}

// ============================================================================
// SUBSCRIPTION CREATION
// ============================================================================

async function createSubscription(
  supabaseClient: any,
  userId: string,
  detection: any
): Promise<boolean> {
  try {
    // Check if subscription already exists
    const { data: existing } = await supabaseClient
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('service_name', detection.suggestedServiceName)
      .eq('status', 'active')
      .single();

    if (existing) {
      return false; // Already exists
    }

    // Create subscription
    const { error } = await supabaseClient
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        service_id: detection.suggestedServiceId,
        service_name: detection.suggestedServiceName,
        price: detection.averageAmount,
        billing_cycle: detection.detectedBillingCycle || 'monthly',
        status: 'active',
        detected_from: 'plaid',
      });

    return !error;
  } catch (error) {
    console.error('Error creating subscription:', error);
    return false;
  }
}

async function createSuggestedSubscription(
  supabaseClient: any,
  userId: string,
  detection: any,
  transactions: any[]
): Promise<boolean> {
  try {
    // Check if suggestion already exists
    const { data: existing } = await supabaseClient
      .from('suggested_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('merchant_name', detection.suggestedServiceName)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return false; // Already exists
    }

    // Create suggestion
    const { error } = await supabaseClient
      .from('suggested_subscriptions')
      .insert({
        user_id: userId,
        service_id: detection.suggestedServiceId,
        merchant_name: detection.suggestedServiceName,
        confidence_score: detection.confidence,
        suggested_amount: detection.averageAmount,
        suggested_billing_cycle: detection.detectedBillingCycle || 'monthly',
        transaction_count: detection.transactionCount,
        detection_metadata: {
          merchantMatch: detection.merchantMatch,
          amountConsistency: detection.amountConsistency,
          datePatternScore: detection.datePatternScore,
          isRecurring: detection.isRecurring,
        },
        status: 'pending',
      });

    return !error;
  } catch (error) {
    console.error('Error creating suggested subscription:', error);
    return false;
  }
}
