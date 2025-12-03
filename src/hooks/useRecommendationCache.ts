import { useState, useEffect, useCallback } from 'react';
import { getSmartRecommendations } from '@/services/smartRecommendations';
import { UnifiedContent } from '@/types';
import { isAnime, isWesternAnimation } from '@/utils/genreUtils';

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
        console.log('[RecCache] Starting diverse cache pre-fetch...');

        const mainRecs = await getSmartRecommendations({
          userId,
          limit: 100,
          mediaType: 'mixed',
          forceRefresh: false,
        });

        console.log('[RecCache] Main fetch: ' + mainRecs.length + ' items');

        const underrepresentedGenres = [
          { name: 'Horror', ids: [27] },
          { name: 'Documentary', ids: [99] },
          { name: 'Thriller', ids: [53] },
          { name: 'Crime', ids: [80] },
          { name: 'Romance', ids: [10749] },
        ];

        let additionalRecs: UnifiedContent[] = [];

        for (const genre of underrepresentedGenres) {
          try {
            const genreRecs = await getSmartRecommendations({
              userId,
              limit: 15,
              mediaType: 'mixed',
              genres: genre.ids,
              forceRefresh: false,
            });
            console.log('[RecCache] ' + genre.name + ' fetch: ' + genreRecs.length + ' items');
            additionalRecs = [...additionalRecs, ...genreRecs];
          } catch (err) {
            console.log('[RecCache] Failed to fetch ' + genre.name + ':', err);
          }
        }

        const allRecs = [...mainRecs, ...additionalRecs];
        const seenIds = new Set<number>();
        const uniqueRecs = allRecs.filter(item => {
          if (seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          return true;
        });

        console.log('[RecCache] Total unique: ' + uniqueRecs.length + ' items');

        const validItems = uniqueRecs.filter(item => {
          const hasPoster = !!(item.posterPath || item.poster_path);
          const hasTitle = !!(item.title || item.name);
          return hasPoster && hasTitle;
        });

        console.log('[RecCache] Validated: ' + validItems.length + ' items');

        const byGenre = new Map<string, UnifiedContent[]>();
        const genreNames = Object.keys(GENRE_NAME_TO_ID);

        for (const genre of genreNames) {
          const targetIds = GENRE_NAME_TO_ID[genre];

          const genreItems = validItems.filter(item => {
            if (genre === 'Anime') {
              return isAnime(item);
            } else if (genre === 'Animation') {
              return isWesternAnimation(item);
            }

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

            return itemGenreIds.some((id: number) => targetIds.includes(id));
          });

          byGenre.set(genre, genreItems);
          console.log('[RecCache] Genre ' + genre + ': ' + genreItems.length + ' items');
        }

        const movies = validItems.filter(i => i.media_type === 'movie' || i.type === 'movie');
        const tv = validItems.filter(i => i.media_type === 'tv' || i.type === 'tv' || i.type === 'series');

        setCache({
          all: validItems,
          byGenre,
          byMediaType: { movie: movies, tv },
          lastFetched: new Date(),
        });

        console.log('[RecCache] Cache built: ' + validItems.length + ' total, ' + movies.length + ' movies, ' + tv.length + ' TV');
      } catch (err) {
        console.error('[RecCache] Error loading recommendations:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, [userId]);

  const getFiltered = useCallback((mediaType: 'all' | 'movie' | 'tv', genre: string): UnifiedContent[] => {
    if (!cache) {
      console.log('[RecCache] getFiltered: cache not ready');
      return [];
    }

    console.log('[RecCache] getFiltered: mediaType=' + mediaType + ', genre=' + genre);

    let results: UnifiedContent[];

    if (genre !== 'All') {
      results = cache.byGenre.get(genre) || [];
      console.log('[RecCache] Genre ' + genre + ' base: ' + results.length + ' items');

      if (mediaType !== 'all') {
        results = results.filter(item => {
          const itemType = item.media_type || item.type;
          return itemType === mediaType || (mediaType === 'tv' && itemType === 'series');
        });
        console.log('[RecCache] After media filter: ' + results.length + ' items');
      }
    } else {
      if (mediaType !== 'all') {
        results = cache.byMediaType[mediaType] || [];
      } else {
        results = cache.all;
      }
      console.log('[RecCache] All/' + mediaType + ': ' + results.length + ' items');
    }

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
