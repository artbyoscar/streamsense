/**
 * Content DNA Service
 * Matches content based on deep attributes beyond genres
 *
 * DNA Attributes:
 * - Tone (dark, light, mixed)
 * - Pace (slow, medium, fast)
 * - Era (modern, period, futuristic)
 * - Complexity (simple, complex)
 * - Audience Type (mainstream, cult, critical)
 * - Runtime patterns
 * - Release era preferences
 */

import { supabase } from '@/config/supabase';

export interface ContentDNA {
  // Explicit attributes (from TMDb)
  id: number;
  title: string;
  genres: number[];
  releaseYear: number;
  runtime?: number;
  rating: number;
  voteCount: number;
  mediaType: 'movie' | 'tv';

  // Inferred attributes
  tone: 'dark' | 'light' | 'mixed';
  pace: 'slow' | 'medium' | 'fast';
  era: 'modern' | 'period' | 'futuristic';
  complexity: 'simple' | 'complex';
  audienceType: 'mainstream' | 'cult' | 'critical';

  // Calculated scores
  popularityScore: number;     // 0-100
  criticalAcclaim: number;     // 0-100
}

export interface UserDNAProfile {
  // Preferred attributes
  preferredTone: 'dark' | 'light' | 'mixed';
  preferredPace: 'slow' | 'medium' | 'fast';
  preferredEra: 'modern' | 'period' | 'futuristic';
  preferredComplexity: 'simple' | 'complex';
  preferredAudience: 'mainstream' | 'cult' | 'critical';

  // Statistical patterns
  avgRuntime: number;
  avgRating: number;
  avgReleaseYear: number;
  runtimeRange: { min: number; max: number };
  ratingRange: { min: number; max: number };

  // Confidence (0-1)
  confidence: number;
  sampleSize: number;
}

/**
 * Infer content tone from genres and rating
 */
const inferTone = (genreIds: number[], rating: number): 'dark' | 'light' | 'mixed' => {
  const darkGenres = [27, 53, 80, 9648]; // Horror, Thriller, Crime, Mystery
  const lightGenres = [35, 10751, 10749, 16]; // Comedy, Family, Romance, Animation

  const darkCount = genreIds.filter(g => darkGenres.includes(g)).length;
  const lightCount = genreIds.filter(g => lightGenres.includes(g)).length;

  if (darkCount > lightCount) return 'dark';
  if (lightCount > darkCount) return 'light';
  return 'mixed';
};

/**
 * Infer content pace from runtime and genres
 */
const inferPace = (
  runtime: number | undefined,
  genreIds: number[],
  mediaType: 'movie' | 'tv'
): 'slow' | 'medium' | 'fast' => {
  const fastGenres = [28, 53, 878, 12]; // Action, Thriller, Sci-Fi, Adventure
  const slowGenres = [18, 99, 36]; // Drama, Documentary, History

  const fastCount = genreIds.filter(g => fastGenres.includes(g)).length;
  const slowCount = genreIds.filter(g => slowGenres.includes(g)).length;

  // For movies, also consider runtime
  if (mediaType === 'movie' && runtime) {
    if (runtime < 95 && fastCount > 0) return 'fast';
    if (runtime > 150) return 'slow';
  }

  if (fastCount > slowCount) return 'fast';
  if (slowCount > fastCount) return 'slow';
  return 'medium';
};

/**
 * Infer content era from release year and genres
 */
const inferEra = (releaseYear: number, genreIds: number[]): 'modern' | 'period' | 'futuristic' => {
  const futuristicGenres = [878]; // Sci-Fi
  const historicalGenres = [36, 10752]; // History, War

  if (genreIds.some(g => futuristicGenres.includes(g))) return 'futuristic';
  if (genreIds.some(g => historicalGenres.includes(g))) return 'period';

  // Modern if released in last 20 years
  const currentYear = new Date().getFullYear();
  if (releaseYear >= currentYear - 20) return 'modern';

  return 'period';
};

/**
 * Infer complexity from rating, vote count, and genres
 */
