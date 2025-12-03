/**
 * Picked For You Section
 * Preview of personalized recommendations
 * Drives users to the "For You" recommendations tab
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Sparkles, Star, TrendingUp } from 'lucide-react-native';
import { useCustomNavigation } from '@/navigation/NavigationContext';
import { useRecommendationLanes } from '../../recommendations/hooks/useRecommendations';

interface PickedForYouCardProps {
  title: string;
  posterUrl?: string;
  matchScore?: number;
  reason?: string;
  onPress: () => void;
}

const PickedForYouCard: React.FC<PickedForYouCardProps> = ({
  title,
  posterUrl,
  matchScore,
  reason,
  onPress,
}) => {
  return (
    <Pressable style={styles.pickedCard} onPress={onPress}>
      {/* Poster */}
      <View style={styles.posterContainer}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText}>{title.charAt(0)}</Text>
          </View>
        )}

        {/* Match Score Badge */}
        {matchScore && matchScore >= 80 && (
          <View style={styles.matchBadge}>
            <Star size={10} color="#fbbf24" fill="#fbbf24" />
            <Text style={styles.matchText}>{matchScore}%</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.pickedTitle} numberOfLines={2}>
        {title}
      </Text>

      {/* Reason */}
      {reason && (
        <Text style={styles.pickedReason} numberOfLines={1}>
          {reason}
        </Text>
      )}
    </Pressable>
  );
};

export const PickedForYouSection: React.FC = () => {
  const { data: lanes, isLoading } = useRecommendationLanes();

  // Get first lane with recommendations (Hidden Gems or Trending For You)
  const pickedForYou = lanes
    ?.flatMap(lane => lane.items)
    .slice(0, 10)
    .map(item => ({
      id: item.tmdb_id.toString(),
      title: item.title,
      posterUrl: item.poster_path
        ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
        : undefined,
      matchScore: item.match_score ? Math.round(item.match_score * 100) : undefined,
      reason: item.reason || 'Based on your taste',
    })) || [];

  const handleItemPress = (item: any) => {
    // TODO: Navigate to content detail
    console.log('Picked for you:', item.title);
  };

  const { setActiveTab } = useCustomNavigation();

  const handleViewAll = () => {
    setActiveTab('Watchlist');
  };

  if (isLoading || pickedForYou.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Sparkles size={18} color="#a78bfa" />
          <Text style={styles.sectionTitle}>Picked For You</Text>
        </View>
        <Pressable onPress={handleViewAll}>
          <Text style={styles.seeAll}>View All</Text>
        </Pressable>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Based on your watchlist and viewing habits
      </Text>

      {/* Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={140}
      >
        {pickedForYou.map((item) => (
          <PickedForYouCard
            key={item.id}
            title={item.title}
            posterUrl={item.posterUrl}
            matchScore={item.matchScore}
            reason={item.reason}
            onPress={() => handleItemPress(item)}
          />
        ))}
      </ScrollView>

      {/* CTA to For You Tab */}
      <Pressable style={styles.ctaButton} onPress={handleViewAll}>
        <TrendingUp size={18} color="#a78bfa" />
        <Text style={styles.ctaText}>Explore all recommendations</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  seeAll: {
    fontSize: 14,
    color: '#a78bfa',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  pickedCard: {
    width: 120,
  },
  posterContainer: {
    width: 120,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginBottom: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPlaceholderText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#a78bfa',
  },
  matchBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fbbf24',
  },
  pickedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 16,
  },
  pickedReason: {
    fontSize: 11,
    color: '#a78bfa',
    fontStyle: 'italic',
  },
  ctaButton: {
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a78bfa',
  },
});


