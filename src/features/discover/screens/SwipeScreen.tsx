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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/config/supabase';
import { getSmartRecommendations } from '@/services/smartRecommendations';
import type { UnifiedContent } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;

interface SwipeAction {
  type: 'watchlist' | 'hide' | 'watching';
  item: UnifiedContent;
}

export const SwipeScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [cards, setCards] = useState<UnifiedContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

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
    } catch (error) {
      console.error('[Swipe] Error loading content:', error);
      Alert.alert('Error', 'Failed to load content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (action: SwipeAction) => {
    try {
      const { type, item } = action;

      if (type === 'watchlist' || type === 'watching') {
        // Add to watchlist using the content table
        const { error } = await supabase
          .from('watchlist_items')
          .insert({
            user_id: user.id,
            content_id: `${item.type}-${item.id}`,
            status: type === 'watching' ? 'watching' : 'want_to_watch',
            priority: 'medium',
          });

        if (error) {
          console.error('[Swipe] Error adding to watchlist:', error);
        } else {
          console.log(`[Swipe] Added "${item.title}" to ${type === 'watching' ? 'watching now' : 'watchlist'}`);
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

  const handleButtonPress = (type: 'watchlist' | 'hide' | 'watching') => {
    if (currentIndex >= cards.length) return;

    const currentCard = cards[currentIndex];
    handleSwipe({ type, item: currentCard });
  };

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
  const title = currentCard.title || currentCard.name || 'Unknown Title';
  const posterPath = currentCard.poster_path || currentCard.posterPath;
  const rating = currentCard.vote_average || currentCard.rating || 0;
  const year = (currentCard.release_date || currentCard.first_air_date || currentCard.releaseDate || '').substring(0, 4);
  const mediaType = (currentCard.media_type || currentCard.type || 'movie').toLowerCase();
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
        <View
          style={[styles.card, { backgroundColor: colors.card }]}
        >
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
        </View>
      </View>

      {/* Action Buttons */}
      <View
        style={[
          styles.buttonsContainer,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
      >
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
          onPress={() => handleButtonPress('hide')}
        >
          <Ionicons name="close" size={32} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.watchingButton, { backgroundColor: colors.primary }]}
          onPress={() => handleButtonPress('watching')}
        >
          <Ionicons name="play" size={28} color="#FFFFFF" />
          <Text style={styles.watchingButtonText}>Watch Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
          onPress={() => handleButtonPress('watchlist')}
        >
          <Ionicons name="heart" size={32} color="#FFFFFF" />
        </TouchableOpacity>
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
          <Ionicons name="play" size={16} color={colors.primary} />
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            Watch now
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <Ionicons name="heart" size={16} color="#22C55E" />
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            Add to list
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
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
    paddingBottom: 12,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
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
    width: 140,
    flexDirection: 'row',
    gap: 8,
  },
  watchingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
});

export default SwipeScreen;
