/**
 * Continue Watching Section
 * Horizontal scroll of in-progress content with progress bars
 * Inspired by streaming service "Continue Watching" rows
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Play } from 'lucide-react-native';
import { useWatchlistStore } from '../../watchlist/store/watchlistStore';

interface ContinueWatchingCardProps {
  title: string;
  posterUrl?: string;
  progress: number; // 0-100
  remainingTime?: string;
  onPress: () => void;
}

const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({
  title,
  posterUrl,
  progress,
  remainingTime,
  onPress,
}) => {
  return (
    <Pressable style={styles.continueCard} onPress={onPress}>
      {/* Poster with Play Overlay */}
      <View style={styles.posterContainer}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText}>{title.charAt(0)}</Text>
          </View>
        )}

        {/* Play Overlay */}
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Play size={16} color="#ffffff" fill="#ffffff" />
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Title and Remaining Time */}
      <Text style={styles.continueTitle} numberOfLines={2}>
        {title}
      </Text>
      {remainingTime && (
        <Text style={styles.remainingTime}>{remainingTime} left</Text>
      )}
    </Pressable>
  );
};

export const ContinueWatchingSection: React.FC = () => {
  const { items } = useWatchlistStore();

  // Filter for in-progress items (simulated with random progress for now)
  // In production, this would come from watch history/progress tracking
  const continueWatchingItems = (items || [])
    .filter(item => item.status === 'watching')
    .slice(0, 8)
    .map(item => ({
      ...item,
      progress: Math.floor(Math.random() * 70) + 10, // Simulate 10-80% progress
      remainingTime: `${Math.floor(Math.random() * 90) + 10}m`, // Simulate remaining time
    }));

  if (continueWatchingItems.length === 0) {
    return null;
  }

  const handleItemPress = (item: any) => {
    // TODO: Navigate to content detail or start playback
    console.log('Continue watching:', item.title);
  };

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Continue Watching</Text>
        <Pressable>
          <Text style={styles.seeAll}>See All</Text>
        </Pressable>
      </View>

      {/* Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={140}
      >
        {continueWatchingItems.map((item, index) => (
          <ContinueWatchingCard
            key={item.id}
            title={item.title}
            posterUrl={item.poster_url}
            progress={item.progress}
            remainingTime={item.remainingTime}
            onPress={() => handleItemPress(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginHorizontal: 16,
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
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  continueCard: {
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
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#a78bfa',
  },
  continueTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 16,
  },
  remainingTime: {
    fontSize: 11,
    color: '#888',
  },
});
