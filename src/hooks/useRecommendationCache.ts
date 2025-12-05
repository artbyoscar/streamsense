import { useState, useEffect, useCallback, useRef } from 'react';
import { getSmartRecommendations, fetchGenreSpecificContent, loadMoreRecommendations, addToExclusions } from '@/services/smartRecommendations';
import { UnifiedContent } from '@/types';
import { isAnime, isWesternAnimation, GENRE_EQUIVALENTS } from '@/utils/genreUtils';

// Map genre names to TMDb IDs - must match GenreFilterChips names exactly
const GENRE_NAME_TO_ID: Record<string, number[]> = {
  'Drama': [18],
  'Adventure': [12, 10759],
  'Action': [28, 10759],
  'Sci-Fi': [878, 10765],
  'Animation': [16],
  'Anime': [16],
  'Comedy': [35],
  'Thriller': [53],
  'Horror': [27],
  'Romance': [10749],
  'Documentary': [99],
  'Crime': [80],
  'Mystery': [9648],
  'Fantasy': [14, 10765],
  'Family': [10751],
};

// Minimum items per genre - if below this, fetch more
const MIN_ITEMS_PER_GENRE = 8;

interface RecommendationCache {
  all: UnifiedContent[];
  byGenre: Map<string, UnifiedContent[]>;
  byMediaType: { movie: UnifiedContent[]; tv: UnifiedContent[] };
  lastFetched: Date;
}

