/**
 * Content Search Modal
 * Search for movies and TV shows using TMDB API
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  SafeAreaView,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/features/auth';
import { useSearchContent } from '@/hooks/useTMDb';
import { tmdbApi, getPosterUrl } from '@/services/tmdb';
import {
  fetchMultipleCategories,
  getPersonalizedCategories,
  getDefaultCategories,
  type ContentCategory,
} from '@/services/contentBrowse';
import { ContentDetailModal } from './ContentDetailModal';
import type { TMDbMultiSearchResult, UnifiedContent } from '@/types/tmdb';
import { COLORS } from '@/components';

interface ContentSearchModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ContentSearchModal: React.FC<ContentSearchModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [browseContent, setBrowseContent] = useState<Map<string, UnifiedContent[]>>(new Map());
  const [loadingBrowse, setLoadingBrowse] = useState(true);
  const [categories, setCategories] = useState<ContentCategory[]>(getDefaultCategories());

  // New state for nested modal
  const [selectedContent, setSelectedContent] = useState<UnifiedContent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingMore, setLoadingMore] = useState<string | null>(null);

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load browse categories when modal opens
  useEffect(() => {
    if (visible && !searchQuery) {
      loadBrowseCategories();
    }
  }, [visible]);

  const loadBrowseCategories = async () => {
    setLoadingBrowse(true);
    try {
      // Get personalized categories if user is logged in
      const personalizedCats = user?.id
        ? await getPersonalizedCategories(user.id)
        : getDefaultCategories();

      setCategories(personalizedCats);
      console.log('[SearchContent] Loaded', personalizedCats.length, 'categories');

      // Fetch content for ALL categories
      const categoryIds = personalizedCats.map(c => c.id);
      const content = await fetchMultipleCategories(categoryIds);
      setBrowseContent(content);
      console.log('[SearchContent] Fetched content for', content.size, 'categories');
    } catch (error) {
      console.error('[SearchContent] Error loading browse content:', error);
      setCategories(getDefaultCategories());
    } finally {
      setLoadingBrowse(false);
    }
  };

  // Search using TMDB
  const { data, isLoading } = useSearchContent(debouncedQuery);

  const handleSelectContent = (item: UnifiedContent | TMDbMultiSearchResult) => {
    // Convert to UnifiedContent if needed
    let content: UnifiedContent;

    if ('media_type' in item) {
      // TMDb search result
      const searchResult = item as TMDbMultiSearchResult;
      content = {
        id: searchResult.id,
        title: searchResult.media_type === 'movie' ? searchResult.title! : searchResult.name!,
        originalTitle: searchResult.media_type === 'movie' ? searchResult.original_title! : searchResult.original_name!,
        type: searchResult.media_type as 'movie' | 'tv',
        overview: searchResult.overview || '',
        posterPath: searchResult.poster_path ?? null,
        backdropPath: searchResult.backdrop_path ?? null,
        releaseDate: searchResult.media_type === 'movie'
          ? (searchResult.release_date ?? null)
          : (searchResult.first_air_date ?? null),
        genres: [],
        rating: searchResult.vote_average || 0,
        voteCount: searchResult.vote_count || 0,
        popularity: searchResult.popularity || 0,
        language: searchResult.original_language || '',
      };
    } else {
      content = item as UnifiedContent;
    }

    setSelectedContent(content);
    setShowDetailModal(true);
  };

  // Load more content for a specific category
  const loadMoreForCategory = async (categoryId: string) => {
    setLoadingMore(categoryId);
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
      setLoadingMore(null);
      return;
    }

    try {
      const currentItems = browseContent.get(categoryId) || [];
      const currentPage = Math.ceil(currentItems.length / 20) + 1;

      const response = await tmdbApi.get(category.endpoint, {
        params: { page: currentPage }
      });

      const newItems: UnifiedContent[] = response.data.results.map((item: any) => ({
        id: item.id,
        title: item.title || item.name,
        originalTitle: item.original_title || item.original_name || item.title || item.name,
        type: (category.mediaType === 'all' ? (item.media_type || 'movie') : category.mediaType) as 'movie' | 'tv',
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
        overview: item.overview || '',
        releaseDate: item.release_date || item.first_air_date || null,
        rating: item.vote_average || 0,
        voteCount: item.vote_count || 0,
        popularity: item.popularity || 0,
        language: item.original_language || '',
        genres: item.genre_ids || [],
      }));

      setBrowseContent(prev => {
        const updated = new Map(prev);
        const existing = updated.get(categoryId) || [];
        // Filter duplicates
        const existingIds = new Set(existing.map(i => i.id));
        const uniqueNew = newItems.filter(i => !existingIds.has(i.id));
        updated.set(categoryId, [...existing, ...uniqueNew]);
        return updated;
      });
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoadingMore(null);
    }
  };

  const renderSearchResult = ({ item }: { item: TMDbMultiSearchResult }) => {
    if (item.media_type !== 'movie' && item.media_type !== 'tv') {
      return null; // Skip person results
    }

    const title = item.media_type === 'movie' ? item.title : item.name;
    const year = item.media_type === 'movie'
      ? item.release_date?.split('-')[0]
      : item.first_air_date?.split('-')[0];
    const posterUrl = getPosterUrl(item.poster_path ?? null, 'small');

    return (
      <TouchableOpacity
        style={[styles.resultItem, { borderBottomColor: colors.border }]}
        onPress={() => handleSelectContent(item)}
      >
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder, { backgroundColor: colors.border }]}>
            <MaterialCommunityIcons name="image-off" size={24} color={colors.textSecondary} />
          </View>
        )}

        <View style={styles.resultInfo}>
          <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.resultMeta}>
            <Text style={[styles.resultYear, { color: colors.textSecondary }]}>
              {year || 'Unknown'}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.typeBadgeText}>
                {item.media_type === 'movie' ? 'Movie' : 'TV'}
              </Text>
            </View>
          </View>
          {(item.vote_average ?? 0) > 0 && (
            <View style={styles.ratingContainer}>
              <MaterialCommunityIcons name="star" size={14} color={COLORS.warning} />
              <Text style={[styles.rating, { color: colors.textSecondary }]}>
                {(item.vote_average ?? 0).toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Search Content</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search movies and TV shows..."
            placeholderTextColor={colors.textSecondary}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        {debouncedQuery.length === 0 ? (
          // Browse Mode - Show categories when not searching
          loadingBrowse ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 16 }]}>
                Loading content...
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.browseContainer}>
              {categories
                .filter(cat => browseContent.has(cat.id))
                .map(category => (
                  <View key={category.id} style={styles.categorySection}>
                    <Text style={[styles.categoryTitle, { color: colors.text }]}>
                      {category.title}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryScroll}
                    >
                      {browseContent.get(category.id)?.map(item => (
                        <TouchableOpacity
                          key={`${category.id}-${item.id}`}
                          onPress={() => handleSelectContent(item)}
                          style={styles.browseCard}
                        >
                          <Image
                            source={{
                              uri: item.posterPath
                                ? (getPosterUrl(item.posterPath, 'small') ?? 'https://via.placeholder.com/120x180?text=No+Image')
                                : 'https://via.placeholder.com/120x180?text=No+Image'
                            }}
                            style={[styles.browsePoster, { backgroundColor: colors.card }]}
                          />
                          <Text
                            numberOfLines={2}
                            style={[styles.browseTitle, { color: colors.text }]}
                          >
                            {item.title}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      {/* Load More Button */}
                      <TouchableOpacity
                        style={[styles.loadMoreButton, { borderColor: colors.border }]}
                        onPress={() => loadMoreForCategory(category.id)}
                        disabled={loadingMore === category.id}
                      >
                        {loadingMore === category.id ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="plus-circle-outline" size={36} color={colors.primary} />
                            <Text style={[styles.loadMoreText, { color: colors.primary }]}>More</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                ))}
            </ScrollView>
          )
        ) : isLoading ? (
          // Loading search results
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : data && data.results.length > 0 ? (
          // Search Results
          <FlatList
            data={data.results}
            renderItem={renderSearchResult}
            keyExtractor={(item) => `${item.media_type}-${item.id}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          // No Results
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons name="magnify-close" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No results found for "{debouncedQuery}"
            </Text>
          </View>
        )}

        {/* Content Detail Modal */}
        <ContentDetailModal
          content={selectedContent}
          visible={showDetailModal}
          onClose={() => {
            // User closed detail modal, return to browse
            setShowDetailModal(false);
            setSelectedContent(null);
            // Stay in search modal - do NOT call onClose()
          }}
          onAddedToWatchlist={() => {
            // Content was added, stay in search modal
            setShowDetailModal(false);
            setSelectedContent(null);
            // User can continue browsing
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 8,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultYear: {
    fontSize: 14,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  // Browse mode styles
  browseContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  categoryScroll: {
    paddingRight: 16,
    gap: 12,
  },
  browseCard: {
    width: 120,
  },
  browsePoster: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
  browseTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 16,
  },
  loadMoreButton: {
    width: 80,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
});
