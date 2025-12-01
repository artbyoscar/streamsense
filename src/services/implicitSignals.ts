/**
 * Implicit Signals Service
 * Tracks negative signals from user behavior
 *
 * Philosophy: What users DON'T add is as informative as what they DO add
 *
 * Signals:
 * - Content shown but not added (implicit rejection)
 * - Content shown multiple times without engagement (strong rejection)
 * - Patterns in rejected content (genre, rating, era, etc.)
 */

import { supabase } from '@/config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
export const IMPLICIT_CONFIG = {
  STRONG_REJECTION_THRESHOLD: 10,  // Shown 10+ times = strong rejection
  CACHE_KEY: 'streamsense_implicit_signals',
  CACHE_DURATION_DAYS: 7,          // Keep rejection data for 7 days
  MIN_PATTERN_FREQUENCY: 3,        // Need 3+ rejections to identify pattern
} as const;

export interface ImplicitRejection {
  contentId: number;
  contentTitle: string;
  genreIds: number[];
  rating: number;
  mediaType: 'movie' | 'tv';
  shownCount: number;
  firstShownAt: Date;
  lastShownAt: Date;
  context: 'for_you' | 'discover' | 'genre_filter' | 'browse';
}

export interface RejectionPattern {
  type: 'genre' | 'rating_range' | 'era' | 'media_type';
  value: string | number;
  frequency: number;
  confidence: number; // 0-1
}

export interface NegativeSignals {
  strongRejections: ImplicitRejection[];    // Shown 10+ times
  rejectionPatterns: RejectionPattern[];    // Common patterns
  avoidGenres: number[];                    // Genres to downweight
  avoidRatingRange?: { min: number; max: number }; // Rating ranges to avoid
}

// In-memory cache for performance
let implicitSignalsCache: Map<string, ImplicitRejection[]> = new Map();

/**
 * Track that content was shown to user
 * Call this when displaying recommendations to the user
 */
export const trackContentImpression = async (
  userId: string,
  contentItems: {
    id: number;
    title: string;
    genreIds?: number[];
    rating?: number;
    mediaType: 'movie' | 'tv';
  }[],
  context: 'for_you' | 'discover' | 'genre_filter' | 'browse' = 'for_you'
): Promise<void> => {
  try {
    // Load existing impressions
    const existingImpressions = await getImpressions(userId);
    const impressionMap = new Map(existingImpressions.map(imp => [imp.contentId, imp]));

    // Update or create impressions
    const now = new Date();
    contentItems.forEach(item => {
      const existing = impressionMap.get(item.id);
      if (existing) {
        // Increment shown count
        existing.shownCount++;
        existing.lastShownAt = now;
      } else {
        // Create new impression
        impressionMap.set(item.id, {
          contentId: item.id,
          contentTitle: item.title || 'Unknown',
          genreIds: item.genreIds || [],
          rating: item.rating || 0,
          mediaType: item.mediaType,
          shownCount: 1,
          firstShownAt: now,
          lastShownAt: now,
          context,
        });
      }
    });

    // Save to cache
    const updatedImpressions = Array.from(impressionMap.values());
    await saveImpressions(userId, updatedImpressions);

    console.log('[ImplicitSignals] Tracked', contentItems.length, 'impressions for user', userId);
  } catch (error) {
    console.error('[ImplicitSignals] Error tracking impressions:', error);
  }
};

/**
 * Mark content as added to watchlist (removes from rejections)
 */
export const markContentAsAdded = async (
  userId: string,
  contentId: number
): Promise<void> => {
  try {
    const impressions = await getImpressions(userId);
    const filtered = impressions.filter(imp => imp.contentId !== contentId);
    await saveImpressions(userId, filtered);

    console.log('[ImplicitSignals] Removed content', contentId, 'from rejections (user added it)');
  } catch (error) {
    console.error('[ImplicitSignals] Error marking content as added:', error);
  }
};

/**
 * Get all impressions for user
 */
