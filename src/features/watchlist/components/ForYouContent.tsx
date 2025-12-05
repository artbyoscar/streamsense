/**
 * For You Content Component
 * Main recommendation view with hero spotlight and multiple lanes
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HeroSpotlight } from './HeroSpotlight';
import { RecommendationLane } from './RecommendationLane';
import { ExplorationCTA } from './ExplorationCTA';
import { useCustomNavigation } from '@/navigation/NavigationContext';
import { ChevronDown } from 'lucide-react-native';
import type { UnifiedContent } from '@/types';

// Genre name to TMDb ID mapping
const GENRE_NAME_TO_ID: Record<string, number> = {
  'Action': 28,
  'Adventure': 12,
  'Animation': 16,
  'Comedy': 35,
  'Crime': 80,
  'Documentary': 99,
  'Drama': 18,
  'Family': 10751,
  'Fantasy': 14,
  'Horror': 27,
  'Mystery': 9648,
  'Romance': 10749,
  'Sci-Fi': 878,
  'Thriller': 53,
  'Anime': 16,
};

interface ForYouContentProps {
  recommendations: UnifiedContent[];
  isLoading: boolean;
  onItemPress: (item: UnifiedContent) => void;
  onAddToList: (item: UnifiedContent) => void;
  onOpenDiscover: () => void;
  onLoadMore?: () => Promise<UnifiedContent[]>;
  onRemoveItem?: (itemId: number) => void;
  isLoadingMore?: boolean;
  selectedGenre?: string;
  watchlistIds?: Set<number>;
}

export const ForYouContent: React.FC<ForYouContentProps> = ({
  recommendations,
  isLoading,
  onItemPress,
  onAddToList,
  onOpenDiscover,
  onLoadMore,
  onRemoveItem,
  isLoadingMore = false,
  selectedGenre = 'All',
  watchlistIds,
}) => {
  const { setOnContentAdded } = useCustomNavigation();

  // Track removed item IDs for fade-out effect
  const [removedItemIds, setRemovedItemIds] = useState<Set<number>>(new Set());
  // Track ALL pending item IDs (not just one)
  const pendingItemIdsRef = useRef<Set<number>>(new Set());

  // Instant load - cached recommendations for immediate display
  const [cachedRecommendations, setCachedRecommendations] = useState<UnifiedContent[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load cached recommendations immediately on mount
  useEffect(() => {
    const loadCached = async () => {
      try {
        const cached = await AsyncStorage.getItem('recommendations_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.items && parsed.items.length > 0) {
            console.log('[ForYou] Loaded', parsed.items.length, 'cached recommendations');
            setCachedRecommendations(parsed.items);
            setIsInitialLoad(false);
          }
        }
      } catch (e) {
        console.log('[ForYou] No cached recommendations available');
      }
    };
    loadCached();
  }, []);

  // Load persisted exclusions on mount
  useEffect(() => {
    const loadPersistedExclusions = async () => {
      try {
        const stored = await AsyncStorage.getItem('foryou_removed_items');
        if (stored) {
          const ids = JSON.parse(stored);
          console.log('[ForYou] Loaded persisted exclusions:', ids.length);
          setRemovedItemIds(new Set(ids));
        }
      } catch (e) {
        console.log('[ForYou] Could not load persisted exclusions');
      }
    };
    loadPersistedExclusions();
  }, []);

  // Save recommendations to cache when they change
  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      AsyncStorage.setItem('recommendations_cache', JSON.stringify({
        items: recommendations,
        timestamp: Date.now(),
      })).catch(err => console.error('[ForYou] Failed to cache recommendations:', err));
    }
  }, [recommendations]);

  // Save removed items whenever they change
  useEffect(() => {
    if (removedItemIds.size > 0) {
      AsyncStorage.setItem('foryou_removed_items', JSON.stringify([...removedItemIds]))
        .catch(() => console.log('[ForYou] Could not save removed items'));
    }
  }, [removedItemIds]);

  // Register callback for when content is added to watchlist
  useEffect(() => {
    const handleContentAdded = () => {
      if (pendingItemIdsRef.current.size > 0) {
        const pendingIds = Array.from(pendingItemIdsRef.current);
        console.log('[ForYou] Processing pending items:', pendingIds);

        setRemovedItemIds(prev => {
          const newSet = new Set(prev);
          pendingIds.forEach(id => newSet.add(id));
          return newSet;
        });

        pendingItemIdsRef.current.clear();
      }
    };

    setOnContentAdded(handleContentAdded);

    return () => {
      setOnContentAdded(null);
    };
  }, [setOnContentAdded]);

  // Handle add to list with IMMEDIATE removal from view
  const handleAddToList = useCallback((item: UnifiedContent) => {
    const itemId = item.id || (item as any).tmdb_id;

    // IMMEDIATELY add to removedItemIds so hero/lists update
    setRemovedItemIds(prev => new Set([...prev, itemId]));
    console.log('[ForYou] Immediately removing item:', itemId);

    // Then call parent callbacks
    onAddToList(item);
    if (onRemoveItem) {
      onRemoveItem(itemId);
    }
  }, [onAddToList, onRemoveItem]);

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    if (onLoadMore) {
      await onLoadMore();
    }
  }, [onLoadMore]);

  // Handle item press with pending ID tracking
  const handleItemPress = useCallback((item: UnifiedContent) => {
    // Track this item ID for potential removal if added to watchlist
    const itemId = item.id || (item as any).tmdb_id;
    pendingItemIdsRef.current.add(itemId);
    console.log('[ForYou] Tracking pending item:', itemId);
    onItemPress(item);
  }, [onItemPress]);

  // Use cached data while loading fresh recommendations
  const displayRecommendations = isLoading && cachedRecommendations.length > 0
    ? cachedRecommendations
    : recommendations;

  // Hero item - reactive to genre selection AND removed items
  const heroItem = useMemo(() => {
    if (!displayRecommendations || displayRecommendations.length === 0) return null;

    // Filter out removed items FIRST
    const availableItems = displayRecommendations.filter(item => {
      const itemId = item.id || (item as any).tmdb_id;
      return !removedItemIds.has(itemId);
    });

    if (availableItems.length === 0) return null;

    if (selectedGenre === 'All') {
      return availableItems[0];
    }

    const genreId = GENRE_NAME_TO_ID[selectedGenre];
    if (!genreId) return availableItems[0];

    // Find item where selected genre is PRIMARY (first genre)
    const primaryMatch = availableItems.find(item => {
      const genres = item.genres || (item as any).genre_ids || [];
      if (genres.length === 0) return false;
      const firstGenreId = typeof genres[0] === 'number' ? genres[0] : genres[0]?.id;
      return firstGenreId === genreId;
    });

    if (primaryMatch) return primaryMatch;

    // Fallback: any item with this genre
    const anyMatch = availableItems.find(item => {
      const genres = item.genres || (item as any).genre_ids || [];
      return genres.some((g: any) => {
        const gId = typeof g === 'number' ? g : g?.id;
        return gId === genreId;
      });
    });

    return anyMatch || availableItems[0];
  }, [displayRecommendations, selectedGenre, removedItemIds]);

  // Filter by removed items, watchlist, AND selected genre
  const visibleRecommendations = useMemo(() => {
    if (!displayRecommendations) return [];

    let filtered = displayRecommendations.filter(item => {
      const itemId = item.id || (item as any).tmdb_id;
      // Check both local removals AND watchlist
      if (removedItemIds.has(itemId)) return false;
      if (watchlistIds?.has(itemId)) return false;
      return true;
    });

    // If a specific genre is selected, filter to that genre
    if (selectedGenre && selectedGenre !== 'All') {
      const genreId = GENRE_NAME_TO_ID[selectedGenre];
      if (genreId) {
        filtered = filtered.filter(item => {
          const genres = item.genres || (item as any).genre_ids || [];
          return genres.some((g: any) => {
            const gId = typeof g === 'number' ? g : g?.id;
            return gId === genreId;
          });
        });
      }
    }

    console.log('[ForYou] Visible:', filtered.length, 'removed:', removedItemIds.size, 'watchlist:', watchlistIds?.size || 0);
    return filtered;
  }, [displayRecommendations, removedItemIds, selectedGenre, watchlistIds]);

  // Show loading only if no cached data available
  if (isLoading && cachedRecommendations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  if (!displayRecommendations || displayRecommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No recommendations yet</Text>
        <Text style={styles.emptySubtext}>Add items to your watchlist to get personalized picks</Text>
      </View>
    );
  }

  // Create lanes from recommendations with more items each
  const lanes = [
    {
      id: 'top_picks',
      title: 'Top Picks For You',
      subtitle: 'Personalized based on your taste',
      items: visibleRecommendations.slice(1, 16), // 15 items
      showMatchScore: true,
      showServiceBadge: false,
    },
    {
      id: 'trending',
      title: 'Trending on Your Services',
      subtitle: 'Popular now on your subscriptions',
      items: visibleRecommendations.slice(16, 31), // 15 items
      showServiceBadge: false, // Hide stale badges - modal shows fresh TMDb data
    },
    {
      id: 'hidden_gems',
      title: 'Hidden Gems',
      subtitle: 'Under-the-radar picks for you',
      items: visibleRecommendations.slice(31, 46), // 15 items
      showMatchScore: true,
      showServiceBadge: false,
    },
    {
      id: 'more_like',
      title: 'Because You Liked Similar Content',
      subtitle: 'Similar tone and themes',
      items: visibleRecommendations.slice(46, 61), // 15 items
      showMatchScore: false,
      showServiceBadge: false,
    },
  ];

  return (
    <View>
      {/* Hero Spotlight */}
      {heroItem && (
        <HeroSpotlight
          key={heroItem.id || heroItem.title}
          item={heroItem}
          onAddToList={() => handleAddToList(heroItem)}
          onViewDetails={() => handleItemPress(heroItem)}
        />
      )}

      {/* Recommendation Lanes */}
      {lanes.map((lane) => {
        if (!lane.items || lane.items.length === 0) return null;
        return (
          <RecommendationLane
            key={lane.id}
            title={lane.title}
            subtitle={lane.subtitle || undefined}
            items={lane.items}
            showServiceBadge={lane.showServiceBadge}
            showMatchScore={lane.showMatchScore}
            onItemPress={handleItemPress}
          />
        );
      })}

      {/* Load More Button */}
      {onLoadMore && (
        <Pressable
          style={[styles.loadMoreButton, isLoadingMore && styles.loadMoreButtonDisabled]}
          onPress={handleLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <ActivityIndicator size="small" color="#a78bfa" />
          ) : (
            <>
              <ChevronDown size={20} color="#a78bfa" />
              <Text style={styles.loadMoreText}>Load More Recommendations</Text>
            </>
          )}
        </Pressable>
      )}

      {/* Exploration CTA */}
      <ExplorationCTA onPress={onOpenDiscover} />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  loadMoreButtonDisabled: {
    opacity: 0.6,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#a78bfa',
  },
});