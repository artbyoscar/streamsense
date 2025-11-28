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
import { useSearchContent } from '@/hooks/useTMDb';
import { getPosterUrl } from '@/services/tmdb';
import { BROWSE_CATEGORIES, fetchMultipleCategories } from '@/services/contentBrowse';
import type { TMDbMultiSearchResult, UnifiedContent } from '@/types/tmdb';
import { COLORS } from '@/components';

interface ContentSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectContent: (content: UnifiedContent) => void;
}

export const ContentSearchModal: React.FC<ContentSearchModalProps> = ({
  visible,
  onClose,
  onSelectContent,
}) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [browseContent, setBrowseContent] = useState<Map<string, UnifiedContent[]>>(new Map());
  const [loadingBrowse, setLoadingBrowse] = useState(true);

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
      const content = await fetchMultipleCategories([
        'trending',
        'popular-movies',
        'popular-tv',
        'upcoming'
      ]);
      setBrowseContent(content);
    } catch (error) {
      console.error('Error loading browse content:', error);
    } finally {
      setLoadingBrowse(false);
    }
  };

  // Search using TMDB
  const { data, isLoading } = useSearchContent(debouncedQuery);

  const handleSelectContent = (result: TMDbMultiSearchResult | UnifiedContent) => {
    // Check if already in UnifiedContent format
    if ('type' in result && ('posterPath' in result || 'backdropPath' in result)) {
      onSelectContent(result as UnifiedContent);
      return;
    }

    // Convert from TMDbMultiSearchResult to UnifiedContent format
    const searchResult = result as TMDbMultiSearchResult;
    const content: UnifiedContent = {
      id: searchResult.id,
      title: searchResult.media_type === 'movie' ? searchResult.title! : searchResult.name!,
      originalTitle: searchResult.media_type === 'movie' ? searchResult.original_title! : searchResult.original_name!,
      type: searchResult.media_type as 'movie' | 'tv',
      overview: searchResult.overview || '',
      posterPath: searchResult.poster_path ?? null,
      backdropPath: searchResult.backdrop_path ?? null,
      releaseDate:
        searchResult.media_type === 'movie'
          ? (searchResult.release_date ?? null)
          : (searchResult.first_air_date ?? null),
      genres: [], // Will be filled in detail modal
      rating: searchResult.vote_average || 0,
      voteCount: searchResult.vote_count || 0,
      popularity: searchResult.popularity || 0,
      language: searchResult.original_language || '',
    };
    onSelectContent(content);
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
              {BROWSE_CATEGORIES
                .filter(cat => ['trending', 'popular-movies', 'popular-tv', 'upcoming'].includes(cat.id))
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
  },
  browseCard: {
    marginRight: 12,
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
});
