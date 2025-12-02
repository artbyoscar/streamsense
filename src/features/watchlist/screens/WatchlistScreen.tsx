/**
 * Watchlist Screen - Netflix Inspired
 * Complete redesign with tabs, genres, hero spotlight, and recommendation lanes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '@/features/auth';
import { useCustomNavigation } from '@/navigation/NavigationContext';
import { getWatchlist } from '../services/watchlistService';
import { useRecommendationCache } from '@/hooks/useRecommendationCache';
import { getUserTopGenres } from '@/services/genreAffinity';
import type { UnifiedContent, WatchlistStatus } from '@/types';

// Components
import { WatchlistHeader } from '../components/WatchlistHeader';
import { TabBar, type WatchlistTab } from '../components/TabBar';
import { GenreFilterChips } from '../components/GenreFilterChips';
import { ForYouContent } from '../components/ForYouContent';
import { WatchlistContent } from '../components/WatchlistContent';

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
  content: {
    id: string;
    tmdb_id: number;
    title: string;
    type: 'movie' | 'tv';
    poster_url: string | null;
    overview: string | null;
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

  // ============================================================================
  // FETCH RECOMMENDATIONS
  // ============================================================================

  useEffect(() => {
    const fetchFilteredResults = async () => {
      if (activeTab !== 'forYou') return;

      try {
        const results = await getFilteredRecommendations('all', activeGenre);
        console.log(`[Watchlist] Filtered recommendations: ${results.length} items`);
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

      // Group by status
      const watchingItems = data?.filter((item: any) => item.status === 'watching') || [];
      const wantToWatchItems = data?.filter((item: any) => item.status === 'want_to_watch') || [];
      const watchedItems = data?.filter((item: any) => item.status === 'watched') || [];

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

    if ('content' in item && item.content) {
      // It's a WatchlistItemWithContent
      content = {
        id: item.content.tmdb_id || 0,
        title: item.content.title || 'Unknown Title',
        originalTitle: item.content.title || 'Unknown Title',
        type: item.content.type || 'movie',
        overview: item.content.overview || '',
        posterPath: item.content.poster_url || null,
        backdropPath: null,
        releaseDate: null,
        genres: [],
        rating: 0,
        voteCount: 0,
        popularity: 0,
        language: '',
      };
    } else {
      // It's already UnifiedContent
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
      <TabBar activeTab={activeTab} onTabChange={setActiveWatchlistTab} />

      {/* Content Area */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]} // Genre chips stick
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#a78bfa" />
        }
      >
        {/* Genre Filter Chips (sticky) */}
        <GenreFilterChips activeGenre={activeGenre} onGenreChange={setActiveGenre} />

        {/* Tab Content */}
        {activeTab === 'forYou' && (
          <ForYouContent
            recommendations={recommendations}
            isLoading={loadingRecommendations}
            onItemPress={handleItemPress}
            onAddToList={handleAddToList}
            onOpenDiscover={handleOpenDiscover}
          />
        )}

        {activeTab === 'wantToWatch' && (
          <WatchlistContent
            items={wantToWatch}
            status="want_to_watch"
            isEmpty={isCurrentTabEmpty}
            onItemPress={handleItemPress}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'watching' && (
          <WatchlistContent
            items={watching}
            status="watching"
            isEmpty={isCurrentTabEmpty}
            onItemPress={handleItemPress}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'watched' && (
          <WatchlistContent
            items={watched}
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
  content: {
    flex: 1,
  },
  bottomPadding: {
    height: 100,
  },
});