const inferComplexity = (
  rating: number,
  voteCount: number,
  genreIds: number[]
): 'simple' | 'complex' => {
  const complexGenres = [878, 9648, 53, 18]; // Sci-Fi, Mystery, Thriller, Drama
  const simpleGenres = [35, 10751, 28]; // Comedy, Family, Action

  const complexCount = genreIds.filter(g => complexGenres.includes(g)).length;
  const simpleCount = genreIds.filter(g => simpleGenres.includes(g)).length;

  // High rating with moderate votes often indicates complexity
  if (rating >= 7.5 && voteCount < 10000 && complexCount > 0) return 'complex';

  if (complexCount > simpleCount) return 'complex';
  return 'simple';
};

/**
 * Determine audience type from popularity and critical reception
 */
const determineAudienceType = (
  rating: number,
  voteCount: number,
  popularity: number
): 'mainstream' | 'cult' | 'critical' => {
  // Mainstream: high popularity, lots of votes
  if (voteCount > 5000 && popularity > 50) return 'mainstream';

  // Critical: high rating, moderate votes
  if (rating >= 7.5 && voteCount < 5000) return 'critical';

  // Cult: moderate rating, moderate votes
  return 'cult';
};

/**
 * Extract Content DNA from TMDb data
 */
export const extractContentDNA = (item: any, mediaType: 'movie' | 'tv'): ContentDNA => {
  const releaseYear = item.release_date
    ? new Date(item.release_date).getFullYear()
    : item.first_air_date
    ? new Date(item.first_air_date).getFullYear()
    : new Date().getFullYear();

  const genreIds = item.genre_ids || item.genres || [];
  const rating = item.vote_average || 0;
  const voteCount = item.vote_count || 0;
  const runtime = item.runtime || (mediaType === 'tv' ? 45 : 90); // Default estimates

  return {
    id: item.id,
    title: item.title || item.name || 'Unknown',
    genres: genreIds,
    releaseYear,
    runtime,
    rating,
    voteCount,
    mediaType,

    // Inferred attributes
    tone: inferTone(genreIds, rating),
    pace: inferPace(runtime, genreIds, mediaType),
    era: inferEra(releaseYear, genreIds),
    complexity: inferComplexity(rating, voteCount, genreIds),
    audienceType: determineAudienceType(rating, voteCount, item.popularity || 0),

    // Calculated scores
    popularityScore: Math.min((voteCount / 10000) * 100, 100),
    criticalAcclaim: (rating / 10) * 100,
  };
};

/**
 * Build User DNA Profile from watchlist
 */
export const buildUserDNAProfile = async (userId: string): Promise<UserDNAProfile | null> => {
  try {
    // Get user's watchlist - NO JOIN, just get basic fields from watchlist_items
    const { data: watchlistItems, error } = await supabase
      .from('watchlist_items')
      .select('tmdb_id, media_type, created_at')
      .eq('user_id', userId)
      .not('tmdb_id', 'is', null) // Only items with tmdb_id
      .limit(100); // Sample last 100 items

    if (error) throw error;
    if (!watchlistItems || watchlistItems.length < 3) {
      console.log('[ContentDNA] Not enough watchlist data to build profile (need 3+)');
      return null;
    }

    console.log('[ContentDNA] Skipping DNA profile - insufficient data in watchlist_items');
    console.log('[ContentDNA] DNA matching requires full content details from TMDb API');

    // Return a neutral/default profile instead of failing
    // DNA matching will be skipped when profile is null
    return null;

    // NOTE: Full DNA profile would require fetching each item from TMDb API
    // which is expensive (100+ API calls). For now, we skip DNA matching.
    // Alternative: Pre-populate content table with TMDb data and add FK relationship
  } catch (error) {
    console.error('[ContentDNA] Error building user DNA profile:', error);
    return null;
  }
};

/**
 * Calculate DNA similarity score (0-100)
 */
