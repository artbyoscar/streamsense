/**
 * RecommendationLane Component
 * Single horizontal scrolling lane with title, subtitle, and content
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LaneCard } from './LaneCard';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface ContentItem {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv';
  poster_path: string | null;
  vote_average?: number;
}

interface RecommendationLaneProps {
  id: string;
  title: string;
  subtitle?: string;
  items: ContentItem[];
  onSeeAll?: () => void;
  onCardPress?: (item: ContentItem) => void;
}

export const RecommendationLane: React.FC<RecommendationLaneProps> = ({
  id,
  title,
  subtitle,
  items,
  onSeeAll,
  onCardPress,
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.lane}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
        {onSeeAll && items.length > 5 && (
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={onSeeAll}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <MaterialIcons name="chevron-right" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Scrollable content row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={132} // Card width (120) + margin (12)
        snapToAlignment="start"
      >
        {items.map((item, index) => (
          <LaneCard
            key={`${id}-${item.id}-${index}`}
            id={item.id}
            title={item.title || item.name || 'Untitled'}
            posterPath={item.poster_path}
            voteAverage={item.vote_average}
            mediaType={item.media_type}
            onPress={() => onCardPress?.(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  lane: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
});
