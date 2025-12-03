/**
 * Discover Screen - Tinder-Inspired Swipe Interface
 * Polished card-based UI for rapid content discovery
 * 
 * Fixed for StreamSense codebase compatibility
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X, Heart, Play, CheckCircle2, Info, Star, Sparkles, RefreshCw } from 'lucide-react-native';

// Relative imports matching your project structure
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../config/supabase';
import { getSmartRecommendations } from '../../../services/smartRecommendations';
import { trackGenreInteraction } from '../../../services/genreAffinity';
import type { UnifiedContent } from '../../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 340);
const SWIPE_THRESHOLD = 120;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SwipeScreen: React.FC = () => {
  const { user } = useAuth();

  // State
  const [items, setItems] = useState<UnifiedContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Current item
  const currentItem = items[currentIndex];

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadItems = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const recommendations = await getSmartRecommendations({
        userId: user.id,
        limit: 50,
        mediaType: 'mixed',
        forceRefresh: false,
        excludeSessionItems: false, // Don't exclude - let pagination and fatigue handle variety
      });
      setItems(recommendations);
      setCurrentIndex(0);
    } catch (error) {
      console.error('[Discover] Error loading items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Pre-fetch next 3 images
  useEffect(() => {
    if (items.length > 0) {
      items.slice(currentIndex + 1, currentIndex + 4).forEach(item => {
        if (item.posterPath) {
          const imageUrl = `https://image.tmdb.org/t/p/w500${item.posterPath}`;
          Image.prefetch(imageUrl);
        }
      });
    }
  }, [currentIndex, items]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const resetCard = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [translateX, translateY]);

  const moveToNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetCard();
    } else {
      // End of deck
      setCurrentIndex(items.length);
    }
  }, [currentIndex, items.length, resetCard]);

  const handleLike = useCallback(async () => {
    if (!user?.id || !currentItem) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Add to watchlist
      await supabase.from('watchlist_items').insert({
        user_id: user.id,
        tmdb_id: currentItem.id,
        media_type: currentItem.type,
        status: 'want_to_watch',
      });

      // Track interaction - extract genre IDs from genres array
      const genreIds = currentItem.genres?.map(g => g.id) || [];
      if (genreIds.length > 0) {
        await trackGenreInteraction(
          user.id,
          genreIds,
          currentItem.type,
          'ADD_TO_WATCHLIST'
        );
      }

      console.log('[Discover] Added to watchlist:', currentItem.title);
      moveToNext();
    } catch (error) {
      console.error('[Discover] Error adding to watchlist:', error);
      moveToNext(); // Still move on even if error
    }
  }, [user, currentItem, moveToNext]);

  const handleSkip = useCallback(() => {
    if (!currentItem) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[Discover] Skipped:', currentItem.title);
    moveToNext();
  }, [currentItem, moveToNext]);

  const handleWatching = useCallback(async () => {
    if (!user?.id || !currentItem) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await supabase.from('watchlist_items').insert({
        user_id: user.id,
        tmdb_id: currentItem.id,
        media_type: currentItem.type,
        status: 'watching',
      });

      const genreIds = currentItem.genres?.map(g => g.id) || [];
      if (genreIds.length > 0) {
        await trackGenreInteraction(
          user.id,
          genreIds,
          currentItem.type,
          'START_WATCHING'
        );
      }

      console.log('[Discover] Marked as watching:', currentItem.title);
      moveToNext();
    } catch (error) {
      console.error('[Discover] Error marking as watching:', error);
      moveToNext();
    }
  }, [user, currentItem, moveToNext]);

  const handleWatched = useCallback(async () => {
    if (!user?.id || !currentItem) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await supabase.from('watchlist_items').insert({
        user_id: user.id,
        tmdb_id: currentItem.id,
        media_type: currentItem.type,
        status: 'watched',
        watched: true,
        watched_at: new Date().toISOString(),
      });

      const genreIds = currentItem.genres?.map(g => g.id) || [];
      if (genreIds.length > 0) {
        await trackGenreInteraction(
          user.id,
          genreIds,
          currentItem.type,
          'COMPLETE_WATCHING'
        );
      }

      console.log('[Discover] Marked as watched:', currentItem.title);
      moveToNext();
    } catch (error) {
      console.error('[Discover] Error marking as watched:', error);
      moveToNext();
    }
  }, [user, currentItem, moveToNext]);

  const openDetails = useCallback(() => {
    if (!currentItem) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Open ContentDetailModal
    console.log('[Discover] Show details for:', currentItem.title);
  }, [currentItem]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    loadItems();
  }, [loadItems]);

  // ============================================================================
  // GESTURE HANDLING (Reanimated v4 compatible)
  // ============================================================================

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.5; // Dampen vertical
    })
    .onEnd((event) => {
      const shouldDismissRight = event.translationX > SWIPE_THRESHOLD;
      const shouldDismissLeft = event.translationX < -SWIPE_THRESHOLD;

      if (shouldDismissRight) {
        translateX.value = withTiming(400, { duration: 200 }, () => {
          runOnJS(handleLike)();
        });
      } else if (shouldDismissLeft) {
        translateX.value = withTiming(-400, { duration: 200 }, () => {
          runOnJS(handleSkip)();
        });
      } else {
        // Spring back to center
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-200, 0, 200],
      [-15, 0, 15],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  const likeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, 100],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const skipIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-100, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getImageUrl = (posterPath: string | null | undefined): string | undefined => {
    if (!posterPath) return undefined;
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  };

  const getYear = (item: UnifiedContent): string => {
    if (!item.releaseDate) return '—';
    return new Date(item.releaseDate).getFullYear().toString();
  };

  // ============================================================================
  // EMPTY STATE
  // ============================================================================

  if (!isLoading && items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Sparkles size={64} color="#666" />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>
            Check back later for more personalized recommendations
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <RefreshCw size={20} color="#a78bfa" />
            <Text style={styles.refreshText}>Find More</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a78bfa" />
          <Text style={styles.loadingText}>Finding great content...</Text>
        </View>
      </View>
    );
  }

  // ============================================================================
  // END OF DECK
  // ============================================================================

  if (currentIndex >= items.length) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Sparkles size={64} color="#666" />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>
            You have seen all available recommendations
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <RefreshCw size={20} color="#a78bfa" />
            <Text style={styles.refreshText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const imageUri = getImageUrl(currentItem.posterPath);

  return (
    <View style={styles.container}>
      {/* HEADER ZONE */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>Quick swipe to build your watchlist</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.counter}>{currentIndex + 1} of {items.length}</Text>
        </View>
      </View>

      {/* CARD ZONE */}
      <View style={styles.cardContainer}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, animatedCardStyle]}>
            {/* Poster Image */}
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.poster}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.poster, styles.posterPlaceholder]}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}

            {/* Gradient Overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
              locations={[0.5, 0.8, 1]}
              style={styles.gradient}
            />

            {/* Swipe Indicators */}
            <Animated.View style={[styles.likeIndicator, likeIndicatorStyle]}>
              <Heart size={32} color="#22c55e" fill="#22c55e" />
              <Text style={styles.indicatorText}>WANT TO WATCH</Text>
            </Animated.View>

            <Animated.View style={[styles.skipIndicator, skipIndicatorStyle]}>
              <X size={32} color="#ef4444" strokeWidth={3} />
              <Text style={styles.indicatorText}>NOT INTERESTED</Text>
            </Animated.View>

            {/* Content Info Overlay */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {currentItem.title}
              </Text>
              <View style={styles.metaRow}>
                {currentItem.rating > 0 && (
                  <>
                    <View style={styles.ratingBadge}>
                      <Star size={14} color="#fbbf24" fill="#fbbf24" />
                      <Text style={styles.ratingText}>
                        {currentItem.rating.toFixed(1)}
                      </Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                  </>
                )}
                <Text style={styles.metaText}>{getYear(currentItem)}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>
                  {currentItem.type === 'tv' ? 'TV Show' : 'Movie'}
                </Text>
              </View>
            </View>

            {/* Info Button */}
            <TouchableOpacity
              style={styles.infoButton}
              onPress={openDetails}
              activeOpacity={0.8}
            >
              <Info size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* PRIMARY ACTIONS ZONE */}
      <View style={styles.primaryActions}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <X size={32} color="#ef4444" strokeWidth={3} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.likeButton}
          onPress={handleLike}
          activeOpacity={0.7}
        >
          <Heart size={32} color="#22c55e" fill="#22c55e" />
        </TouchableOpacity>
      </View>

      {/* SECONDARY ACTIONS ZONE */}
      <View style={styles.secondaryActions}>
        <TouchableOpacity
          style={styles.watchingButton}
          onPress={handleWatching}
          activeOpacity={0.8}
        >
          <Play size={18} color="#a78bfa" fill="#a78bfa" />
          <Text style={styles.watchingText}>Watching</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.watchedButton}
          onPress={handleWatched}
          activeOpacity={0.8}
        >
          <CheckCircle2 size={18} color="#a78bfa" />
          <Text style={styles.watchedText}>Watched</Text>
        </TouchableOpacity>
      </View>
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

  // Header Zone
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    marginLeft: 16,
  },
  counter: {
    fontSize: 15,
    color: '#888',
    fontWeight: '500',
  },

  // Card Zone
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: CARD_WIDTH,
    aspectRatio: 0.67,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  poster: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
  },
  metaDot: {
    color: '#666',
    fontSize: 14,
  },
  metaText: {
    color: '#ccc',
    fontSize: 14,
  },
  infoButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Swipe Indicators
  likeIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34,197,94,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    transform: [{ rotate: '-15deg' }],
  },
  skipIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    transform: [{ rotate: '15deg' }],
  },
  indicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Primary Actions Zone
  primaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 60,
    paddingVertical: 16,
  },
  skipButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 2,
    borderColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 2,
    borderColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Secondary Actions Zone
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 16,
  },
  watchingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
  },
  watchedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
  },
  watchingText: {
    color: '#a78bfa',
    fontSize: 15,
    fontWeight: '600',
  },
  watchedText: {
    color: '#a78bfa',
    fontSize: 15,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(167,139,250,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
  },
  refreshText: {
    color: '#a78bfa',
    fontSize: 16,
    fontWeight: '600',
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 15,
    marginTop: 12,
  },
});

export default SwipeScreen;