const getImpressions = async (userId: string): Promise<ImplicitRejection[]> => {
  try {
    // Check in-memory cache first
    if (implicitSignalsCache.has(userId)) {
      return implicitSignalsCache.get(userId) || [];
    }

    // Load from AsyncStorage
    const cacheKey = `${IMPLICIT_CONFIG.CACHE_KEY}_${userId}`;
    const cached = await AsyncStorage.getItem(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if cache is still valid
      const cacheAge = Date.now() - parsed.timestamp;
      const maxAge = IMPLICIT_CONFIG.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000;

      if (cacheAge < maxAge) {
        const impressions = parsed.impressions.map((imp: any) => ({
          ...imp,
          firstShownAt: new Date(imp.firstShownAt),
          lastShownAt: new Date(imp.lastShownAt),
        }));
        implicitSignalsCache.set(userId, impressions);
        return impressions;
      }
    }

    return [];
  } catch (error) {
    console.error('[ImplicitSignals] Error getting impressions:', error);
    return [];
  }
};

/**
 * Save impressions to storage
 */
const saveImpressions = async (
  userId: string,
  impressions: ImplicitRejection[]
): Promise<void> => {
  try {
    const cacheKey = `${IMPLICIT_CONFIG.CACHE_KEY}_${userId}`;
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      impressions,
      timestamp: Date.now(),
    }));

    // Update in-memory cache
    implicitSignalsCache.set(userId, impressions);
  } catch (error) {
    console.error('[ImplicitSignals] Error saving impressions:', error);
  }
};

/**
 * Get frequently rejected content (strong negative signals)
 */
export const getStrongRejections = async (
  userId: string
): Promise<ImplicitRejection[]> => {
  const impressions = await getImpressions(userId);
  return impressions.filter(
    imp => imp.shownCount >= IMPLICIT_CONFIG.STRONG_REJECTION_THRESHOLD
  );
};

/**
 * Extract patterns from rejected content
 */
export const extractRejectionPatterns = async (
  userId: string
): Promise<RejectionPattern[]> => {
  try {
    const strongRejections = await getStrongRejections(userId);

    if (strongRejections.length === 0) {
      return [];
    }

    const patterns: RejectionPattern[] = [];

    // 1. Genre patterns
    const genreFrequency = new Map<number, number>();
    strongRejections.forEach(rej => {
      rej.genreIds.forEach(genreId => {
        genreFrequency.set(genreId, (genreFrequency.get(genreId) || 0) + 1);
      });
    });

    genreFrequency.forEach((count, genreId) => {
      if (count >= IMPLICIT_CONFIG.MIN_PATTERN_FREQUENCY) {
        patterns.push({
          type: 'genre',
          value: genreId,
          frequency: count,
          confidence: Math.min(count / strongRejections.length, 1.0),
        });
      }
    });

    // 2. Rating range patterns
    const lowRatingCount = strongRejections.filter(r => r.rating < 6.0).length;
    const midRatingCount = strongRejections.filter(r => r.rating >= 6.0 && r.rating < 7.5).length;
    const highRatingCount = strongRejections.filter(r => r.rating >= 7.5).length;

    if (lowRatingCount >= IMPLICIT_CONFIG.MIN_PATTERN_FREQUENCY) {
      patterns.push({
        type: 'rating_range',
        value: 'low',
        frequency: lowRatingCount,
        confidence: lowRatingCount / strongRejections.length,
      });
    }
    if (midRatingCount >= IMPLICIT_CONFIG.MIN_PATTERN_FREQUENCY) {
      patterns.push({
        type: 'rating_range',
        value: 'mid',
        frequency: midRatingCount,
        confidence: midRatingCount / strongRejections.length,
      });
    }

    // 3. Media type patterns
    const movieCount = strongRejections.filter(r => r.mediaType === 'movie').length;
    const tvCount = strongRejections.filter(r => r.mediaType === 'tv').length;

    if (movieCount >= IMPLICIT_CONFIG.MIN_PATTERN_FREQUENCY && movieCount > tvCount * 2) {
      patterns.push({
        type: 'media_type',
        value: 'movie',
        frequency: movieCount,
        confidence: movieCount / strongRejections.length,
      });
    }
    if (tvCount >= IMPLICIT_CONFIG.MIN_PATTERN_FREQUENCY && tvCount > movieCount * 2) {
      patterns.push({
        type: 'media_type',
        value: 'tv',
        frequency: tvCount,
        confidence: tvCount / strongRejections.length,
      });
    }

    console.log('[ImplicitSignals] Extracted', patterns.length, 'rejection patterns');
    return patterns.sort((a, b) => b.confidence - a.confidence);
  } catch (error) {
    console.error('[ImplicitSignals] Error extracting patterns:', error);
    return [];
  }
};

/**
 * Get comprehensive negative signals for user
 */
