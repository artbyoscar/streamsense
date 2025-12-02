/**
 * Batched TMDb API Service
 * Optimized batching and parallel fetching for TMDb API calls
 */

import { tmdbApi } from './tmdb';
import { BatchTimer } from '@/utils/performance';

// ============================================================================
// TYPES
// ============================================================================

interface ContentDetails {
  keywords: { id: number; name: string }[];
  credits: {
    cast: { id: number; name: string; character: string; order: number }[];
    crew: { id: number; name: string; job: string; department: string }[];
  };
  genres: { id: number; name: string }[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  runtime?: number;
  episode_run_time?: number[];
}

interface BatchResult {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  details: ContentDetails | null;
  error?: string;
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

const detailsCache = new Map<string, { data: ContentDetails; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (content details don't change)

function getCacheKey(tmdbId: number, mediaType: 'movie' | 'tv'): string {
  return `${mediaType}-${tmdbId}`;
}

function getCachedDetails(tmdbId: number, mediaType: 'movie' | 'tv'): ContentDetails | null {
  const key = getCacheKey(tmdbId, mediaType);
  const cached = detailsCache.get(key);

  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    detailsCache.delete(key);
    return null;
  }

  return cached.data;
}

function cacheDetails(tmdbId: number, mediaType: 'movie' | 'tv', details: ContentDetails): void {
  const key = getCacheKey(tmdbId, mediaType);
  detailsCache.set(key, {
    data: details,
    timestamp: Date.now(),
  });
}

// ============================================================================
// BATCH FETCHING
// ============================================================================

/**
 * Fetch details for a single content item (with caching)
 */
async function fetchSingleDetails(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<ContentDetails | null> {
  // Check cache first
  const cached = getCachedDetails(tmdbId, mediaType);
  if (cached) {
    console.log(`[TMDbBatch] Cache hit for ${mediaType} ${tmdbId}`);
    return cached;
  }

  try {
    // Fetch all required data in parallel
    const [detailsRes, keywordsRes, creditsRes] = await Promise.all([
      tmdbApi.get(`/${mediaType}/${tmdbId}`),
      tmdbApi.get(`/${mediaType}/${tmdbId}/keywords`),
      tmdbApi.get(`/${mediaType}/${tmdbId}/credits`),
    ]);

    const details: ContentDetails = {
      keywords: mediaType === 'movie'
        ? keywordsRes.data.keywords || []
        : keywordsRes.data.results || [],
      credits: {
        cast: creditsRes.data.cast || [],
        crew: creditsRes.data.crew || [],
      },
      genres: detailsRes.data.genres || [],
      vote_average: detailsRes.data.vote_average || 0,
      vote_count: detailsRes.data.vote_count || 0,
      popularity: detailsRes.data.popularity || 0,
      runtime: detailsRes.data.runtime,
      episode_run_time: detailsRes.data.episode_run_time,
    };

    // Cache the result
    cacheDetails(tmdbId, mediaType, details);

    return details;
  } catch (error) {
    console.error(`[TMDbBatch] Error fetching ${mediaType} ${tmdbId}:`, error);
    return null;
  }
}

/**
 * Fetch details for multiple content items in parallel batches
 * @param items Array of {tmdbId, mediaType} objects
 * @param batchSize Max number of concurrent requests (default: 5)
 */
export async function batchFetchDetails(
  items: Array<{ tmdbId: number; mediaType: 'movie' | 'tv' }>,
  batchSize: number = 5
): Promise<BatchResult[]> {
  if (items.length === 0) return [];

  const timer = new BatchTimer('TMDb batch fetch', items.length);
  const results: BatchResult[] = [];

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          const details = await fetchSingleDetails(item.tmdbId, item.mediaType);
          return {
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            details,
          };
        } catch (error) {
          return {
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            details: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    results.push(...batchResults);

    // Small delay between batches to be respectful to the API
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  timer.end();
  return results;
}

/**
 * Fetch keywords for multiple items in parallel
 */
export async function batchFetchKeywords(
  items: Array<{ tmdbId: number; mediaType: 'movie' | 'tv' }>,
  batchSize: number = 10
): Promise<Map<string, { id: number; name: string }[]>> {
  const timer = new BatchTimer('TMDb batch keywords', items.length);
  const results = new Map<string, { id: number; name: string }[]>();

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (item) => {
        try {
          const key = getCacheKey(item.tmdbId, item.mediaType);
          const cached = getCachedDetails(item.tmdbId, item.mediaType);

          if (cached?.keywords) {
            results.set(key, cached.keywords);
            return;
          }

          const { data } = await tmdbApi.get(`/${item.mediaType}/${item.tmdbId}/keywords`);
          const keywords = item.mediaType === 'movie' ? data.keywords : data.results;
          results.set(key, keywords || []);
        } catch (error) {
          console.error(`[TMDbBatch] Error fetching keywords for ${item.mediaType} ${item.tmdbId}:`, error);
          results.set(getCacheKey(item.tmdbId, item.mediaType), []);
        }
      })
    );

    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  timer.end();
  return results;
}

/**
 * Fetch credits for multiple items in parallel
 */
export async function batchFetchCredits(
  items: Array<{ tmdbId: number; mediaType: 'movie' | 'tv' }>,
  batchSize: number = 10
): Promise<Map<string, ContentDetails['credits']>> {
  const timer = new BatchTimer('TMDb batch credits', items.length);
  const results = new Map<string, ContentDetails['credits']>();

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (item) => {
        try {
          const key = getCacheKey(item.tmdbId, item.mediaType);
          const cached = getCachedDetails(item.tmdbId, item.mediaType);

          if (cached?.credits) {
            results.set(key, cached.credits);
            return;
          }

          const { data } = await tmdbApi.get(`/${item.mediaType}/${item.tmdbId}/credits`);
          results.set(key, {
            cast: data.cast || [],
            crew: data.crew || [],
          });
        } catch (error) {
          console.error(`[TMDbBatch] Error fetching credits for ${item.mediaType} ${item.tmdbId}:`, error);
          results.set(getCacheKey(item.tmdbId, item.mediaType), { cast: [], crew: [] });
        }
      })
    );

    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  timer.end();
  return results;
}

/**
 * Clear the details cache
 */
export function clearDetailsCache(): void {
  detailsCache.clear();
  console.log('[TMDbBatch] Details cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: detailsCache.size,
    keys: Array.from(detailsCache.keys()),
  };
}
