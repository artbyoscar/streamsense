/**
 * Picked For You Section
 * Preview of personalized recommendations
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Sparkles, Star, TrendingUp, ChevronRight, RefreshCw } from 'lucide-react-native';
import { useCustomNavigation } from '@/navigation/NavigationContext';
import { useRecommendationLanes } from '../../recommendations/hooks/useRecommendations';
import { loadMoreRecommendations } from '@/services/smartRecommendations';
import { useAuth } from '@/hooks/useAuth';

interface PickedForYouCardProps {
  title: string;
  posterUrl?: string;
  matchScore?: number;
  reason?: string;
  year?: string;
  overview?: string;
  onPress: () => void;
}

const PickedForYouCard: React.FC<PickedForYouCardProps> = ({
  title,
  posterUrl,
  matchScore,
  reason,
  year,
  overview,
  onPress,
}) => {
  return (
    <Pressable style={styles.pickedCard} onPress={onPress}>
      <View style={styles.posterContainer}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText}>{title.charAt(0)}</Text>
          </View>
        )}

        {matchScore && matchScore >= 80 && (
          <View style={styles.matchBadge}>
            <Star size={10} color="#fbbf24" fill="#fbbf24" />
            <Text style={styles.matchText}>{matchScore}%</Text>
          </View>
        )}
      </View>

      <Text style={styles.pickedTitle} numberOfLines={2}>
        {title}
      </Text>

      {year && (
        <Text style={styles.pickedYear}>{year}</Text>
      )}

      {overview && (
        <Text style={styles.pickedOverview} numberOfLines={2}>
          {overview}
        </Text>
      )}

      {reason && (
        <Text style={styles.pickedReason} numberOfLines={1}>
          {reason}
        </Text>
      )}
    </Pressable>
  );
};

export const PickedForYouSection: React.FC = () => {
  const { user } = useAuth();
  const { data: lanes, isLoading, refetch } = useRecommendationLanes();
  const { setActiveTab, setSelectedContent, setShowContentDetail, setOnContentAdded } = useCustomNavigation();

  const [removedItemIds, setRemovedItemIds] = useState<Set<string>>(new Set());
  const [additionalItems, setAdditionalItems] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Track the currently selected item ID for removal after add
  const pendingItemIdRef = useRef<string | null>(null);

  // Register callback for when content is added to watchlist
  useEffect(() => {
    const handleContentAdded = () => {
      if (pendingItemIdRef.current) {
        console.log('[PickedForYou] Removing item after watchlist add:', pendingItemIdRef.current);
        setRemovedItemIds(prev => new Set([...prev, pendingItemIdRef.current!]));
        pendingItemIdRef.current = null;
      }
    };

    setOnContentAdded(handleContentAdded);

    return () => {
      setOnContentAdded(null);
    };
  }, [setOnContentAdded]);

  // Combine lane items with additional loaded items
  const allItems = React.useMemo(() => {
    const laneItems = lanes
      ?.flatMap(lane => lane.items)
      .slice(0, 15) || [];

    return [...laneItems, ...additionalItems];
  }, [lanes, additionalItems]);

  // Filter and format items
  const pickedForYou = allItems
    .map(item => ({
      ...item,
      id: item.tmdb_id?.toString() || item.id?.toString(),
      posterUrl: item.poster_path
        ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
        : undefined,
      matchScore: item.match_score ? Math.round(item.match_score * 100) : undefined,
      reason: item.reason || 'Based on your taste',
      year: (item.releaseDate || item.release_date)?.split('-')[0],
      overview: item.overview || undefined,
    }))
    .filter(item => !removedItemIds.has(item.id))
    .slice(0, 20); // Show up to 20 items

  const handleItemPress = (item: any) => {
    // Store the item ID for potential removal ONLY if added to watchlist
    pendingItemIdRef.current = item.id;

    const content = {
      id: item.tmdb_id || item.id,
      title: item.title,
      posterPath: item.poster_path || item.posterPath || null,
      media_type: item.media_type || item.type || 'movie',
      type: item.media_type || item.type || 'movie',
      overview: item.overview || '',
      rating: item.rating || item.vote_average || 0,
      releaseDate: item.releaseDate || item.release_date || null,
      genres: item.genres || [],
      backdropPath: item.backdropPath || item.backdrop_path || null,
      voteCount: item.voteCount || item.vote_count || 0,
      originalTitle: item.originalTitle || item.original_title || item.title,
      popularity: item.popularity || 0,
      language: item.language || item.original_language || 'en',
    };
    setSelectedContent(content as any);
    setShowContentDetail(true);
  };

  const handleViewAll = () => {
    setActiveTab('Watchlist');
  };

  const handleLoadMore = useCallback(async () => {
    if (!user?.id || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const currentCount = allItems.length;
      const newItems = await loadMoreRecommendations({
        userId: user.id,
        currentCount,
        mediaType: 'mixed',
        limit: 10,
      });

      if (newItems.length > 0) {
        setAdditionalItems(prev => [...prev, ...newItems]);
        console.log('[PickedForYou] Loaded', newItems.length, 'more items');
      }
    } catch (error) {
      console.error('[PickedForYou] Error loading more:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [user?.id, allItems.length, isLoadingMore]);

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
          <Animated.View
            key={item.id}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
          >
            <PickedForYouCard
              title={item.title}
              posterUrl={item.posterUrl}
              matchScore={item.matchScore}
              reason={item.reason}
              year={item.year}
              overview={item.overview}
              onPress={() => handleItemPress(item)}
            />
          </Animated.View>
        ))}

        {/* Load More Button in scroll */}
        <Pressable
          style={styles.loadMoreCard}
          onPress={handleLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <ActivityIndicator size="small" color="#a78bfa" />
          ) : (
            <>
              <View style={styles.loadMoreIconContainer}>
                <ChevronRight size={24} color="#a78bfa" />
              </View>
              <Text style={styles.loadMoreCardText}>Load More</Text>
            </>
          )}
        </Pressable>
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
    marginBottom: 2,
    lineHeight: 16,
  },
  pickedYear: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  pickedOverview: {
    fontSize: 10,
    color: '#999',
    lineHeight: 13,
    marginBottom: 3,
  },
  pickedReason: {
    fontSize: 11,
    color: '#a78bfa',
    fontStyle: 'italic',
  },
  loadMoreCard: {
    width: 120,
    height: 180,
    borderRadius: 12,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  loadMoreIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  loadMoreCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a78bfa',
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