export const getNegativeSignals = async (
  userId: string
): Promise<NegativeSignals> => {
  try {
    const strongRejections = await getStrongRejections(userId);
    const patterns = await extractRejectionPatterns(userId);

    // Extract avoid genres (high confidence genre rejections)
    const avoidGenres = patterns
      .filter(p => p.type === 'genre' && p.confidence >= 0.5)
      .map(p => p.value as number);

    // Extract rating range to avoid
    const avoidLowRatings = patterns.find(
      p => p.type === 'rating_range' && p.value === 'low' && p.confidence >= 0.5
    );

    return {
      strongRejections,
      rejectionPatterns: patterns,
      avoidGenres,
      avoidRatingRange: avoidLowRatings ? { min: 0, max: 6.0 } : undefined,
    };
  } catch (error) {
    console.error('[ImplicitSignals] Error getting negative signals:', error);
    return {
      strongRejections: [],
      rejectionPatterns: [],
      avoidGenres: [],
    };
  }
};

/**
 * Filter recommendations based on negative signals
 *
 * @param items - Candidate recommendations
 * @param negativeSignals - User's negative signals
 * @returns Filtered items with negative signals removed
 */
export const filterByNegativeSignals = (
  items: any[],
  negativeSignals: NegativeSignals
): any[] => {
  if (!negativeSignals || negativeSignals.strongRejections.length === 0) {
    return items;
  }

  // Create set of rejected content IDs
  const rejectedIds = new Set(negativeSignals.strongRejections.map(r => r.contentId));

  // Filter out rejected content and apply pattern-based filtering
  const filtered = items.filter(item => {
    // Remove if previously rejected strongly
    if (rejectedIds.has(item.id)) {
      return false;
    }

    // Apply genre avoidance (with some tolerance)
    if (negativeSignals.avoidGenres.length > 0 && item.genre_ids) {
      const hasAvoidedGenre = item.genre_ids.some((gid: number) =>
        negativeSignals.avoidGenres.includes(gid)
      );
      // Only reject if ALL genres are avoided (too strict to reject on one match)
      if (hasAvoidedGenre && item.genre_ids.every((gid: number) =>
        negativeSignals.avoidGenres.includes(gid)
      )) {
        return false;
      }
    }

    // Apply rating range avoidance
    if (negativeSignals.avoidRatingRange && item.vote_average) {
      const { min, max } = negativeSignals.avoidRatingRange;
      if (item.vote_average >= min && item.vote_average <= max) {
        return false;
      }
    }

    return true;
  });

  const removedCount = items.length - filtered.length;
  if (removedCount > 0) {
    console.log('[ImplicitSignals] Filtered out', removedCount, 'items based on negative signals');
  }

  return filtered;
};

/**
 * Clear old rejection data (for privacy/performance)
 */
export const clearOldRejections = async (userId: string): Promise<void> => {
  try {
    const impressions = await getImpressions(userId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - IMPLICIT_CONFIG.CACHE_DURATION_DAYS);

    const recent = impressions.filter(
      imp => imp.lastShownAt >= cutoffDate
    );

    await saveImpressions(userId, recent);
    console.log('[ImplicitSignals] Cleared old rejections. Kept', recent.length, 'of', impressions.length);
  } catch (error) {
    console.error('[ImplicitSignals] Error clearing old rejections:', error);
  }
};

/**
 * Get analytics about user's rejection patterns (for debugging/insights)
 */
export const getRejectionAnalytics = async (userId: string) => {
  try {
    const impressions = await getImpressions(userId);
    const strongRejections = await getStrongRejections(userId);
    const patterns = await extractRejectionPatterns(userId);

    const totalShown = impressions.reduce((sum, imp) => sum + imp.shownCount, 0);
    const avgShownCount = impressions.length > 0 ? totalShown / impressions.length : 0;

    return {
      totalTrackedItems: impressions.length,
      totalImpressions: totalShown,
      avgShowsPerItem: Math.round(avgShownCount * 10) / 10,
      strongRejectionCount: strongRejections.length,
      patternCount: patterns.length,
      topPatterns: patterns.slice(0, 5),
      sampleRejections: strongRejections.slice(0, 5).map(r => ({
        title: r.contentTitle,
        shownCount: r.shownCount,
        genres: r.genreIds,
      })),
    };
  } catch (error) {
    console.error('[ImplicitSignals] Error getting analytics:', error);
    return null;
  }
};
