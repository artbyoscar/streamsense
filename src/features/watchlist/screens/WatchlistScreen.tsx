/**
 * Watchlist Screen - Netflix Inspired
 * Complete redesign with tabs, genres, hero spotlight, and recommendation lanes
 * 
 * FIXES APPLIED (Session 13):
 * 1. handleItemPress now correctly uses item.tmdb_id (flat structure) 
 * 2. Genre filtering now checks genre_ids array and maps to genre names
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/features/auth';
import { useCustomNavigation } from '@/navigation/NavigationContext';
import { getWatchlist } from '../services/watchlistService';
import { useRecommendationCache } from '@/hooks/useRecommendationCache';
import { getUserTopGenres } from '@/services/genreAffinity';
import { tmdbApi } from '@/services/tmdb';
import type { UnifiedContent, WatchlistStatus } from '@/types';

// Components
import { WatchlistHeader } from '../components/WatchlistHeader';
import { TabBar, type WatchlistTab } from '../components/TabBar';
import { GenreFilterChips } from '../components/GenreFilterChips';
import { ForYouContent } from '../components/ForYouContent';
import { WatchlistContent } from '../components/WatchlistContent';

// ============================================================================
// GENRE ID MAPPING (TMDb genre IDs to names)
// ============================================================================

const GENRE_ID_MAP: Record<number, string> = {
  // Movie genres
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  // TV genres
  10759: 'Action', // Action & Adventure
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi', // Sci-Fi & Fantasy
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War', // War & Politics
};

// ============================================================================
// TYPES
// ============================================================================

interface WatchlistItemWithContent {
  id: string;
  user_id: string;
  content_id: string;
  status: WatchlistStatus;
  priority: string;
  rating: number | null;
  streaming_services: any;
  added_at: string;
  // Flat structure fields (from direct columns)
  tmdb_id?: number;
  media_type?: 'movie' | 'tv';
  title?: string;
  poster_path?: string;
  overview?: string;
  release_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  // Nested structure (from JOIN with content table)
  content?: {
    id: string;
    tmdb_id: number;
    title: string;
    type: 'movie' | 'tv';
    poster_url: string | null;
    overview: string | null;
    genres?: string[];
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const WatchlistScreen: React.FC<{ isFocused?: boolean }> = ({ isFocused = true }) => {
  const { user } = useAuth();
  const {
    setShowContentSearch,
    setShowContentDetail,
    setSelectedContent,
    setActiveTab,
  } = useCustomNavigation();

  // State
  const [activeTab, setActiveWatchlistTab] = useState<WatchlistTab>('forYou');
  const [activeGenre, setActiveGenre] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [watching, setWatching] = useState<WatchlistItemWithContent[]>([]);
  const [wantToWatch, setWantToWatch] = useState<WatchlistItemWithContent[]>([]);
  const [watched, setWatched] = useState<WatchlistItemWithContent[]>([]);
  const [tasteSignature, setTasteSignature] = useState<string | undefined>();

  // Use cached recommendations for "For You" tab
  const {
    isLoading: loadingRecommendations,
    getFiltered: getFilteredRecommendations,
    refreshCache,
  } = useRecommendationCache(user?.id);

  const [recommendations, setRecommendations] = useState<UnifiedContent[]>([]);
  const [cachedRecommendations, setCachedRecommendations] = useState<UnifiedContent[]>([]);
  const [heroStreamingServices, setHeroStreamingServices] = useState<string[]>([]);

  // ============================================================================
  // INSTANT LOAD - CACHED RECOMMENDATIONS
  // ============================================================================

  // Load cached recommendations IMMEDIATELY on mount
  useEffect(() => {
    const loadCached = async () => {
      try {
        const cached = await AsyncStorage.getItem('foryou_recommendations_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.items && parsed.items.length > 0) {
            console.log('[ForYou] Loaded cached recommendations:', parsed.items.length);
            setCachedRecommendations(parsed.items);
          }
        }
      } catch (e) {
        console.log('[ForYou] No cached recommendations available');
      }
    };
    loadCached();
  }, []);

  // Save to cache whenever fresh recommendations arrive
  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      AsyncStorage.setItem('foryou_recommendations_cache', JSON.stringify({
        items: recommendations,
        timestamp: Date.now()
      })).catch(() => {});
    }
  }, [recommendations]);

  // Use cached while loading fresh
  const displayRecommendations = (loadingRecommendations && cachedRecommendations.length > 0)
    ? cachedRecommendations
    : recommendations;

  // ============================================================================
  // HERO ITEM CALCULATION & STREAMING SERVICES
  // ============================================================================

  // Calculate hero item (first recommendation from display)
  const heroItem = useMemo(() => {
    if (!displayRecommendations || displayRecommendations.length === 0) return null;
    return displayRecommendations[0];
  }, [displayRecommendations]);

  // Fetch streaming services for hero item
  useEffect(() => {
    if (!heroItem || !heroItem.id) {
      setHeroStreamingServices([]);
      return;
    }

    const fetchStreaming = async () => {
      try {
        const mediaType = heroItem.type || (heroItem as any).media_type || 'movie';
        const response = await tmdbApi.get(`/${mediaType}/${heroItem.id}/watch/providers`);
        const usProviders = response.data.results?.US?.flatrate || [];
        const services = usProviders.map((p: any) => p.provider_name);
        setHeroStreamingServices(services);
        console.log('[Watchlist] Fetched hero streaming services:', services);
      } catch (e) {
        console.log('[Watchlist] Could not fetch hero streaming services');
        setHeroStreamingServices([]);
      }
    };

    fetchStreaming();
  }, [heroItem?.id]);

  // Enrich display recommendations with hero streaming services
  const enrichedRecommendations = useMemo(() => {
    if (!displayRecommendations || displayRecommendations.length === 0) return [];
    if (!heroItem || heroStreamingServices.length === 0) return displayRecommendations;

    return displayRecommendations.map((item, index) => {
      // Enrich only the first item (hero)
      if (index === 0) {
        return { ...item, streaming_services: heroStreamingServices };
      }
      return item;
    });
  }, [displayRecommendations, heroItem, heroStreamingServices]);

  // ============================================================================
  // GENRE FILTERING FOR WATCHLIST TABS
  // ============================================================================

  // Helper to extract genre name from various formats
  const extractGenreName = useCallback((genre: any): string | null => {
    if (!genre) return null;
    
    // Format 1: Already a string genre name
    if (typeof genre === 'string') {
      // Check if it's a JSON string like '{"id":10765,"name":"Sci-Fi & Fantasy"}'
      if (genre.startsWith('{')) {
        try {
          const parsed = JSON.parse(genre);
          return parsed.name || null;
        } catch {
          return genre; // Return as-is if not valid JSON
        }
      }
      // Check if it's a numeric string like "16"
      const numId = parseInt(genre, 10);
      if (!isNaN(numId) && GENRE_ID_MAP[numId]) {
        return GENRE_ID_MAP[numId];
      }
      return genre; // Return as genre name
    }
    
    // Format 2: Number (genre ID)
    if (typeof genre === 'number') {
      return GENRE_ID_MAP[genre] || null;
    }
    
    // Format 3: Object with name property
    if (typeof genre === 'object' && genre.name) {
      return genre.name;
    }
    
    return null;
  }, []);

  // Filter watchlist items by selected genre
  const filterByGenre = useCallback((items: WatchlistItemWithContent[]) => {
    if (activeGenre === 'All') return items;

    return items.filter(item => {
      // Collect all possible genre sources
      const allGenres: any[] = [];
      
      // Source 1: Direct genre_ids array (numbers)
      if (item.genre_ids && Array.isArray(item.genre_ids)) {
        allGenres.push(...item.genre_ids);
      }
      
      // Source 2: Nested content.genres (can be various formats)
      if (item.content?.genres && Array.isArray(item.content.genres)) {
        allGenres.push(...item.content.genres);
      }
      
      // Source 3: Flat genres array on item
      const flatGenres = (item as any).genres;
      if (flatGenres && Array.isArray(flatGenres)) {
        allGenres.push(...flatGenres);
      }

      // Check if any genre matches
      return allGenres.some(g => {
        const genreName = extractGenreName(g);
        if (!genreName) return false;
        
        // Normalize for comparison
        const normalizedGenre = genreName.toLowerCase().trim();
        const normalizedActive = activeGenre.toLowerCase().trim();
        
        // Direct match
        if (normalizedGenre === normalizedActive) return true;
        
        // Handle combined genres like "Sci-Fi & Fantasy" matching "Sci-Fi"
        if (normalizedGenre.includes(normalizedActive)) return true;
        if (normalizedActive.includes(normalizedGenre)) return true;
        
        return false;
      });
    });
  }, [activeGenre, extractGenreName]);

  const filteredWantToWatch = useMemo(() => filterByGenre(wantToWatch), [wantToWatch, filterByGenre]);
  const filteredWatching = useMemo(() => filterByGenre(watching), [watching, filterByGenre]);
  const filteredWatched = useMemo(() => filterByGenre(watched), [watched, filterByGenre]);

  // ============================================================================
  // WATCHLIST IDS FOR EXCLUSION
  // ============================================================================

  // Calculate all watchlist IDs to exclude from recommendations
  const watchlistIds = useMemo(() => {
    const allItems = [...watching, ...wantToWatch, ...watched];
    if (allItems.length === 0) return new Set<number>();

    const ids = allItems.map(item => {
      // PRIORITY ORDER for getting TMDb ID:
      // 1. Direct tmdb_id on the item
      // 2. Nested content.tmdb_id
      // 3. Skip if missing
      return item.tmdb_id || item.content?.tmdb_id || null;
    }).filter((id): id is number => id !== null);

    console.log('[Watchlist] Excluding', ids.length, 'watchlist items from recommendations');
    return new Set(ids);
  }, [watching, wantToWatch, watched]);

  // ============================================================================
  // FETCH RECOMMENDATIONS
  // ============================================================================

  useEffect(() => {
    const fetchFilteredResults = async () => {
      if (activeTab !== 'forYou') return;

      try {
        const results = await getFilteredRecommendations('all', activeGenre);
        console.log('[Watchlist] Filtered recommendations: ' + results.length + ' items');
        setRecommendations(results);
      } catch (error) {
        console.error('[Watchlist] Error filtering recommendations:', error);
        setRecommendations([]);
      }
    };

    fetchFilteredResults();
  }, [activeTab, activeGenre, getFilteredRecommendations]);

  // ============================================================================
  // FETCH WATCHLIST
  // ============================================================================

  const fetchWatchlist = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getWatchlist(user.id);

      console.log('[Watchlist] 📊 Fetched watchlist data:', data?.length || 0, 'items');

      // Debug: Show all unique status values in the data
      if (data && data.length > 0) {
        const statusValues = [...new Set(data.map((item: any) => item.status))];
        console.log('[Watchlist] Unique status values found:', statusValues);
        console.log('[Watchlist] Sample items:', data.slice(0, 3).map((item: any) => ({
          id: item.id,
          status: item.status,
          title: item.content?.title || item.title || 'Unknown',
          tmdb_id: item.tmdb_id || item.content?.tmdb_id || 'missing',
          media_type: item.media_type || item.content?.type || 'missing',
        })));
      }

      // Group by status
      const watchingItems = data?.filter((item: any) => item.status === 'watching') || [];
      const wantToWatchItems = data?.filter((item: any) => item.status === 'want_to_watch') || [];
      const watchedItems = data?.filter((item: any) => item.status === 'watched') || [];

      console.log('[Watchlist] Filtered results:');
      console.log('  - Watching:', watchingItems.length, 'items');
      console.log('  - Want to Watch:', wantToWatchItems.length, 'items');
      console.log('  - Watched:', watchedItems.length, 'items');

      setWatching(watchingItems);
      setWantToWatch(wantToWatchItems);
      setWatched(watchedItems);
    } catch (error) {
      console.error('[Watchlist] Error fetching watchlist:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Refresh when screen gains focus
  useEffect(() => {
    if (isFocused) {
      fetchWatchlist();
    }
  }, [isFocused, fetchWatchlist]);

  // Load user top genres for taste signature
  useEffect(() => {
    if (user?.id) {
      getUserTopGenres(user.id, 3).then((genres) => {
        if (genres && genres.length > 0) {
          const genreNames = genres.map((g) => g.genreName).join(', ');
          setTasteSignature(`${genreNames} lover`);
        }
      });
    }
  }, [user?.id]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleTabChange = (tab: WatchlistTab) => {
    setActiveWatchlistTab(tab);
    setActiveGenre('All'); // Reset genre filter when changing tabs
    console.log('[Watchlist] Tab changed to:', tab, '- filter reset to All');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchWatchlist(), refreshCache()]);
    } catch (error) {
      console.error('[Watchlist] Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleItemPress = (item: UnifiedContent | WatchlistItemWithContent) => {
    // Convert watchlist item to UnifiedContent if needed
    let content: UnifiedContent;

    // Check if it's a WatchlistItemWithContent (has watchlist-specific fields)
    const isWatchlistItem = 'status' in item || 'content_id' in item || 'added_at' in item;

    if (isWatchlistItem) {
      const watchlistItem = item as WatchlistItemWithContent;
      
      // PRIORITY ORDER for getting TMDb ID:
      // 1. Direct tmdb_id on the item (from our batch update)
      // 2. Nested content.tmdb_id (from JOIN)
      // 3. Fall back to 0 (will cause error but at least won't crash)
      const tmdbId = watchlistItem.tmdb_id 
        || watchlistItem.content?.tmdb_id 
        || 0;
      
      // PRIORITY ORDER for media type:
      // 1. Direct media_type on the item
      // 2. Nested content.type
      // 3. Default to 'movie'
      const mediaType = watchlistItem.media_type 
        || watchlistItem.content?.type 
        || 'movie';
      
      // PRIORITY ORDER for title:
      // 1. Direct title on item
      // 2. Nested content.title
      // 3. 'Unknown Title'
      const title = watchlistItem.title 
        || watchlistItem.content?.title 
        || 'Unknown Title';

      // PRIORITY ORDER for poster:
      // 1. Direct poster_path on item
      // 2. Nested content.poster_url
      // 3. null
      const posterPath = watchlistItem.poster_path 
        || watchlistItem.content?.poster_url 
        || null;

      // PRIORITY ORDER for overview:
      // 1. Direct overview on item
      // 2. Nested content.overview
      // 3. empty string
      const overview = watchlistItem.overview 
        || watchlistItem.content?.overview 
        || '';

      // Log for debugging
      console.log('[Watchlist] Opening item:', {
        title,
        tmdb_id: tmdbId,
        media_type: mediaType,
        source: watchlistItem.tmdb_id ? 'direct' : watchlistItem.content?.tmdb_id ? 'nested' : 'missing'
      });

      content = {
        id: tmdbId,
        title: title,
        originalTitle: title,
        type: mediaType,
        overview: overview,
        posterPath: posterPath,
        backdropPath: null,
        releaseDate: watchlistItem.release_date || null,
        genres: [],
        rating: watchlistItem.vote_average || 0,
        voteCount: 0,
        popularity: 0,
        language: '',
      };
    } else {
      // It's already UnifiedContent (from recommendations)
      content = item as UnifiedContent;
    }

    setSelectedContent(content);
    setShowContentDetail(true);
  };

  const handleAddToList = (item: UnifiedContent) => {
    // This would typically add the item to the watchlist
    console.log('[Watchlist] Add to list:', item.title);
    // For now, just open the detail view
    handleItemPress(item);
  };

  const handleOpenDiscover = () => {
    setActiveTab('Discover');
  };

  const handleNavigate = (destination: string) => {
    if (destination === 'forYou') {
      setActiveWatchlistTab('forYou');
    } else if (destination === 'wantToWatch') {
      setActiveWatchlistTab('wantToWatch');
    }
  };

  // ============================================================================
  // GET CURRENT TAB CONTENT
  // ============================================================================

  const getCurrentTabItems = () => {
    switch (activeTab) {
      case 'wantToWatch':
        return wantToWatch;
      case 'watching':
        return watching;
      case 'watched':
        return watched;
      default:
        return [];
    }
  };

  const currentTabItems = getCurrentTabItems();
  const isCurrentTabEmpty = currentTabItems.length === 0;

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <WatchlistHeader
        tasteSignature={tasteSignature}
        onSearchPress={() => setShowContentSearch(true)}
      />

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Genre Filter Chips - Sticky (on all tabs) */}
      <View style={styles.stickyFilters}>
        <GenreFilterChips activeGenre={activeGenre} onGenreChange={setActiveGenre} />
      </View>

      {/* Content Area */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#a78bfa" />
        }
      >
        {/* Tab Content */}
        {activeTab === 'forYou' && (
          <ForYouContent
            recommendations={enrichedRecommendations}
            isLoading={loadingRecommendations && cachedRecommendations.length === 0}
            onItemPress={handleItemPress}
            onAddToList={handleAddToList}
            onOpenDiscover={handleOpenDiscover}
            watchlistIds={watchlistIds}
          />
        )}

        {activeTab === 'wantToWatch' && (
          <WatchlistContent
            items={filteredWantToWatch}
            status="want_to_watch"
            isEmpty={isCurrentTabEmpty}
            onItemPress={handleItemPress}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'watching' && (
          <WatchlistContent
            items={filteredWatching}
            status="watching"
            isEmpty={isCurrentTabEmpty}
            onItemPress={handleItemPress}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'watched' && (
          <WatchlistContent
            items={filteredWatched}
            status="watched"
            isEmpty={isCurrentTabEmpty}
            onItemPress={handleItemPress}
            onNavigate={handleNavigate}
          />
        )}

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyFilters: {
    backgroundColor: '#0f0f0f',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 8,
  },
  content: {
    flex: 1,
  },
  bottomPadding: {
    height: 100,
  },
});