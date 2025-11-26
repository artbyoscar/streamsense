/**
 * Content Search Screen
 * Search and browse movies and TV shows with TMDb integration
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';
import { Text, TextInput as PaperInput, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useSearchContent,
  useSearchMovies,
  useSearchTVShows,
  useTrending,
  useContentDetails,
  getPosterUrl,
  getBackdropUrl,
} from '@/hooks/useTMDb';
import { COLORS, Card, Button } from '@/components';
import type { TMDbMultiSearchResult } from '@/types';

const { width } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_ITEM_WIDTH = (width - 60) / GRID_COLUMNS; // Account for padding

// ============================================================================
// TYPES
// ============================================================================

type FilterTab = 'all' | 'movies' | 'tv';

interface ContentDetailModalProps {
  visible: boolean;
  contentId: number | null;
  contentType: 'movie' | 'tv' | null;
  onClose: () => void;
  onAddToWatchlist: (id: number, type: 'movie' | 'tv') => void;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

const LoadingSkeleton: React.FC = () => {
  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: 12 }).map((_, index) => (
        <View key={index} style={styles.gridItem}>
          <View style={[styles.poster, styles.skeletonPoster]} />
          <View style={[styles.skeletonText, { width: '80%', marginTop: 8 }]} />
          <View style={[styles.skeletonText, { width: '50%', marginTop: 4 }]} />
        </View>
      ))}
    </View>
  );
};

// ============================================================================
// CONTENT DETAIL MODAL
// ============================================================================

const ContentDetailModal: React.FC<ContentDetailModalProps> = ({
  visible,
  contentId,
  contentType,
  onClose,
  onAddToWatchlist,
}) => {
  const { data: content, isLoading } = useContentDetails(
    contentId || 0,
    contentType || 'movie',
    { enabled: visible && !!contentId && !!contentType }
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={COLORS.darkGray} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.modalLoading}>
                <Text>Loading...</Text>
              </View>
            ) : content ? (
              <>
                {/* Backdrop */}
                {content.backdropPath && (
                  <Image
                    source={{ uri: getBackdropUrl(content.backdropPath, 'large')! }}
                    style={styles.modalBackdrop}
                  />
                )}

                {/* Content Info */}
                <View style={styles.modalBody}>
                  <View style={styles.modalHeader}>
                    {content.posterPath && (
                      <Image
                        source={{ uri: getPosterUrl(content.posterPath, 'medium')! }}
                        style={styles.modalPoster}
                      />
                    )}

                    <View style={styles.modalHeaderInfo}>
                      <Text style={styles.modalTitle}>{content.title}</Text>

                      <View style={styles.modalMetaRow}>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>
                            {content.type.toUpperCase()}
                          </Text>
                        </View>

                        {content.releaseDate && (
                          <Text style={styles.modalYear}>
                            {new Date(content.releaseDate).getFullYear()}
                          </Text>
                        )}
                      </View>

                      {/* Rating */}
                      <View style={styles.ratingRow}>
                        <MaterialCommunityIcons
                          name="star"
                          size={20}
                          color={COLORS.warning}
                        />
                        <Text style={styles.ratingText}>
                          {content.rating.toFixed(1)}
                        </Text>
                        <Text style={styles.ratingCount}>
                          ({content.voteCount.toLocaleString()} votes)
                        </Text>
                      </View>

                      {/* Additional Info */}
                      {content.type === 'tv' && content.numberOfSeasons && (
                        <Text style={styles.additionalInfo}>
                          {content.numberOfSeasons} Season
                          {content.numberOfSeasons > 1 ? 's' : ''} • {content.numberOfEpisodes}{' '}
                          Episodes
                        </Text>
                      )}

                      {content.type === 'movie' && content.runtime && (
                        <Text style={styles.additionalInfo}>
                          {Math.floor(content.runtime / 60)}h {content.runtime % 60}m
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Genres */}
                  {content.genres.length > 0 && (
                    <View style={styles.genresContainer}>
                      {content.genres.map((genre) => (
                        <View key={genre.id} style={styles.genreChip}>
                          <Text style={styles.genreText}>{genre.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Overview */}
                  <View style={styles.overviewSection}>
                    <Text style={styles.sectionTitle}>Overview</Text>
                    <Text style={styles.overviewText}>{content.overview}</Text>
                  </View>

                  {/* Add to Watchlist Button */}
                  <Button
                    variant="primary"
                    onPress={() => {
                      if (contentId && contentType) {
                        onAddToWatchlist(contentId, contentType);
                        onClose();
                      }
                    }}
                    style={styles.addButton}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={COLORS.white} />
                    <Text style={styles.addButtonText}>Add to Watchlist</Text>
                  </Button>
                </View>
              </>
            ) : (
              <View style={styles.modalError}>
                <MaterialCommunityIcons name="alert-circle" size={48} color={COLORS.error} />
                <Text style={styles.modalErrorText}>Failed to load content</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ContentSearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedContent, setSelectedContent] = useState<{
    id: number;
    type: 'movie' | 'tv';
  } | null>(null);

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Search queries based on filter
  const allResults = useSearchContent(debouncedSearch, 1, {
    enabled: activeFilter === 'all' && debouncedSearch.trim().length > 0,
  });

  const movieResults = useSearchMovies(debouncedSearch, 1, {
    enabled: activeFilter === 'movies' && debouncedSearch.trim().length > 0,
  });

  const tvResults = useSearchTVShows(debouncedSearch, 1, {
    enabled: activeFilter === 'tv' && debouncedSearch.trim().length > 0,
  });

  // Trending content for empty state
  const trendingContent = useTrending('week', 1, {
    enabled: debouncedSearch.trim().length === 0,
  });

  // Get active results based on filter
  const getActiveResults = () => {
    if (debouncedSearch.trim().length === 0) {
      return trendingContent.data?.results || [];
    }

    if (activeFilter === 'all') {
      return allResults.data?.results || [];
    } else if (activeFilter === 'movies') {
      // Convert movie results to multi-search format
      return (
        movieResults.data?.results.map((movie) => ({
          ...movie,
          media_type: 'movie' as const,
        })) || []
      );
    } else {
      // Convert TV results to multi-search format
      return (
        tvResults.data?.results.map((tv) => ({
          ...tv,
          media_type: 'tv' as const,
        })) || []
      );
    }
  };

  const isLoading =
    activeFilter === 'all'
      ? allResults.isLoading
      : activeFilter === 'movies'
      ? movieResults.isLoading
      : tvResults.isLoading;

  const results = getActiveResults();

  // Handlers
  const handleContentPress = (item: TMDbMultiSearchResult) => {
    if (item.media_type === 'movie' || item.media_type === 'tv') {
      setSelectedContent({
        id: item.id,
        type: item.media_type,
      });
    }
  };

  const handleAddToWatchlist = (id: number, type: 'movie' | 'tv') => {
    // TODO: Implement add to watchlist
    console.log('Add to watchlist:', id, type);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Render item
  const renderItem = ({ item }: { item: TMDbMultiSearchResult }) => {
    // Skip non-movie/tv items (like people)
    if (item.media_type !== 'movie' && item.media_type !== 'tv') {
      return null;
    }

    const title = item.media_type === 'movie' ? item.title : item.name;
    const releaseDate =
      item.media_type === 'movie' ? item.release_date : item.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : '';

    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => handleContentPress(item)}
        activeOpacity={0.7}
      >
        {item.poster_path ? (
          <Image
            source={{ uri: getPosterUrl(item.poster_path, 'small')! }}
            style={styles.poster}
          />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <MaterialCommunityIcons name="image-off" size={32} color={COLORS.gray} />
          </View>
        )}

        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {title}
          </Text>

          <View style={styles.itemMeta}>
            {year && <Text style={styles.itemYear}>{year}</Text>}
            <View style={[styles.typeBadgeSmall, styles[`typeBadge${item.media_type}`]]}>
              <Text style={styles.typeBadgeSmallText}>
                {item.media_type === 'movie' ? 'MOVIE' : 'TV'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <PaperInput
          mode="outlined"
          placeholder="Search movies and TV shows..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          left={<PaperInput.Icon icon="magnify" />}
          right={
            searchQuery.length > 0 ? (
              <PaperInput.Icon icon="close" onPress={handleClearSearch} />
            ) : undefined
          }
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              activeFilter === 'all' && styles.filterTabTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'movies' && styles.filterTabActive]}
          onPress={() => setActiveFilter('movies')}
        >
          <Text
            style={[
              styles.filterTabText,
              activeFilter === 'movies' && styles.filterTabTextActive,
            ]}
          >
            Movies
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'tv' && styles.filterTabActive]}
          onPress={() => setActiveFilter('tv')}
        >
          <Text
            style={[
              styles.filterTabText,
              activeFilter === 'tv' && styles.filterTabTextActive,
            ]}
          >
            TV Shows
          </Text>
        </TouchableOpacity>
      </View>

      <Divider />

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsHeaderText}>
          {debouncedSearch.trim().length === 0
            ? '🔥 Trending This Week'
            : `Search Results for "${debouncedSearch}"`}
        </Text>
        {results.length > 0 && (
          <Text style={styles.resultsCount}>{results.length} results</Text>
        )}
      </View>

      {/* Results Grid */}
      {isLoading ? (
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <LoadingSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.media_type}-${item.id}`}
          numColumns={GRID_COLUMNS}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="magnify"
                size={64}
                color={COLORS.lightGray}
              />
              <Text style={styles.emptyStateText}>No results found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try searching for a different title
              </Text>
            </View>
          }
        />
      )}

      {/* Content Detail Modal */}
      <ContentDetailModal
        visible={!!selectedContent}
        contentId={selectedContent?.id || null}
        contentType={selectedContent?.type || null}
        onClose={() => setSelectedContent(null)}
        onAddToWatchlist={handleAddToWatchlist}
      />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: COLORS.white,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkGray,
    flex: 1,
  },
  resultsCount: {
    fontSize: 14,
    color: COLORS.gray,
  },
  contentContainer: {
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    marginHorizontal: 6,
    marginBottom: 20,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    marginTop: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkGray,
    lineHeight: 18,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  itemYear: {
    fontSize: 11,
    color: COLORS.gray,
  },
  typeBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgemovie: {
    backgroundColor: COLORS.primary + '20',
  },
  typeBadgetv: {
    backgroundColor: COLORS.success + '20',
  },
  typeBadgeSmallText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.darkGray,
  },
  skeletonPoster: {
    backgroundColor: COLORS.lightGray,
  },
  skeletonText: {
    height: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white + 'DD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.lightGray,
  },
  modalBody: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    marginTop: -80,
  },
  modalPoster: {
    width: 120,
    aspectRatio: 2 / 3,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  modalHeaderInfo: {
    flex: 1,
    marginLeft: 16,
    marginTop: 60,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.primary + '20',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalYear: {
    fontSize: 14,
    color: COLORS.gray,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginLeft: 6,
  },
  ratingCount: {
    fontSize: 13,
    color: COLORS.gray,
    marginLeft: 4,
  },
  additionalInfo: {
    fontSize: 13,
    color: COLORS.gray,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.darkGray,
  },
  overviewSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  overviewText: {
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 22,
  },
  addButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 8,
  },
  modalLoading: {
    padding: 60,
    alignItems: 'center',
  },
  modalError: {
    padding: 60,
    alignItems: 'center',
  },
  modalErrorText: {
    fontSize: 16,
    color: COLORS.error,
    marginTop: 16,
  },
});
