/**
 * Content Detail Modal
 * Shows movie/TV show details with watch providers and watchlist options
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/features/auth';
import { supabase } from '@/config/supabase';
import { getBackdropUrl, getPosterUrl, getUSWatchProviders } from '@/services/tmdb';
import { trackGenreInteraction } from '@/services/genreAffinity';
import type { UnifiedContent, WatchlistStatus } from '@/types';
import { COLORS } from '@/components';

interface ContentDetailModalProps {
  content: UnifiedContent | null;
  visible: boolean;
  onClose: () => void;
  onAddedToWatchlist?: () => void;
}

interface WatchProvider {
  logo_path: string;
  provider_id: number;
  provider_name: string;
}

export const ContentDetailModal: React.FC<ContentDetailModalProps> = ({
  content,
  visible,
  onClose,
  onAddedToWatchlist,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [selectedStatus, setSelectedStatus] = useState<WatchlistStatus>('want_to_watch');
  const [rating, setRating] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [watchProviders, setWatchProviders] = useState<WatchProvider[]>([]);
  const [existingWatchlistItem, setExistingWatchlistItem] = useState<any>(null);

  // Reset state when content changes
  useEffect(() => {
    if (content && visible) {
      setSelectedStatus('want_to_watch');
      setRating(0);
      setWatchProviders([]);
      fetchWatchProviders();
      checkExistingWatchlistItem();
    }
  }, [content?.id, visible]);

  // Fetch watch providers from TMDB
  const fetchWatchProviders = async () => {
    if (!content) return;

    try {
      setIsLoading(true);
      const providers = await getUSWatchProviders(content.id, content.type);

      if (providers?.flatrate) {
        setWatchProviders(providers.flatrate);
      } else {
        setWatchProviders([]);
      }
    } catch (error) {
      console.error('[ContentDetail] Error fetching watch providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if content is already in user's watchlist
  const checkExistingWatchlistItem = async () => {
    if (!content || !user) return;

    try {
      // First check if content exists in content table
      const { data: contentData } = await supabase
        .from('content')
        .select('id')
        .eq('tmdb_id', content.id)
        .eq('type', content.type)
        .single();

      if (contentData) {
        // Check watchlist
        const { data: watchlistData } = await supabase
          .from('watchlist_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('content_id', contentData.id)
          .single();

        if (watchlistData) {
          setExistingWatchlistItem(watchlistData);
          setSelectedStatus(watchlistData.status);
          setRating(watchlistData.rating || 0);
        }
      }
    } catch (error) {
      // Not in watchlist, which is fine
      console.log('[ContentDetail] Content not in watchlist');
    }
  };

  // Helper to extract genre IDs from content
  const extractGenreIds = (content: UnifiedContent): number[] => {
    if (!content.genres || content.genres.length === 0) return [];

    // Check if genres is an array of objects with id property or just numbers
    const firstGenre = content.genres[0];
    if (typeof firstGenre === 'object' && 'id' in firstGenre) {
      return content.genres.map((g: any) => g.id);
    }

    // Already an array of numbers
    return content.genres as number[];
  };

  // Add or update watchlist item
  const handleAddToWatchlist = async () => {
    if (!content || !user) {
      Alert.alert('Error', 'You must be logged in to add to watchlist');
      return;
    }

    setIsSaving(true);

    try {
      // Step 1: Insert or get content record
      const { data: existingContent } = await supabase
        .from('content')
        .select('id')
        .eq('tmdb_id', content.id)
        .eq('type', content.type)
        .single();

      let contentId: string;

      if (existingContent) {
        contentId = existingContent.id;
      } else {
        // Insert new content
        const { data: newContent, error: contentError } = await supabase
          .from('content')
          .insert({
            tmdb_id: content.id,
            title: content.title,
            type: content.type,
            overview: content.overview || null,
            poster_url: content.posterPath || null,
            backdrop_url: content.backdropPath || null,
            genres: content.genres || [],
            release_date: content.releaseDate || null,
            vote_average: content.rating || null,
          })
          .select('id')
          .single();

        if (contentError) throw contentError;
        contentId = newContent.id;
      }

      // Step 2: Insert or update watchlist item
      const streamingServices = watchProviders.map(p => p.provider_name);
      const previousStatus = existingWatchlistItem?.status;
      const previousRating = existingWatchlistItem?.rating || 0;

      if (existingWatchlistItem) {
        // Update existing
        const { error: updateError } = await supabase
          .from('watchlist_items')
          .update({
            status: selectedStatus,
            rating: selectedStatus === 'watched' ? rating : null,
            streaming_services: streamingServices,
          })
          .eq('id', existingWatchlistItem.id);

        if (updateError) throw updateError;

        // Track genre affinity for status changes
        const genreIds = extractGenreIds(content);
        if (genreIds.length > 0) {
          // Track status change
          if (previousStatus !== selectedStatus) {
            if (selectedStatus === 'watching') {
              await trackGenreInteraction(user.id, genreIds, content.type, 'START_WATCHING');
            } else if (selectedStatus === 'watched') {
              await trackGenreInteraction(user.id, genreIds, content.type, 'COMPLETE_WATCHING');
            }
          }

          // Track rating change for watched content
          if (selectedStatus === 'watched' && rating !== previousRating) {
            if (rating >= 4) {
              await trackGenreInteraction(user.id, genreIds, content.type, 'RATE_HIGH');
            } else if (rating >= 1 && rating <= 2) {
              await trackGenreInteraction(user.id, genreIds, content.type, 'RATE_LOW');
            }
          }
        }

        Alert.alert('Success', 'Watchlist updated!');
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('watchlist_items')
          .insert({
            user_id: user.id,
            content_id: contentId,
            status: selectedStatus,
            rating: selectedStatus === 'watched' ? rating : null,
            streaming_services: streamingServices,
            priority: 'medium',
          });

        if (insertError) throw insertError;

        // Track genre affinity for new watchlist item
        const genreIds = extractGenreIds(content);
        if (genreIds.length > 0) {
          // Track based on initial status
          if (selectedStatus === 'want_to_watch') {
            await trackGenreInteraction(user.id, genreIds, content.type, 'ADD_TO_WATCHLIST');
          } else if (selectedStatus === 'watching') {
            await trackGenreInteraction(user.id, genreIds, content.type, 'ADD_TO_WATCHLIST');
            await trackGenreInteraction(user.id, genreIds, content.type, 'START_WATCHING');
          } else if (selectedStatus === 'watched') {
            await trackGenreInteraction(user.id, genreIds, content.type, 'ADD_TO_WATCHLIST');
            await trackGenreInteraction(user.id, genreIds, content.type, 'COMPLETE_WATCHING');

            // Track rating if provided
            if (rating >= 4) {
              await trackGenreInteraction(user.id, genreIds, content.type, 'RATE_HIGH');
            } else if (rating >= 1 && rating <= 2) {
              await trackGenreInteraction(user.id, genreIds, content.type, 'RATE_LOW');
            }
          }
        }

        Alert.alert('Success', 'Added to watchlist!');
      }

      onAddedToWatchlist?.();
      onClose();
    } catch (error) {
      console.error('[ContentDetail] Error saving to watchlist:', error);
      Alert.alert('Error', 'Failed to save to watchlist. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!content) return null;

  const backdropUrl = getBackdropUrl(content.backdropPath, 'large');
  const posterUrl = getPosterUrl(content.posterPath, 'large');
  const year = content.releaseDate?.split('-')[0] || 'Unknown';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Close Button */}
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.card }]}
          onPress={onClose}
        >
          <MaterialCommunityIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Backdrop/Poster */}
          {backdropUrl || posterUrl ? (
            <Image
              source={{ uri: backdropUrl || posterUrl }}
              style={styles.backdrop}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.backdrop, styles.backdropPlaceholder, { backgroundColor: colors.border }]}>
              <MaterialCommunityIcons name="image-off" size={64} color={colors.textSecondary} />
            </View>
          )}

          <View style={styles.content}>
            {/* Title & Meta */}
            <Text style={[styles.title, { color: colors.text }]}>{content.title}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.year, { color: colors.textSecondary }]}>{year}</Text>
              <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.typeBadgeText}>
                  {content.type === 'movie' ? 'Movie' : 'TV Show'}
                </Text>
              </View>
              {content.rating > 0 && (
                <View style={styles.ratingContainer}>
                  <MaterialCommunityIcons name="star" size={16} color={COLORS.warning} />
                  <Text style={[styles.voteAverage, { color: colors.textSecondary }]}>
                    {content.rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>

            {/* Overview */}
            {content.overview && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
                <Text style={[styles.overview, { color: colors.textSecondary }]}>
                  {content.overview}
                </Text>
              </View>
            )}

            {/* Where to Watch */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Where to Watch</Text>
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : watchProviders.length > 0 ? (
                <View style={styles.providersContainer}>
                  {watchProviders.map((provider) => (
                    <View key={provider.provider_id} style={styles.providerBadge}>
                      <Text style={[styles.providerName, { color: colors.text }]}>
                        {provider.provider_name}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Not currently streaming
                </Text>
              )}
            </View>

            {/* Status Picker */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Status</Text>
              <View style={styles.statusButtons}>
                {[
                  { value: 'want_to_watch', label: 'Want to Watch', icon: 'bookmark-outline' },
                  { value: 'watching', label: 'Watching', icon: 'play-circle-outline' },
                  { value: 'watched', label: 'Watched', icon: 'check-circle-outline' },
                ].map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.statusButton,
                      {
                        backgroundColor: selectedStatus === status.value ? colors.primary : colors.card,
                        borderColor: selectedStatus === status.value ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedStatus(status.value as WatchlistStatus)}
                  >
                    <MaterialCommunityIcons
                      name={status.icon as any}
                      size={20}
                      color={selectedStatus === status.value ? COLORS.white : colors.text}
                    />
                    <Text
                      style={[
                        styles.statusButtonText,
                        { color: selectedStatus === status.value ? COLORS.white : colors.text },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Rating (only if watched) */}
            {selectedStatus === 'watched' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Rating</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                      style={styles.starButton}
                    >
                      <MaterialCommunityIcons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={40}
                        color={star <= rating ? COLORS.warning : colors.border}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                  {rating > 0 ? `${rating}/5` : 'Tap to rate'}
                </Text>
              </View>
            )}

            {/* Add to Watchlist Button */}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAddToWatchlist}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <MaterialCommunityIcons name="bookmark-plus" size={20} color={COLORS.white} />
                  <Text style={styles.addButtonText}>
                    {existingWatchlistItem ? 'Update Watchlist' : 'Add to Watchlist'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  backdrop: {
    width: '100%',
    height: 300,
  },
  backdropPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  year: {
    fontSize: 16,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteAverage: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  overview: {
    fontSize: 15,
    lineHeight: 22,
  },
  providersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '20',
  },
  providerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 15,
    fontStyle: 'italic',
  },
  statusButtons: {
    gap: 12,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    gap: 10,
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
});
