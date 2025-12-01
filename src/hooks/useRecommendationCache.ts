import { useState, useEffect, useCallback } from 'react';
import { getSmartRecommendations } from '@/services/smartRecommendations';
import { UnifiedContent } from '@/types';

// Map genre names to IDs (must match what's used in WatchlistScreen/smartRecommendations)
const GENRE_NAME_TO_ID: Record<string, number[]> = {
    'Drama': [18],
    'Adventure': [12, 10759],
    'Action': [28, 10759],
    'Science Fiction': [878, 10765],
    'Animation': [16],
    'Anime': [16], // Filtered by language
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

    // Fetch everything once on mount or when userId changes
    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }

        const loadAll = async () => {
            setIsLoading(true);
            setError(null);

            try {
                console.log('[RecCache] Starting cache pre-fetch...');

                // Fetch a large batch of personalized recommendations (mixed)
                // We fetch more than usual to ensure we have enough variety for client-side filtering
                const allRecs = await getSmartRecommendations({
                    userId,
                    limit: 100, // Fetch 100 items upfront
                    mediaType: 'mixed',
                    forceRefresh: false,
                });

                console.log(`[RecCache] Fetched ${allRecs.length} items`);

                // Pre-organize by genre
                const byGenre = new Map<string, UnifiedContent[]>();
                const genreNames = Object.keys(GENRE_NAME_TO_ID);

                for (const genre of genreNames) {
                    const targetIds = GENRE_NAME_TO_ID[genre];

                    const genreItems = allRecs.filter(item => {
                        // Check genre IDs
                        // Handle both number arrays (genre_ids) and object arrays (genres)
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

                        // Debug log for first few items of first genre to verify structure
                        if (genre === genreNames[0] && allRecs.indexOf(item) < 3) {
                            console.log(`[RecCache] Item: ${item.title}, Genres:`, itemGenreIds);
                        }

                        const hasMatch = itemGenreIds.some((id: number) => targetIds.includes(id));

                        // Special handling for Anime vs Animation
                        if (genre === 'Anime') {
                            const isAnimated = itemGenreIds.includes(16);
                            const isJapanese = item.original_language === 'ja';
                            return isAnimated && isJapanese;
                        } else if (genre === 'Animation') {
                            const isAnimated = itemGenreIds.includes(16);
                            const isJapanese = item.original_language === 'ja';
                            return isAnimated && !isJapanese;
                        }

                        return hasMatch;
                    });

                    byGenre.set(genre, genreItems);
                }

                // Pre-organize by media type
                const movies = allRecs.filter(i => i.media_type === 'movie' || i.type === 'movie');
                const tv = allRecs.filter(i => i.media_type === 'tv' || i.type === 'tv' || i.type === 'series');

                setCache({
                    all: allRecs,
                    byGenre,
                    byMediaType: { movie: movies, tv },
                    lastFetched: new Date(),
                });

                console.log('[RecCache] Cache built successfully');
            } catch (err) {
                console.error('[RecCache] Error loading recommendations:', err);
                setError(err instanceof Error ? err : new Error('Unknown error'));
            } finally {
                setIsLoading(false);
            }
        };

        loadAll();
    }, [userId]);

    // Instant filtering from cache
    const getFiltered = useCallback((mediaType: 'all' | 'movie' | 'tv', genre: string) => {
        if (!cache) return [];

        let results = cache.all;

        // 1. Filter by media type first (most efficient)
        if (mediaType !== 'all') {
            results = cache.byMediaType[mediaType] || [];
        }

        // 2. Filter by genre
        if (genre !== 'All') {
            // If we have pre-calculated genre list, intersect it with current results
            // This is faster than re-filtering the whole list
            const genreItems = cache.byGenre.get(genre) || [];
            const genreIds = new Set(genreItems.map(i => i.id));

            results = results.filter(r => genreIds.has(r.id));
        }

        return results;
    }, [cache]);

    const refreshCache = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        // Re-trigger effect by clearing cache or separate logic
        // For now, simple re-mount simulation
        setCache(null);
    }, [userId]);

    return { cache, isLoading, error, getFiltered, refreshCache };
};
