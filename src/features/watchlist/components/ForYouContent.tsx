/**
 * For You Content Component
 * Main recommendation view with hero spotlight and multiple lanes
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Pressable } from 'react-native';
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
}) => {
  const { setOnContentAdded } = useCustomNavigation();

  // Track removed item IDs for fade-out effect
  const [removedItemIds, setRemovedItemIds] = useState<Set<number>>(new Set());
  const pendingItemIdRef = useRef<number | null>(null);

  // Register callback for when content is added to watchlist
  useEffect(() => {
    const handleContentAdded = () => {
      if (pendingItemIdRef.current) {
        console.log('[ForYou] Removing item after watchlist add:', pendingItemIdRef.current);
        setRemovedItemIds(prev => new Set([...prev, pendingItemIdRef.current!]));
        pendingItemIdRef.current = null;
      }
    };

    setOnContentAdded(handleContentAdded);

    return () => {
      setOnContentAdded(null);
    };
  }, [setOnContentAdded]);

  // Handle add to list with removal from view
  const handleAddToList = useCallback((item: UnifiedContent) => {
    onAddToList(item);
    if (onRemoveItem) {
      onRemoveItem(item.id);
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
    // Store the item ID for potential removal if added to watchlist
    pendingItemIdRef.current = item.id;
    onItemPress(item);
  }, [onItemPress]);

  // Hero item - reactive to genre selection (MUST be before early returns)
  const heroItem = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return null;

    // If "All" genre, use first item
    if (selectedGenre === 'All') {
      return recommendations[0];
    }

    const genreId = GENRE_NAME_TO_ID[selectedGenre];
    if (!genreId) return recommendations[0];

    // Find item where selected genre is PRIMARY (first in genres list)
    const primaryMatch = recommendations.find(item => {
      const genres = item.genres || (item as any).genre_ids || [];
      if (genres.length === 0) return false;

      const firstGenreId = typeof genres[0] === 'number' ? genres[0] : genres[0]?.id;
      return firstGenreId === genreId;
    });

    if (primaryMatch) return primaryMatch;

    // Fallback: any item with this genre
    const anyMatch = recommendations.find(item => {
      const genres = item.genres || (item as any).genre_ids || [];
      return genres.some((g: any) => {
        const gId = typeof g === 'number' ? g : g?.id;
        return gId === genreId;
      });
    });

    return anyMatch || recommendations[0];
  }, [recommendations, selectedGenre]);

  // Filter out removed items
  const visibleRecommendations = useMemo(() => {
    if (!recommendations) return [];
    return recommendations.filter(item => {
      const itemId = item.id;
      return !removedItemIds.has(itemId);
    });
  }, [recommendations, removedItemIds]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  if (!recommendations || recommendations.length === 0) {
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