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

                // Validate items have required data (poster and title)
                const validItems = allRecs.filter(item => {
                    const hasPoster = !!(item.posterPath || item.poster_path);
                    const hasTitle = !!(item.title || item.name);

                    if (!hasPoster || !hasTitle) {
                        console.warn('[RecCache] Item missing required data:', {
                            id: item.id,
                            hasPoster,
                            hasTitle,
                            title: item.title || item.name || 'NO_TITLE',
                        });
                        return false;
                    }
                    return true;
                });

                console.log(`[RecCache] Validated: ${validItems.length}/${allRecs.length} items have required data`);

                // Debug: Log sample of fetched items to verify data structure
                if (validItems.length > 0) {
                    console.log('[RecCache] Sample item:', {
                        id: validItems[0].id,
                        title: validItems[0].title,
                        posterPath: validItems[0].posterPath || validItems[0].poster_path,
                        media_type: validItems[0].media_type,
                        type: validItems[0].type,
                        genre_ids: validItems[0].genre_ids,
                        genres: validItems[0].genres,
                    });
                } else {
                    console.warn('[RecCache] WARNING: No valid items after filtering!');
                }

                // Pre-organize by genre
                const byGenre = new Map<string, UnifiedContent[]>();
                const genreNames = Object.keys(GENRE_NAME_TO_ID);

                for (const genre of genreNames) {
                    const targetIds = GENRE_NAME_TO_ID[genre];

                    const genreItems = validItems.filter(item => {
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
                        if (genre === genreNames[0] && validItems.indexOf(item) < 3) {
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
                const movies = validItems.filter(i => i.media_type === 'movie' || i.type === 'movie');
                const tv = validItems.filter(i => i.media_type === 'tv' || i.type === 'tv' || i.type === 'series');

                console.log('[RecCache] Cache structure built:', {
                    totalItems: validItems.length,
                    movieCount: movies.length,
                    tvCount: tv.length,
                    genreCounts: Array.from(byGenre.entries()).map(([name, items]) => ({ name, count: items.length })),
                });

                setCache({
                    all: validItems,
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

    // Instant filtering from cache with on-demand fetching
    const getFiltered = useCallback(async (mediaType: 'all' | 'movie' | 'tv', genre: string) => {
        if (!cache) {
            console.log('[RecCache] getFiltered called but cache is null');
            return [];
        }

        console.log('[RecCache] getFiltered - Cache has', cache.all.length, 'items total');
        console.log('[RecCache] getFiltered - Filters: mediaType=', mediaType, 'genre=', genre);

        let results = cache.all;

        // 1. Filter by media type first (most efficient)
        if (mediaType !== 'all') {
            results = cache.byMediaType[mediaType] || [];
            console.log('[RecCache] After media type filter:', results.length, 'items');
        }

        // 2. Filter by genre
        if (genre !== 'All') {
            // If we have pre-calculated genre list, intersect it with current results
            // This is faster than re-filtering the whole list
            const genreItems = cache.byGenre.get(genre) || [];
            console.log('[RecCache] Genre', genre, 'has', genreItems.length, 'pre-calculated items');
            const genreIds = new Set(genreItems.map(i => i.id));

            results = results.filter(r => genreIds.has(r.id));
            console.log('[RecCache] After genre filter:', results.length, 'items');

            // If we have too few items for this genre, fetch more from TMDb
            if (results.length < 10 && userId) {
                console.log(`[RecCache] Only ${results.length} ${genre} items in cache. Fetching more...`);

                const targetGenreIds = GENRE_NAME_TO_ID[genre];
                if (targetGenreIds && targetGenreIds.length > 0) {
                    try {
                        const newItems = await getSmartRecommendations({
                            userId,
                            limit: 30, // Fetch extra to ensure we have enough after filtering
                            mediaType: mediaType === 'all' ? 'mixed' : mediaType,
                            genres: targetGenreIds,
                        });

                        console.log(`[RecCache] Fetched ${newItems.length} new ${genre} items`);

                        // Validate and add to cache (avoiding duplicates)
                        const existingIds = new Set(cache.all.map(i => i.id));
                        const validNew = newItems.filter(item => {
                            const hasPoster = !!(item.posterPath || item.poster_path);
                            const hasTitle = !!(item.title || item.name);
                            const isNew = !existingIds.has(item.id);
                            return hasPoster && hasTitle && isNew;
                        });

                        if (validNew.length > 0) {
                            console.log(`[RecCache] Adding ${validNew.length} new items to cache`);

                            // Update cache.all
                            cache.all = [...cache.all, ...validNew];

                            // Update byMediaType
                            validNew.forEach(item => {
                                if (item.media_type === 'movie' || item.type === 'movie') {
                                    cache.byMediaType.movie.push(item);
                                } else if (item.media_type === 'tv' || item.type === 'tv' || item.type === 'series') {
                                    cache.byMediaType.tv.push(item);
                                }
                            });

                            // Update byGenre for affected genres
                            validNew.forEach(item => {
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

                                // Update all genre buckets that this item belongs to
                                for (const [genreName, genreIds] of Object.entries(GENRE_NAME_TO_ID)) {
                                    if (itemGenreIds.some(id => genreIds.includes(id))) {
                                        const existing = cache.byGenre.get(genreName) || [];
                                        cache.byGenre.set(genreName, [...existing, item]);
                                    }
                                }
                            });

                            // Re-filter with updated cache
                            const updatedGenreItems = cache.byGenre.get(genre) || [];
                            const updatedGenreIds = new Set(updatedGenreItems.map(i => i.id));
                            const baseResults = mediaType !== 'all' ? cache.byMediaType[mediaType] : cache.all;
                            results = baseResults.filter(r => updatedGenreIds.has(r.id));

                            console.log(`[RecCache] After fetch and re-filter: ${results.length} items`);
                        }
                    } catch (error) {
                        console.error(`[RecCache] Error fetching more ${genre} content:`, error);
                    }
                }
            }
        }

        console.log('[RecCache] Final results:', results.length, 'items');
        return results;
    }, [cache, userId]);

    const refreshCache = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        // Re-trigger effect by clearing cache or separate logic
        // For now, simple re-mount simulation
        setCache(null);
    }, [userId]);

    return { cache, isLoading, error, getFiltered, refreshCache };
};
