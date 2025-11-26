/**
 * Subscription Detection Service
 * Implements intelligent subscription detection with fuzzy matching and pattern recognition
 */

import type { Transaction } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface DetectionResult {
  confidence: number; // 0-100
  merchantMatch: number; // 0-100
  amountConsistency: number; // 0-100
  datePatternScore: number; // 0-100
  suggestedServiceId: string | null;
  suggestedServiceName: string;
  detectedBillingCycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null;
  averageAmount: number;
  transactionCount: number;
  isRecurring: boolean;
}

export interface StreamingService {
  id: string;
  name: string;
  merchant_patterns: string[];
  base_price?: number;
}

export interface RecurringPattern {
  merchantName: string;
  transactions: Transaction[];
  averageAmount: number;
  averageInterval: number; // days
  consistency: number; // 0-1
}

// ============================================================================
// FUZZY STRING MATCHING
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * Returns the number of edits needed to transform one string into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  // Calculate distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-100)
 * Higher score = more similar
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(s1, s2);
  const similarity = (1 - distance / maxLen) * 100;

  return Math.max(0, Math.min(100, similarity));
}

/**
 * Normalize merchant name for better matching
 */
export function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|company)\b/g, '') // Remove company suffixes
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Match merchant name to streaming service using fuzzy matching
 */
export function matchMerchantToService(
  merchantName: string,
  services: StreamingService[]
): { service: StreamingService | null; score: number } {
  let bestMatch: StreamingService | null = null;
  let bestScore = 0;

  const normalizedMerchant = normalizeMerchantName(merchantName);

  for (const service of services) {
    // Check exact pattern matches first (highest priority)
    if (service.merchant_patterns && service.merchant_patterns.length > 0) {
      for (const pattern of service.merchant_patterns) {
        const normalizedPattern = normalizeMerchantName(pattern);

        // Exact substring match
        if (normalizedMerchant.includes(normalizedPattern)) {
          return { service, score: 100 };
        }

        // Fuzzy match
        const similarity = stringSimilarity(normalizedMerchant, normalizedPattern);
        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = service;
        }
      }
    }

    // Also check service name
    const nameScore = stringSimilarity(normalizedMerchant, service.name);
    if (nameScore > bestScore) {
      bestScore = nameScore;
      bestMatch = service;
    }
  }

  return { service: bestMatch, score: bestScore };
}

// ============================================================================
// RECURRING PATTERN DETECTION
// ============================================================================

/**
 * Detect recurring patterns in transactions
 * Groups transactions by merchant and analyzes intervals
 */
export function detectRecurringPatterns(
  transactions: Transaction[]
): RecurringPattern[] {
  // Group transactions by merchant
  const merchantGroups = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    const merchant = normalizeMerchantName(txn.merchant_name);
    if (!merchantGroups.has(merchant)) {
      merchantGroups.set(merchant, []);
    }
    merchantGroups.get(merchant)!.push(txn);
  }

  const patterns: RecurringPattern[] = [];

  // Analyze each merchant group
  for (const [merchantName, txns] of merchantGroups) {
    // Need at least 2 transactions to detect a pattern
    if (txns.length < 2) continue;

    // Sort by date
    const sortedTxns = txns.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate intervals between transactions (in days)
    const intervals: number[] = [];
    for (let i = 1; i < sortedTxns.length; i++) {
      const date1 = new Date(sortedTxns[i - 1].date);
      const date2 = new Date(sortedTxns[i].date);
      const diffDays = Math.round(
        (date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24)
      );
      intervals.push(diffDays);
    }

    // Calculate average interval
    const averageInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    // Calculate interval consistency (standard deviation)
    const variance =
      intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - averageInterval, 2);
      }, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Consistency score (0-1): lower stdDev = higher consistency
    // Allow 7-day variance for monthly subscriptions
    const consistency = Math.max(0, 1 - stdDev / Math.max(averageInterval, 30));

    // Calculate average amount
    const averageAmount =
      sortedTxns.reduce((sum, txn) => sum + txn.amount, 0) / sortedTxns.length;

    patterns.push({
      merchantName,
      transactions: sortedTxns,
      averageAmount,
      averageInterval,
      consistency,
    });
  }

  return patterns;
}

/**
 * Determine billing cycle from average interval
 */
