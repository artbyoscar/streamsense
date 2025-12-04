import { useState, useEffect, useCallback } from 'react';
import { getSmartRecommendations } from '@/services/smartRecommendations';
import { UnifiedContent } from '@/types';
import { isAnime, isWesternAnimation, GENRE_EQUIVALENTS } from '@/utils/genreUtils';

// Map genre names to TMDb IDs - must match GenreFilterChips names exactly
// NOTE: TV shows have combined genres (10759 = Action & Adventure, 10765 = Sci-Fi & Fantasy)
// We treat these as matching BOTH individual genres to handle TV content properly
const GENRE_NAME_TO_ID: Record<string, number[]> = {
  'Drama': [18],
  'Adventure': [12, 10759], // Movies: 12, TV: 10759 (Action & Adventure)
  'Action': [28, 10759],    // Movies: 28, TV: 10759 (Action & Adventure)
  'Sci-Fi': [878, 10765],   // Movies: 878, TV: 10765 (Sci-Fi & Fantasy)
  'Animation': [16],
  'Anime': [16],
  'Comedy': [35],
  'Thriller': [53],
  'Horror': [27],
  'Romance': [10749],
  'Documentary': [99],
  'Crime': [80],
  'Mystery': [9648],
  'Fantasy': [14, 10765],   // Movies: 14, TV: 10765 (Sci-Fi & Fantasy)
  'Family': [10751],
};

interface RecommendationCache {
  all: UnifiedContent[];
  byGenre: Map<string, UnifiedContent[]>;
  byMediaType: { movie: UnifiedContent[]; tv: UnifiedContent[] };
  lastFetched: Date;
}