export const calculateDNASimilarity = (
  userDNA: UserDNAProfile,
  contentDNA: ContentDNA
): number => {
  let score = 0;
  let maxScore = 0;

  // Tone match (weight: 20)
  maxScore += 20;
  if (contentDNA.tone === userDNA.preferredTone) score += 20;
  else if (contentDNA.tone === 'mixed' || userDNA.preferredTone === 'mixed') score += 10;

  // Pace match (weight: 15)
  maxScore += 15;
  if (contentDNA.pace === userDNA.preferredPace) score += 15;
  else if (contentDNA.pace === 'medium' || userDNA.preferredPace === 'medium') score += 8;

  // Era match (weight: 15)
  maxScore += 15;
  if (contentDNA.era === userDNA.preferredEra) score += 15;
  else score += 5; // Partial credit for era diversity

  // Complexity match (weight: 15)
  maxScore += 15;
  if (contentDNA.complexity === userDNA.preferredComplexity) score += 15;
  else score += 8; // Partial credit

  // Audience type match (weight: 10)
  maxScore += 10;
  if (contentDNA.audienceType === userDNA.preferredAudience) score += 10;
  else score += 5; // Partial credit

  // Runtime similarity (weight: 10)
  maxScore += 10;
  if (contentDNA.runtime) {
    const runtimeDiff = Math.abs(contentDNA.runtime - userDNA.avgRuntime);
    const runtimeScore = Math.max(0, 10 - (runtimeDiff / 20)); // Lose 1 point per 20 min difference
    score += runtimeScore;
  } else {
    score += 5; // Neutral if runtime unknown
  }

  // Rating similarity (weight: 10)
  maxScore += 10;
  const ratingDiff = Math.abs(contentDNA.rating - userDNA.avgRating);
  const ratingScore = Math.max(0, 10 - ratingDiff); // Lose 1 point per rating point difference
  score += ratingScore;

  // Release year similarity (weight: 5)
  maxScore += 5;
  const yearDiff = Math.abs(contentDNA.releaseYear - userDNA.avgReleaseYear);
  const yearScore = Math.max(0, 5 - (yearDiff / 10)); // Lose 1 point per 10 years
  score += yearScore;

  // Normalize to 0-100 scale
  const normalizedScore = (score / maxScore) * 100;

  // Apply confidence multiplier (low confidence = more conservative scoring)
  const finalScore = normalizedScore * userDNA.confidence;

  return Math.round(finalScore);
};

/**
 * Rank content by DNA similarity to user profile
 */
export const rankByDNASimilarity = (
  items: any[],
  userDNA: UserDNAProfile | null
): any[] => {
  if (!userDNA || !items.length) {
    return items;
  }

  // Extract DNA and calculate similarity for each item
  const scored = items.map(item => {
    const contentDNA = extractContentDNA(item, item.media_type || 'movie');
    const dnaMatch = calculateDNASimilarity(userDNA, contentDNA);

    return {
      ...item,
      dnaMatch,
      contentDNA, // Attach for debugging
    };
  });

  // Sort by DNA similarity (descending)
  const ranked = scored.sort((a, b) => b.dnaMatch - a.dnaMatch);

  console.log('[ContentDNA] Ranked', items.length, 'items by DNA similarity');
  console.log('[ContentDNA] Top 3 matches:', ranked.slice(0, 3).map(r => ({
    title: r.title || r.name,
    score: r.dnaMatch,
    tone: r.contentDNA.tone,
    pace: r.contentDNA.pace,
  })));

  return ranked;
};

/**
 * Get DNA analytics for debugging/insights
 */
export const getDNAAnalytics = async (userId: string) => {
  try {
    const userDNA = await buildUserDNAProfile(userId);

    if (!userDNA) {
      return null;
    }

    return {
      profile: {
        tone: userDNA.preferredTone,
        pace: userDNA.preferredPace,
        era: userDNA.preferredEra,
        complexity: userDNA.preferredComplexity,
        audience: userDNA.preferredAudience,
      },
      stats: {
        avgRuntime: `${userDNA.avgRuntime} min`,
        avgRating: userDNA.avgRating,
        avgReleaseYear: userDNA.avgReleaseYear,
        runtimeRange: `${userDNA.runtimeRange.min}-${userDNA.runtimeRange.max} min`,
        ratingRange: `${userDNA.ratingRange.min}-${userDNA.ratingRange.max}`,
      },
      metadata: {
        sampleSize: userDNA.sampleSize,
        confidence: `${Math.round(userDNA.confidence * 100)}%`,
      },
    };
  } catch (error) {
    console.error('[ContentDNA] Error getting analytics:', error);
    return null;
  }
};
