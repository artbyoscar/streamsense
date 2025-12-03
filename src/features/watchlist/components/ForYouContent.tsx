/**
 * For You Content Component
 * Main recommendation view with hero spotlight and multiple lanes
 */
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { HeroSpotlight } from './HeroSpotlight';
import { RecommendationLane } from './RecommendationLane';
import { ExplorationCTA } from './ExplorationCTA';
import { batchGetServiceBadges, getUserSubscriptionNames } from '@/services/watchProviders';
import { useAuth } from '@/providers/AuthProvider';
import type { UnifiedContent } from '@/types';

interface ForYouContentProps {
  recommendations: UnifiedContent[];
  isLoading: boolean;
  onItemPress: (item: UnifiedContent) => void;
  onAddToList: (item: UnifiedContent) => void;
  onOpenDiscover: () => void;
}

export const ForYouContent: React.FC<ForYouContentProps> = ({
  recommendations,
  isLoading,
  onItemPress,
  onAddToList,
  onOpenDiscover,
}) => {
  const { user } = useAuth();
  const [serviceBadges, setServiceBadges] = useState<Map<number, { name: string; color: string; initial: string }>>(new Map());
  const [badgesLoading, setBadgesLoading] = useState(false);

  // Fetch service badges for trending items
  useEffect(() => {
    const fetchBadges = async () => {
      if (!user?.id || recommendations.length < 12) return;

      setBadgesLoading(true);
      try {
        const subscriptions = await getUserSubscriptionNames(user.id);
        if (subscriptions.length === 0) {
          setBadgesLoading(false);
          return;
        }

        // Get badges for trending items (slice 11-21)
        const trendingItems = recommendations.slice(11, 21);
        const badges = await batchGetServiceBadges(trendingItems, subscriptions);
        setServiceBadges(badges);
        console.log('[ForYou] Fetched service badges:', badges.size);
      } catch (error) {
        console.log('[ForYou] Error fetching badges:', error);
      }
      setBadgesLoading(false);
    };

    fetchBadges();
  }, [user?.id, recommendations.length]);

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

  // Hero item is the first item
  const heroItem = recommendations[0];

  // Create lanes from recommendations
  const lanes = [
    {
      id: 'top_picks',
      title: 'Top Picks For You',
      subtitle: 'Personalized based on your taste',
      items: recommendations.slice(1, 11),
      showMatchScore: true,
      showServiceBadge: false,
    },
    {
      id: 'trending',
      title: 'Trending on Your Services',
      subtitle: 'Popular now on your subscriptions',
      items: recommendations.slice(11, 21),
      showServiceBadge: true,
    },
    {
      id: 'hidden_gems',
      title: 'Hidden Gems',
      subtitle: 'Under-the-radar picks for you',
      items: recommendations.slice(21, 31),
      showMatchScore: true,
      showServiceBadge: false,
    },
    {
      id: 'more_like',
      title: 'Because You Liked Similar Content',
      subtitle: 'Similar tone and themes',
      items: recommendations.slice(31, 41),
      showMatchScore: false,
      showServiceBadge: false,
    },
  ];

  return (
    <View>
      {/* Hero Spotlight */}
      {heroItem && (
        <HeroSpotlight
          item={heroItem}
          onAddToList={() => onAddToList(heroItem)}
          onViewDetails={() => onItemPress(heroItem)}
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
            serviceBadges={lane.showServiceBadge ? serviceBadges : undefined}
            showServiceBadge={lane.showServiceBadge}
            showMatchScore={lane.showMatchScore}
            onItemPress={onItemPress}
          />
        );
      })}

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
});