export const useRecommendationCache = (userId: string | undefined) => {
  const [cache, setCache] = useState<RecommendationCache | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadAll = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const startTime = Date.now();
        console.log('[RecCache] Starting diverse cache pre-fetch...');

        // ✅ SINGLE FETCH - No sequential genre fetches (was causing 25+ second delays)
        const allRecs = await getSmartRecommendations({
          userId,
          limit: 150, // Increased from 100 to get more diversity in one call
          mediaType: 'mixed',
          forceRefresh: false,
        });

        const fetchTime = Date.now() - startTime;
        console.log('[RecCache] ✅ Single fetch: ' + allRecs.length + ' items in ' + fetchTime + 'ms');

        // Deduplicate (shouldn't have duplicates from single fetch, but just in case)
        const seenIds = new Set<number>();
        const uniqueRecs = allRecs.filter(item => {
          if (seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          return true;
        });

        if (uniqueRecs.length < allRecs.length) {
          console.log('[RecCache] Removed ' + (allRecs.length - uniqueRecs.length) + ' duplicates');
        }
        console.log('[RecCache] Total unique: ' + uniqueRecs.length + ' items');

        const validItems = uniqueRecs.filter(item => {
          const hasPoster = !!(item.posterPath || item.poster_path);
          const hasTitle = !!(item.title || item.name);
          return hasPoster && hasTitle;
        });

        console.log('[RecCache] Validated: ' + validItems.length + ' items');

        // PHASE 1: Return basic cache immediately for fast UI rendering
        const movies = validItems.filter(i => i.media_type === 'movie' || i.type === 'movie');
        const tv = validItems.filter(i => i.media_type === 'tv' || i.type === 'tv' || i.type === 'series');

        // Set basic cache FIRST (UI renders immediately)
        setCache({
          all: validItems,
          byGenre: new Map(), // Empty initially
          byMediaType: { movie: movies, tv },
          lastFetched: new Date(),
        });
        setIsLoading(false); // ✅ UI IS NOW RESPONSIVE

        const dataLoadTime = Date.now() - startTime;
        console.log('[RecCache] ✅ UI ready in ' + dataLoadTime + 'ms');

        // PHASE 2: Build genre index in background (non-blocking)
        console.log('[RecCache] Building genre index in background...');

        // Use setTimeout to defer heavy work until after UI renders
        setTimeout(() => {
          const indexStart = Date.now();
          const byGenre = new Map<string, UnifiedContent[]>();
          const genreNames = Object.keys(GENRE_NAME_TO_ID);

          // Initialize all genre buckets
          for (const genre of genreNames) {
            byGenre.set(genre, []);
          }

          // SINGLE PASS: Iterate items once, add to all matching genres
          for (const item of validItems) {
          // Extract item's genre IDs once
          const itemGenreIds: number[] = [];
          if (item.genre_ids && Array.isArray(item.genre_ids)) {
            itemGenreIds.push(...item.genre_ids);
          }
          if (item.genres && Array.isArray(item.genres)) {
            item.genres.forEach((g: any) => {
              if (typeof g === 'number') itemGenreIds.push(g);
              else if (g && g.id) itemGenreIds.push(g.id);
            });
          }

          const primaryGenre = itemGenreIds[0];
          const secondaryGenre = itemGenreIds[1];

          // Check each genre once per item
          for (const genre of genreNames) {
            // Special handling for Anime and Animation
            if (genre === 'Anime') {
              if (isAnime(item)) {
                byGenre.get(genre)!.push(item);
              }
              continue;
            } else if (genre === 'Animation') {
              if (isWesternAnimation(item)) {
                byGenre.get(genre)!.push(item);
              }
              continue;
            }

            const targetIds = GENRE_NAME_TO_ID[genre];
            let matched = false;

            // Check if primary or secondary genre matches
            for (const targetId of targetIds) {
              const equivalents = GENRE_EQUIVALENTS[targetId] || [targetId];

              if (primaryGenre && equivalents.includes(primaryGenre)) {
                matched = true;
                break;
              }

              if (secondaryGenre && equivalents.includes(secondaryGenre)) {
                matched = true;
                break;
              }
            }

            if (matched) {
              byGenre.get(genre)!.push(item);
            }
          }
        }

          // Log summary only (not every item)
          for (const genre of genreNames) {
            const count = byGenre.get(genre)!.length;
            console.log('[RecCache] Genre ' + genre + ': ' + count + ' items');
          }

          // Update cache with genre index
          setCache(prev => ({
            ...prev!,
            byGenre,
          }));

          const indexTime = Date.now() - indexStart;
          const totalTime = Date.now() - startTime;
          console.log('[RecCache] ✅ Genre index built in ' + indexTime + 'ms (background)');
          console.log('[RecCache] ✅ Total cache time: ' + totalTime + 'ms (' + validItems.length + ' items, ' + movies.length + ' movies, ' + tv.length + ' TV)');
        }, 50); // Defer 50ms to let UI render first
      } catch (err) {
        console.error('[RecCache] Error loading recommendations:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
      }
    };

    loadAll();
  }, [userId]);

  const getFiltered = useCallback((mediaType: 'all' | 'movie' | 'tv', genre: string): UnifiedContent[] => {
    if (!cache) {
      console.log('[RecCache] ⚠️  getFiltered: cache not ready');
      return [];
    }

    let results: UnifiedContent[];

    if (genre !== 'All') {
      results = cache.byGenre.get(genre) || [];

      if (mediaType !== 'all') {
        results = results.filter(item => {
          const itemType = item.media_type || item.type;
          return itemType === mediaType || (mediaType === 'tv' && itemType === 'series');
        });
      }
    } else {
      if (mediaType !== 'all') {
        results = cache.byMediaType[mediaType] || [];
      } else {
        results = cache.all;
      }
    }

    console.log('[RecCache] Filtered: mediaType=' + mediaType + ', genre=' + genre + ' → ' + results.length + ' items');
    return results;
  }, [cache]);

  const refreshCache = useCallback(async () => {
    if (!userId) return;
    setCache(null);
    setIsLoading(true);
  }, [userId]);

  return { 
    cache, 
    isLoading, 
    error, 
    getFiltered,
    getFilteredRecommendations: getFiltered,
    refreshCache 
  };
};
