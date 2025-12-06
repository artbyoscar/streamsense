/**
 * Recommendation Lane Component
 * Netflix-style horizontal scrolling content row
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { ContentCard } from './ContentCard';
import type { UnifiedContent } from '@/types';

interface RecommendationLaneProps {
  title: string;
  subtitle?: string;
  items: (UnifiedContent | any)[];
  serviceBadges?: Map<number, { name: string; color: string; initial: string }>;
  showServiceBadge?: boolean;
  showMatchScore?: boolean;
  onSeeAll?: () => void;
  onItemPress: (item: UnifiedContent | any) => void;
}

export const RecommendationLane: React.FC<RecommendationLaneProps> = ({
  title,
  subtitle,
  items,
  serviceBadges,
  showServiceBadge = false,
  showMatchScore = false,
  onSeeAll,
  onItemPress,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.laneContainer}>
      {/* Lane Header */}
      <View style={styles.laneHeader}>
        <View>
          <Text style={styles.laneTitle}>{title}</Text>
          {subtitle && <Text style={styles.laneSubtitle}>{subtitle}</Text>}
        </View>
        {onSeeAll && (
          <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#a78bfa" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.laneContent}
        decelerationRate="fast"
        snapToInterval={132} // Card width + gap
      >
        {items.map((item, index) => (
          <Animated.View
            key={`${item.id}-${index}`}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
          >
            <ContentCard
              item={item}
              serviceBadge={serviceBadges?.get(item.id) || null}
              showServiceBadge={showServiceBadge}
              showMatchScore={showMatchScore}
              onPress={() => onItemPress(item)}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  laneContainer: {
    marginBottom: 24,
  },
  laneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  laneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  laneSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: '#a78bfa',
    fontWeight: '500',
  },
  laneContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
});





