/**
 * For You Content Component
 * Main recommendation view with hero spotlight and multiple lanes
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { HeroSpotlight } from './HeroSpotlight';
import { RecommendationLane } from './RecommendationLane';
import { ExplorationCTA } from './ExplorationCTA';
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
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a78bfa" />
        <Text style={styles.loadingText}>Loading recommendations...</Text>
      </View>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No recommendations available</Text>
        <Text style={styles.emptySubtext}>Add content to your watchlist to get personalized recommendations</Text>
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
    },
    {
      id: 'trending',
      title: 'Trending on Your Services',
      subtitle: null,
      items: recommendations.slice(11, 21),
      showServiceBadge: true,
    },
    {
      id: 'hidden_gems',
      title: 'Hidden Gems',
      subtitle: 'Under-the-radar picks for you',
      items: recommendations.slice(21, 31),
      showMatchScore: true,
    },
    {
      id: 'more_like',
      title: 'Because You Liked Similar Content',
      subtitle: 'Similar tone and themes',
      items: recommendations.slice(31, 41),
      showMatchScore: false,
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
    paddingVertical: 80,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