export function determineBillingCycle(
  averageInterval: number
): 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null {
  // Allow ±7 day variance
  if (Math.abs(averageInterval - 7) <= 7) return 'weekly';
  if (Math.abs(averageInterval - 30) <= 7) return 'monthly';
  if (Math.abs(averageInterval - 90) <= 14) return 'quarterly';
  if (Math.abs(averageInterval - 365) <= 30) return 'yearly';

  return null;
}

// ============================================================================
// CONFIDENCE SCORING
// ============================================================================

/**
 * Calculate confidence score for subscription detection
 * Returns score 0-100 based on multiple factors
 */
export function calculateConfidenceScore(
  merchantScore: number,
  amountConsistency: number,
  datePatternScore: number,
  transactionCount: number
): number {
  // Weight factors
  const weights = {
    merchant: 0.4, // 40% - Most important
    amount: 0.25, // 25%
    pattern: 0.25, // 25%
    count: 0.1, // 10%
  };

  // Transaction count score (more transactions = higher confidence)
  const countScore = Math.min(100, (transactionCount / 6) * 100);

  const confidence =
    merchantScore * weights.merchant +
    amountConsistency * weights.amount +
    datePatternScore * weights.pattern +
    countScore * weights.count;

  return Math.round(Math.max(0, Math.min(100, confidence)));
}

/**
 * Calculate amount consistency score
 */
export function calculateAmountConsistency(amounts: number[]): number {
  if (amounts.length === 0) return 0;

  const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

  // Calculate variance
  const variance =
    amounts.reduce((sum, amt) => sum + Math.pow(amt - average, 2), 0) / amounts.length;

  const stdDev = Math.sqrt(variance);

  // Consistency score: allow $2 variance
  const consistency = Math.max(0, 1 - stdDev / 2);

  return consistency * 100;
}

/**
 * Calculate date pattern score based on interval consistency
 */
export function calculateDatePatternScore(consistency: number): number {
  return consistency * 100;
}

// ============================================================================
// MAIN DETECTION ALGORITHM
// ============================================================================

/**
 * Detect subscriptions from transaction history
 * Combines fuzzy matching and pattern recognition
 */
export function detectSubscriptions(
  transactions: Transaction[],
  services: StreamingService[]
): DetectionResult[] {
  const results: DetectionResult[] = [];

  // Detect recurring patterns
  const patterns = detectRecurringPatterns(transactions);

  for (const pattern of patterns) {
    // Skip if not enough transactions
    if (pattern.transactions.length < 2) continue;

    // Match merchant to service
    const { service, score: merchantScore } = matchMerchantToService(
      pattern.merchantName,
      services
    );

    // Calculate amount consistency
    const amounts = pattern.transactions.map((t) => t.amount);
    const amountConsistency = calculateAmountConsistency(amounts);

    // Calculate date pattern score
    const datePatternScore = calculateDatePatternScore(pattern.consistency);

    // Check if it's a recurring pattern
    const billingCycle = determineBillingCycle(pattern.averageInterval);
    const isRecurring = billingCycle !== null && pattern.consistency > 0.7;

    // Calculate overall confidence
    const confidence = calculateConfidenceScore(
      merchantScore,
      amountConsistency,
      datePatternScore,
      pattern.transactions.length
    );

    results.push({
      confidence,
      merchantMatch: merchantScore,
      amountConsistency,
      datePatternScore,
      suggestedServiceId: service?.id || null,
      suggestedServiceName: service?.name || pattern.merchantName,
      detectedBillingCycle: billingCycle,
      averageAmount: pattern.averageAmount,
      transactionCount: pattern.transactions.length,
      isRecurring,
    });
  }

  // Sort by confidence (highest first)
  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect single subscription from a merchant's transactions
 */
export function detectSingleSubscription(
  merchantName: string,
  transactions: Transaction[],
  services: StreamingService[]
): DetectionResult | null {
  if (transactions.length === 0) return null;

  // Match merchant to service
  const { service, score: merchantScore } = matchMerchantToService(merchantName, services);

  // Calculate metrics
  const amounts = transactions.map((t) => t.amount);
  const amountConsistency = calculateAmountConsistency(amounts);

  // Sort and calculate intervals
  const sortedTxns = transactions.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
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
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    const variance =
      intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - averageInterval, 2);
      }, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    consistency = Math.max(0, 1 - stdDev / Math.max(averageInterval, 30));
  }

  const datePatternScore = calculateDatePatternScore(consistency);
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
