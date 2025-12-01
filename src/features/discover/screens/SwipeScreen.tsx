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

      if (type === 'watchlist' || type === 'watching' || type === 'watched') {
        // Determine status based on action type
        const status = type === 'watching' ? 'watching' : type === 'watched' ? 'watched' : 'want_to_watch';

        // Determine media type with fallback
        // Cast to any to access properties that might exist at runtime but not in UnifiedContent type
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
            // Extract genre IDs (handle both UnifiedContent objects and raw TMDb data)
            const rawGenres = item.genres || (item as any).genre_ids || [];
            const genreIds = rawGenres.map((g: any) => typeof g === 'number' ? g : g.id);

            if (genreIds.length > 0) {
              // Use resolved mediaType (defaulting to 'movie' if somehow still missing, though check above prevents this)
              const typeForTracking = (mediaType === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv';

              if (rating >= 4) {
                await trackGenreInteraction(user.id, genreIds, typeForTracking, 'RATE_HIGH');
                console.log('[Swipe] Tracked high rating for genres:', genreIds);
              } else if (rating <= 2) {
                await trackGenreInteraction(user.id, genreIds, typeForTracking, 'RATE_LOW');
                console.log('[Swipe] Tracked low rating for genres:', genreIds);
              } else {
                await trackGenreInteraction(user.id, genreIds, typeForTracking, 'RATE_MEDIUM');
                console.log('[Swipe] Tracked medium rating for genres:', genreIds);
              }
            }
          }
        }
      } else if (type === 'hide') {
        console.log(`[Swipe] Hidden "${item.title}"`);
      }

      // Move to next card
      setCurrentIndex(prev => prev + 1);

      // Load more if running low
      if (currentIndex >= cards.length - 3) {
        loadMoreContent();
      }
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
          {
            paddingTop: Math.max(insets.top, 44) + 16,
            paddingBottom: 16,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Discover
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Quick swipe to build your watchlist
        </Text>
        <Text style={[styles.counterText, { color: colors.textSecondary }]}>
          {currentIndex + 1} of {cards.length}
        </Text>
      </View>

      {/* Card Stack */}
      <View style={styles.cardStack}>
        {/* Next Card (Background) */}
        {currentIndex + 1 < cards.length && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                position: 'absolute',
                zIndex: 0,
                transform: [{ scale: 0.95 }, { translateY: 10 }],
                opacity: 0.8,
              }
            ]}
          >
            {/* Poster - Top 55% */}
            {cards[currentIndex + 1].posterPath || (cards[currentIndex + 1] as any).poster_path ? (
              <Image
                source={{ uri: `https://image.tmdb.org/t/p/w500${cards[currentIndex + 1].posterPath || (cards[currentIndex + 1] as any).poster_path}` }}
                style={styles.cardPoster}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.cardPosterPlaceholder, { backgroundColor: colors.background }]}>
                <MaterialCommunityIcons name="movie-open" size={80} color={colors.textSecondary} />
              </View>
            )}

            {/* Content Info - Bottom 45% */}
            <View style={[styles.cardContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {cards[currentIndex + 1].title || (cards[currentIndex + 1] as any).name || 'Unknown Title'}
              </Text>

              <View style={styles.cardMetaRow}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={[styles.ratingText, { color: colors.text }]}>
                    {(cards[currentIndex + 1].rating || (cards[currentIndex + 1] as any).vote_average || 0).toFixed(1)}
                  </Text>
                </View>
                <Text style={[styles.typeText, { color: colors.textSecondary }]}>
                  {(cards[currentIndex + 1].type || (cards[currentIndex + 1] as any).media_type || 'movie') === 'tv' ? '📺 TV Show' : '🎬 Movie'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Current Card (Foreground) */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[styles.card, cardAnimatedStyle, { backgroundColor: colors.card, zIndex: 1 }]}
          >
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

            {/* Poster - Top 55% */}
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                style={styles.cardPoster}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.cardPosterPlaceholder, { backgroundColor: colors.background }]}>
                <MaterialCommunityIcons name="movie-open" size={80} color={colors.textSecondary} />
                <Text style={[styles.noImageText, { color: colors.textSecondary }]}>
                  No Image Available
                </Text>
              </View>
            )}

            {/* Content Info - Bottom 45% */}
            <View style={[styles.cardContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {title}
              </Text>

              <View style={styles.cardMetaRow}>
                {rating > 0 && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={[styles.ratingText, { color: colors.text }]}>
                      {rating.toFixed(1)}
                    </Text>
                  </View>
                )}
                {year && (
                  <Text style={[styles.yearText, { color: colors.textSecondary }]}>
                    {year}
                  </Text>
                )}
                <Text style={[styles.typeText, { color: colors.textSecondary }]}>
                  {mediaType === 'tv' ? '📺 TV Show' : '🎬 Movie'}
                </Text>
              </View>

              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>
                About
              </Text>
              <ScrollView style={styles.overviewScroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.cardOverview, { color: colors.text }]}>
                  {overview}
                </Text>
              </ScrollView>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Action Buttons - 4 buttons in a grid */}
      <View
        style={[
          styles.buttonsContainer,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
      >
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
            onPress={() => handleButtonPress('hide')}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
            onPress={() => handleButtonPress('watchlist')}
          >
            <Ionicons name="heart" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.watchingButton, { backgroundColor: colors.primary }]}
            onPress={() => handleButtonPress('watching')}
          >
            <Ionicons name="play" size={24} color="#FFFFFF" />
            <Text style={styles.watchingButtonText}>Watching</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.watchedButton, { backgroundColor: '#8B5CF6' }]}
            onPress={() => handleButtonPress('watched')}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={styles.watchedButtonText}>Watched</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Instructions */}
      <View style={[styles.instructions, { backgroundColor: colors.card }]}>
        <View style={styles.instructionItem}>
          <Ionicons name="close" size={16} color="#EF4444" />
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            Not interested
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <Ionicons name="heart" size={16} color="#22C55E" />
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            Want to watch
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <Ionicons name="play" size={16} color={colors.primary} />
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            Watching now
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <Ionicons name="checkmark-circle" size={16} color="#8B5CF6" />
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            Already watched
          </Text>
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
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 10,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  counterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 100,
    zIndex: 1,
  },
  card: {
    width: CARD_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardPoster: {
    width: '100%',
    height: '55%', // Poster takes 55% of card height
  },
  cardPosterPlaceholder: {
    width: '100%',
    height: '55%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 14,
    marginTop: 12,
  },
  cardContent: {
    flex: 1, // Takes remaining 45%
    padding: 16,
    paddingBottom: 140, // Heavy padding to ensure text doesn't go behind buttons
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  yearText: {
    fontSize: 14,
  },
  typeText: {
    fontSize: 14,
  },
  aboutLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  overviewScroll: {
    flex: 1,
    maxHeight: 90, // Limit overview height to prevent layout issues
  },
  cardOverview: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    zIndex: 50,
    elevation: 20,
    flexDirection: 'column', // Stack rows vertically
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  watchingButton: {
    minWidth: 120, // Responsive width with minimum
    maxWidth: 160,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  watchingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  instructions: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    opacity: 0.9,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instructionText: {
    fontSize: 12,
  },
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
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    maxWidth: 340, // Prevent buttons from getting too wide on tablets
  },
  watchedButton: {
    minWidth: 120, // Match watchingButton
    maxWidth: 160,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  watchedButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
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