export const useRecommendationCache = (userId: string | undefined) => {
  const [cache, setCache] = useState<RecommendationCache | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchedGenresRef = useRef<Set<string>>(new Set());

  // Build genre index from items
  const buildGenreIndex = useCallback((items: UnifiedContent[]): Map<string, UnifiedContent[]> => {
    const byGenre = new Map<string, UnifiedContent[]>();
    const genreNames = Object.keys(GENRE_NAME_TO_ID);

    for (const genre of genreNames) {
      byGenre.set(genre, []);
    }

    for (const item of items) {
      const itemGenreIds: number[] = [];
      if ((item as any).genre_ids && Array.isArray((item as any).genre_ids)) {
        itemGenreIds.push(...(item as any).genre_ids);
      }
      if (item.genres && Array.isArray(item.genres)) {
        item.genres.forEach((g: any) => {
          if (typeof g === 'number') itemGenreIds.push(g);
          else if (g && g.id) itemGenreIds.push(g.id);
        });
      }

      const primaryGenre = itemGenreIds[0];
      const secondaryGenre = itemGenreIds[1];

      for (const genre of genreNames) {
        if (genre === 'Anime') {
          if (isAnime(item)) byGenre.get(genre)!.push(item);
          continue;
        } else if (genre === 'Animation') {
          if (isWesternAnimation(item)) byGenre.get(genre)!.push(item);
          continue;
        }

        const targetIds = GENRE_NAME_TO_ID[genre];
        let matched = false;

        for (const targetId of targetIds) {
          const equivalents = GENRE_EQUIVALENTS[targetId] || [targetId];
          if ((primaryGenre && equivalents.includes(primaryGenre)) ||
              (secondaryGenre && equivalents.includes(secondaryGenre))) {
            matched = true;
            break;
          }
        }

        if (matched) byGenre.get(genre)!.push(item);
      }
    }

    return byGenre;
  }, []);

  // Initial load
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadAll = async () => {
      setIsLoading(true);
      setError(null);
      fetchedGenresRef.current.clear();

      try {
        const startTime = Date.now();
        console.log('[RecCache] Starting cache pre-fetch...');

        const allRecs = await getSmartRecommendations({
          userId,
          limit: 150,
          mediaType: 'mixed',
          forceRefresh: false,
          excludeSessionItems: true,
        });

        console.log('[RecCache] Initial fetch:', allRecs.length, 'items in', Date.now() - startTime, 'ms');

        // Deduplicate
        const seenIds = new Set<number>();
        const uniqueRecs = allRecs.filter(item => {
          if (seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          return true;
        });

        // Validate
        const validItems = uniqueRecs.filter(item => {
          const hasPoster = !!(item.posterPath || item.poster_path);
          const hasTitle = !!(item.title || item.name);
          return hasPoster && hasTitle;
        });

        console.log('[RecCache] Valid items:', validItems.length);

        const movies = validItems.filter(i => (i as any).media_type === 'movie' || i.type === 'movie');
        const tv = validItems.filter(i => (i as any).media_type === 'tv' || i.type === 'tv');

        // Build initial genre index
        const byGenre = buildGenreIndex(validItems);

        // Log genre distribution
        const genreNames = Object.keys(GENRE_NAME_TO_ID);
        const lowGenres: string[] = [];
        for (const genre of genreNames) {
          const count = byGenre.get(genre)!.length;
          console.log('[RecCache] Genre', genre + ':', count, 'items');
          if (count < MIN_ITEMS_PER_GENRE) {
            lowGenres.push(genre);
          }
        }

        setCache({
          all: validItems,
          byGenre,
          byMediaType: { movie: movies, tv },
          lastFetched: new Date(),
        });
        setIsLoading(false);

        console.log('[RecCache] UI ready in', Date.now() - startTime, 'ms');

        // Fetch more for low genres in background
        if (lowGenres.length > 0) {
          console.log('[RecCache] Low genres detected, fetching more:', lowGenres);
          fetchMoreForLowGenres(userId, lowGenres, validItems, byGenre);
        }

      } catch (err) {
        console.error('[RecCache] Error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
      }
    };

    loadAll();
  }, [userId, buildGenreIndex]);

  // Fetch more content for genres with low item counts
  const fetchMoreForLowGenres = async (
    userId: string,
    genres: string[],
    currentItems: UnifiedContent[],
    currentByGenre: Map<string, UnifiedContent[]>
  ) => {
    const seenIds = new Set(currentItems.map(i => i.id));
    let newItems: UnifiedContent[] = [];

    for (const genre of genres) {
      // Skip if already fetched this genre
      if (fetchedGenresRef.current.has(genre)) continue;
      fetchedGenresRef.current.add(genre);

      try {
        console.log('[RecCache] Fetching more for low genre:', genre);
        const genreItems = await fetchGenreSpecificContent({
          userId,
          genre,
          mediaType: 'mixed',
          limit: 20,
          page: 1,
        });

        const uniqueNew = genreItems.filter(item => !seenIds.has(item.id));
        uniqueNew.forEach(item => seenIds.add(item.id));
        newItems.push(...uniqueNew);

        console.log('[RecCache] Added', uniqueNew.length, 'new items for', genre);
      } catch (err) {
        console.warn('[RecCache] Failed to fetch more for', genre, err);
      }
    }

    if (newItems.length > 0) {
      // Update cache with new items
      setCache(prev => {
        if (!prev) return prev;

        const updatedAll = [...prev.all, ...newItems];
        const updatedByGenre = buildGenreIndex(updatedAll);
        const movies = updatedAll.filter(i => (i as any).media_type === 'movie' || i.type === 'movie');
        const tv = updatedAll.filter(i => (i as any).media_type === 'tv' || i.type === 'tv');

        console.log('[RecCache] Updated cache with', newItems.length, 'new items. Total:', updatedAll.length);

        return {
          all: updatedAll,
          byGenre: updatedByGenre,
          byMediaType: { movie: movies, tv },
          lastFetched: new Date(),
        };
      });
    }
  };

  // Get filtered results
  const getFiltered = useCallback((mediaType: 'all' | 'movie' | 'tv', genre: string): UnifiedContent[] => {
    if (!cache) {
      console.log('[RecCache] getFiltered: cache not ready');
      return [];
    }

    let results: UnifiedContent[];

    if (genre !== 'All') {
      results = cache.byGenre.get(genre) || [];

      if (mediaType !== 'all') {
        results = results.filter(item => {
          const itemType = (item as any).media_type || item.type;
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

  // Load more for a specific genre
  const loadMoreForGenre = useCallback(async (genre: string, count: number = 20): Promise<UnifiedContent[]> => {
    if (!userId || !cache) return [];

    setIsLoadingMore(true);
    try {
      const currentPage = Math.floor((cache.byGenre.get(genre)?.length || 0) / 20) + 2;

      const newItems = await fetchGenreSpecificContent({
        userId,
        genre,
        mediaType: 'mixed',
        limit: count,
        page: currentPage,
      });

      if (newItems.length > 0) {
        const seenIds = new Set(cache.all.map(i => i.id));
        const uniqueNew = newItems.filter(item => !seenIds.has(item.id));

        if (uniqueNew.length > 0) {
          setCache(prev => {
            if (!prev) return prev;

            const updatedAll = [...prev.all, ...uniqueNew];
            const updatedByGenre = buildGenreIndex(updatedAll);
            const movies = updatedAll.filter(i => (i as any).media_type === 'movie' || i.type === 'movie');
            const tv = updatedAll.filter(i => (i as any).media_type === 'tv' || i.type === 'tv');

            return {
              all: updatedAll,
              byGenre: updatedByGenre,
              byMediaType: { movie: movies, tv },
              lastFetched: new Date(),
            };
          });
        }

        console.log('[RecCache] Loaded', uniqueNew.length, 'more items for', genre);
        return uniqueNew;
      }

      return [];
    } catch (err) {
      console.error('[RecCache] Error loading more for genre:', err);
      return [];
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, cache, buildGenreIndex]);

  // Load more general recommendations
  const loadMore = useCallback(async (count: number = 20): Promise<UnifiedContent[]> => {
    if (!userId || !cache) return [];

    setIsLoadingMore(true);
    try {
      const newItems = await loadMoreRecommendations({
        userId,
        currentCount: cache.all.length,
        mediaType: 'mixed',
        limit: count,
      });

      if (newItems.length > 0) {
        const seenIds = new Set(cache.all.map(i => i.id));
        const uniqueNew = newItems.filter(item => !seenIds.has(item.id));

        if (uniqueNew.length > 0) {
          setCache(prev => {
            if (!prev) return prev;

            const updatedAll = [...prev.all, ...uniqueNew];
            const updatedByGenre = buildGenreIndex(updatedAll);
            const movies = updatedAll.filter(i => (i as any).media_type === 'movie' || i.type === 'movie');
            const tv = updatedAll.filter(i => (i as any).media_type === 'tv' || i.type === 'tv');

            return {
              all: updatedAll,
              byGenre: updatedByGenre,
              byMediaType: { movie: movies, tv },
              lastFetched: new Date(),
            };
          });

          console.log('[RecCache] Loaded', uniqueNew.length, 'more items. Total:', cache.all.length + uniqueNew.length);
        }

        return uniqueNew;
      }

      return [];
    } catch (err) {
      console.error('[RecCache] Error loading more:', err);
      return [];
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, cache, buildGenreIndex]);

  // Remove item from cache (after interaction)
  const removeFromCache = useCallback((itemId: number) => {
    if (!cache) return;

    // Add to exclusions
    addToExclusions(itemId);

    setCache(prev => {
      if (!prev) return prev;

      const updatedAll = prev.all.filter(item => item.id !== itemId);
      const updatedByGenre = buildGenreIndex(updatedAll);
      const movies = updatedAll.filter(i => (i as any).media_type === 'movie' || i.type === 'movie');
      const tv = updatedAll.filter(i => (i as any).media_type === 'tv' || i.type === 'tv');

      console.log('[RecCache] Removed item', itemId, 'from cache. Remaining:', updatedAll.length);

      return {
        all: updatedAll,
        byGenre: updatedByGenre,
        byMediaType: { movie: movies, tv },
        lastFetched: prev.lastFetched,
      };
    });
  }, [cache, buildGenreIndex]);

  // Refresh entire cache
  const refreshCache = useCallback(async () => {
    if (!userId) return;
    setCache(null);
    fetchedGenresRef.current.clear();
    setIsLoading(true);
  }, [userId]);

  return {
    cache,
    isLoading,
    isLoadingMore,
    error,
    getFiltered,
    getFilteredRecommendations: getFiltered,
    loadMore,
    loadMoreForGenre,
    removeFromCache,
    refreshCache,
  };
};