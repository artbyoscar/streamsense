/**
 * Swipe-to-Watch Screen
 * Card-based interface for faster watchlist building
 * Tap buttons to: Add to watchlist, Not interested, or Watch now
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StarRating } from '@/components/StarRating';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/config/supabase';
import { getSmartRecommendations } from '@/services/smartRecommendations';
import { trackGenreInteraction } from '@/services/genreAffinity';
import type { UnifiedContent } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const SWIPE_THRESHOLD = 120; // Pixels to trigger swipe action
const ROTATION_ANGLE = 20; // Degrees of rotation during swipe

interface SwipeAction {
  type: 'watchlist' | 'hide' | 'watching' | 'watched';
  item: UnifiedContent;
  rating?: number;
}

export const SwipeScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [cards, setCards] = useState<UnifiedContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pendingWatchedItem, setPendingWatchedItem] = useState<UnifiedContent | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);

  // Animated values for swipe gestures
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Load user and content
  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      setUser(currentUser);

      // Get smart recommendations with larger pool for variety
      // IMPORTANT: excludeSessionItems: false for infinite feed (Discover never shows "all caught up")
      const recommendations = await getSmartRecommendations({
        userId: currentUser.id,
        limit: 50,
        forceRefresh: false,
        excludeSessionItems: false, // Infinite feed - use pagination instead of exclusion
      });

      console.log('[Swipe] Loaded', recommendations.length, 'recommendations');
      setCards(recommendations);
      setCurrentIndex(0);

      // Prefetch first few images
      recommendations.slice(0, 5).forEach(item => {
        const path = item.posterPath || (item as any).poster_path;
        if (path) {
          Image.prefetch(`https://image.tmdb.org/t/p/w500${path}`);
        }
      });
    } catch (error) {
      console.error('[Swipe] Error loading content:', error);
      Alert.alert('Error', 'Failed to load content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Prefetch upcoming images when index changes
  useEffect(() => {
    if (cards.length > currentIndex + 1) {
      const upcoming = cards.slice(currentIndex + 1, currentIndex + 4);
      upcoming.forEach(item => {
        const path = item.posterPath || (item as any).poster_path;
        if (path) {
          Image.prefetch(`https://image.tmdb.org/t/p/w500${path}`);
        }
      });
    }
  }, [currentIndex, cards]);

  const handleSwipe = async (action: SwipeAction) => {
    try {
      const { type, item, rating } = action;

      // Validate user authentication before any action
      if (!user?.id) {
        console.error('[Swipe] No authenticated user');
        Alert.alert('Error', 'Please sign in to save content');
        return;
      }

      // OPTIMISTIC UPDATE: Move to next card immediately
      // This prevents the "snap back" delay while waiting for DB
      setCurrentIndex(prev => prev + 1);

      // Load more if running low (check against current index before update)
      if (currentIndex >= cards.length - 5) {
        loadMoreContent();
      }

      // Perform DB operations in background
      // We don't await this to keep the UI responsive
      (async () => {
        try {
          if (type === 'watchlist' || type === 'watching' || type === 'watched') {
            // Determine status based on action type
            const status = type === 'watching' ? 'watching' : type === 'watched' ? 'watched' : 'want_to_watch';

            // Determine media type with fallback
            const itemAny = item as any;
            const mediaType = item.type || itemAny.media_type || (itemAny.first_air_date ? 'tv' : 'movie');

            if (!mediaType) {
              console.error('[Swipe] Missing mediaType for item:', item.id, item.title);
              return;
            }

            // Add to watchlist using the content table
            const insertData: any = {
              user_id: user.id,
              content_id: `${mediaType}-${item.id}`,
              status,
              priority: 'medium',
            };

            // Add rating if provided (for 'watched' items)
            if (type === 'watched' && rating) {
              insertData.rating = rating;
            }

            console.log('[Swipe] Inserting into watchlist:', {
              userId: user.id,
              contentId: insertData.content_id,
              status,
            });

            const { error } = await supabase
              .from('watchlist_items')
              .insert(insertData);

            if (error) {
              console.error('[Swipe] Error adding to watchlist:', error);
            } else {
              console.log(`[Swipe] Added "${item.title}" to ${type === 'watched' ? 'watched' : type === 'watching' ? 'watching now' : 'watchlist'}`);

              // Track genre affinity based on rating for watched items
              if (type === 'watched' && rating) {
                const rawGenres = item.genres || (item as any).genre_ids || [];
                const genreIds = rawGenres.map((g: any) => typeof g === 'number' ? g : g.id);

                if (genreIds.length > 0) {
                  const typeForTracking = (mediaType === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv';

                  if (rating >= 4) {
                    await trackGenreInteraction(user.id, genreIds, typeForTracking, 'RATE_HIGH');
                  } else if (rating <= 2) {
                    await trackGenreInteraction(user.id, genreIds, typeForTracking, 'RATE_LOW');
                  } else {
                    await trackGenreInteraction(user.id, genreIds, typeForTracking, 'RATE_MEDIUM');
                  }
                }
              }
            }
          } else if (type === 'hide') {
            console.log(`[Swipe] Hidden "${item.title}"`);
          }
        } catch (bgError) {
          console.error('[Swipe] Background operation failed:', bgError);
        }
      })();

    } catch (error) {
      console.error('[Swipe] Error handling swipe:', error);
    }
  };

  const loadMoreContent = async () => {
    if (!user) return;

    try {
      const recommendations = await getSmartRecommendations({
        userId: user.id,
        limit: 50,
        forceRefresh: false, // Don't force refresh - use pagination for variety
        excludeSessionItems: false, // Infinite feed - never exclude
      });

      setCards(prev => [...prev, ...recommendations]);
      console.log('[Swipe] Loaded', recommendations.length, 'more cards');
    } catch (error) {
      console.error('[Swipe] Error loading more content:', error);
    }
  };

  const handleButtonPress = (type: 'watchlist' | 'hide' | 'watching' | 'watched') => {
    if (currentIndex >= cards.length) return;

    // Validate user is authenticated for actions that require it
    if (!user?.id && type !== 'hide') {
      Alert.alert('Error', 'Please sign in to save content');
      return;
    }

    const currentCard = cards[currentIndex];

    // For 'watched', show rating modal first
    if (type === 'watched') {
      setPendingWatchedItem(currentCard);
      setSelectedRating(0);
      setShowRatingModal(true);
    } else {
      handleSwipe({ type, item: currentCard });
    }
  };

  const handleRatingSubmit = async () => {
    if (!pendingWatchedItem) return;

    // Close modal
    setShowRatingModal(false);

    // Add to watched with rating
    await handleSwipe({
      type: 'watched',
      item: pendingWatchedItem,
      rating: selectedRating || undefined, // Only include rating if > 0
    });

    // Clear pending item
    setPendingWatchedItem(null);
    setSelectedRating(0);
  };

  const handleSkipRating = async () => {
    if (!pendingWatchedItem) return;

    // Close modal
    setShowRatingModal(false);

    // Add to watched without rating
    await handleSwipe({
      type: 'watched',
      item: pendingWatchedItem,
    });

    // Clear pending item
    setPendingWatchedItem(null);
    setSelectedRating(0);
  };

  // Reset card position (called after successful swipe)
  const resetCardPosition = () => {
    translateX.value = 0;
    translateY.value = 0;
    rotation.value = 0;
  };

  // Programmatic swipe (triggered by buttons)
  const triggerSwipe = (direction: 'left' | 'right' | 'up') => {
    const targets = {
      left: { x: -500, y: 0 },
      right: { x: 500, y: 0 },
      up: { x: 0, y: -800 },
    };

    translateX.value = withSpring(targets[direction].x, { damping: 20 });
    translateY.value = withSpring(targets[direction].y, { damping: 20 });

    // Reset after animation completes
    setTimeout(() => {
      resetCardPosition();
    }, 300);
  };

  // Gesture handler
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotation.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
        Extrapolate.CLAMP
      );
    })
    .onEnd((event) => {
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      // Determine swipe direction
      if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
        if (absX > absY) {
          // Horizontal swipe
          if (event.translationX > SWIPE_THRESHOLD) {
            // Swipe right → Want to Watch
            translateX.value = withSpring(500, { damping: 20 }, () => {
              runOnJS(handleButtonPress)('watchlist');
              runOnJS(resetCardPosition)();
            });
          } else if (event.translationX < -SWIPE_THRESHOLD) {
            // Swipe left → Not Interested
            translateX.value = withSpring(-500, { damping: 20 }, () => {
              runOnJS(handleButtonPress)('hide');
              runOnJS(resetCardPosition)();
            });
          }
        } else {
          // Vertical swipe
          if (event.translationY < -SWIPE_THRESHOLD) {
            // Swipe up → Already Watched
            translateY.value = withSpring(-800, { damping: 20 }, () => {
              runOnJS(handleButtonPress)('watched');
              runOnJS(resetCardPosition)();
            });
          }
        }
      } else {
        // Snap back if not past threshold
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotation.value = withSpring(0);
      }
    });

  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  // Overlay opacity animations
  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  const nopeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP
    ),
  }));

  const watchedOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP
    ),
  }));

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (currentIndex >= cards.length) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            You're all caught up!
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Check back later for more recommendations
          </Text>
          <TouchableOpacity
            style={[styles.reloadButton, { backgroundColor: colors.primary }]}
            onPress={loadContent}
          >
            <Text style={styles.reloadButtonText}>Load More</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentCard = cards[currentIndex];

  // Normalize card data to handle all possible field variations
  const cardAny = currentCard as any;
  const title = currentCard.title || cardAny.name || 'Unknown Title';
  const posterPath = currentCard.posterPath || cardAny.poster_path;
  const rating = currentCard.rating || cardAny.vote_average || 0;
  const year = (currentCard.releaseDate || cardAny.release_date || cardAny.first_air_date || '').substring(0, 4);
  const mediaType = (currentCard.type || cardAny.media_type || 'movie').toLowerCase();
  const overview = currentCard.overview || 'No description available.';

  const posterUrl = posterPath
    ? `https://image.tmdb.org/t/p/w500${posterPath}`
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 44) + 8 },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Discover
          </Text>
          <Text style={[styles.counterText, { color: colors.textSecondary }]}>
            {currentIndex + 1} of {cards.length}
          </Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Quick swipe to build your watchlist
        </Text>
      </View>

      {/* Legend Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.legendBar, { backgroundColor: colors.card }]}
        contentContainerStyle={styles.legendContent}
      >
        <View style={styles.legendItem}>
          <Ionicons name="close" size={14} color="#EF4444" />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Not interested</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="heart" size={14} color="#22C55E" />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Want to watch</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="play" size={14} color={colors.primary} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Watching</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="checkmark-circle" size={14} color="#8B5CF6" />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Watched</Text>
        </View>
      </ScrollView>

      {/* Card Area - Centered */}
      <View style={styles.cardArea}>
        {/* Current Card */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, cardAnimatedStyle]}>
            {/* Swipe Overlays */}
            <Animated.View style={[styles.overlay, styles.likeOverlay, likeOverlayStyle]}>
              <Text style={styles.overlayText}>WANT TO WATCH</Text>
            </Animated.View>

            <Animated.View style={[styles.overlay, styles.nopeOverlay, nopeOverlayStyle]}>
              <Text style={styles.overlayText}>NOT INTERESTED</Text>
            </Animated.View>

            <Animated.View style={[styles.overlay, styles.watchedOverlay, watchedOverlayStyle]}>
              <Text style={styles.overlayText}>ALREADY WATCHED</Text>
            </Animated.View>

            {/* Poster */}
            <View style={styles.posterContainer}>
              {posterUrl ? (
                <Image
                  source={{ uri: posterUrl }}
                  style={styles.poster}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.posterPlaceholder, { backgroundColor: colors.card }]}>
                  <MaterialCommunityIcons name="movie-open" size={60} color={colors.textSecondary} />
                  <Text style={[styles.noImageText, { color: colors.textSecondary }]}>
                    No Image
                  </Text>
                </View>
              )}
            </View>

            {/* Content Info Below Poster */}
            <View style={styles.contentInfo}>
              <Text style={[styles.contentTitle, { color: colors.text }]} numberOfLines={2}>
                {title}
              </Text>

              <View style={styles.metaRow}>
                {rating > 0 && (
                  <>
                    <StarRating rating={rating} size={15} showNumber={false} />
                    <Text style={[styles.ratingText, { color: '#fbbf24' }]}>
                      {rating.toFixed(1)}
                    </Text>
                    <Text style={[styles.metaDivider, { color: '#444' }]}>•</Text>
                  </>
                )}
                {year && (
                  <>
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {year}
                    </Text>
                    <Text style={[styles.metaDivider, { color: '#444' }]}>•</Text>
                  </>
                )}
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {mediaType === 'tv' ? 'TV Show' : 'Movie'}
                </Text>
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Action Buttons - Fixed at Bottom */}
      <View
        style={[
          styles.actionsContainer,
          { paddingBottom: Math.max(insets.bottom, 20) + 16 },
        ]}
      >
        <View style={styles.primaryActions}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => handleButtonPress('hide')}
          >
            <Ionicons name="close" size={32} color="#ef4444" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => handleButtonPress('watchlist')}
          >
            <Ionicons name="heart" size={32} color="#22c55e" />
          </TouchableOpacity>
        </View>

        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.watchingButton]}
            onPress={() => handleButtonPress('watching')}
          >
            <Ionicons name="play" size={18} color="#8b5cf6" />
            <Text style={[styles.secondaryButtonText, { color: '#ffffff' }]}>Watching</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, styles.watchedButton]}
            onPress={() => handleButtonPress('watched')}
          >
            <Ionicons name="checkmark-circle" size={18} color="#8b5cf6" />
            <Text style={[styles.secondaryButtonText, { color: '#ffffff' }]}>Watched</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              How would you rate this?
            </Text>
            {pendingWatchedItem && (
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {pendingWatchedItem.title || (pendingWatchedItem as any).name}
              </Text>
            )}

            {/* Star Rating */}
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setSelectedRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={selectedRating >= star ? 'star' : 'star-outline'}
                    size={48}
                    color={selectedRating >= star ? '#FFD700' : colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.background }]}
                onPress={handleSkipRating}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Skip Rating
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleRatingSubmit}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  {selectedRating > 0 ? 'Save Rating' : 'No Rating'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  counterText: {
    fontSize: 14,
  },
  // Legend Bar
  legendBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  legendContent: {
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 12,
  },
  // Card Area - Centered
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '75%',
    maxWidth: 280,
    alignItems: 'center',
  },
  posterContainer: {
    width: '100%',
    aspectRatio: 0.67,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 12,
    marginTop: 8,
  },
  // Content Info Below Poster
  contentInfo: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  contentTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 14,
  },
  metaDivider: {
    fontSize: 14,
  },
  // Action Buttons - Fixed at Bottom
  actionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  primaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 60,
    marginBottom: 16,
  },
  skipButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  likeButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  watchingButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  watchedButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  reloadButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  reloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Rating Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Swipe Gesture Overlays
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  likeOverlay: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)', // Green
  },
  nopeOverlay: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)', // Red
  },
  watchedOverlay: {
    backgroundColor: 'rgba(139, 92, 246, 0.9)', // Purple
  },
  overlayText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

export default SwipeScreen;
