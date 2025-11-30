/**
 * Watchlist Screen
 * User's watchlist grouped by status with content search integration
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { useCustomNavigation } from '@/navigation/NavigationContext';
import { supabase } from '@/config/supabase';
import { useTrending, getPosterUrl } from '@/hooks/useTMDb';
import { useTheme } from '@/providers/ThemeProvider';
import { getMixedRecommendations } from '@/services/personalizedRecommendations';
import { getUserTopGenres } from '@/services/genreAffinity';
import { COLORS, EmptyState } from '@/components';
import type { UnifiedContent, WatchlistStatus } from '@/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const GENRE_ID_MAP: Record<string, number[]> = {
  'Drama': [18],
  'Adventure': [12],
  'Action': [28],
  'Science Fiction': [878, 10765], // Movie + TV sci-fi
  'Animation': [16],
  'Comedy': [35],
  'Thriller': [53],
  'Horror': [27],
  'Romance': [10749],
  'Documentary': [99],
  'Crime': [80],
  'Mystery': [9648],
  'Fantasy': [14, 10765],
  'Family': [10751],
  'War': [10752, 10768],
  'History': [36],
  'Music': [10402],
  'Western': [37],
  'Sci-Fi & Fantasy': [10765],
  'Action & Adventure': [10759],
};

// ============================================================================
// TYPES
// ============================================================================

interface WatchlistItemWithContent {
  id: string;
  user_id: string;
  content_id: string;
  status: WatchlistStatus;
  priority: string;
  rating: number | null;
  streaming_services: any;
  added_at: string;
  content: {
    id: string;
    tmdb_id: number;
    title: string;
    type: 'movie' | 'tv';
    poster_url: string | null;
    overview: string | null;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const WatchlistScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    setShowContentSearch,
    setShowContentDetail,
    setSelectedContent,
  } = useCustomNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [watching, setWatching] = useState<WatchlistItemWithContent[]>([]);
  const [wantToWatch, setWantToWatch] = useState<WatchlistItemWithContent[]>([]);
  const [watched, setWatched] = useState<WatchlistItemWithContent[]>([]);
  const [allRecommendations, setAllRecommendations] = useState<UnifiedContent[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<UnifiedContent[]>([]);
  const [userTopGenres, setUserTopGenres] = useState<{ id: number; name: string }[]>([]);
  const [activeGenreFilter, setActiveGenreFilter] = useState<string>('All');
  const [loadingForYou, setLoadingForYou] = useState(false);

  // Fetch trending for suggestions
  const { data: trending } = useTrending('week', 1);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  // Get available genre filters
  const getGenreFilters = (): string[] => {
    const baseFilters = ['All'];
    const topGenres = ['Drama', 'Adventure', 'Action', 'Science Fiction', 'Animation', 'Comedy'];
    const extraGenres = ['Thriller', 'Horror', 'Romance', 'Documentary', 'Crime', 'Mystery', 'Fantasy', 'Family'];
    return [...baseFilters, ...topGenres, ...extraGenres];
  };

  // Filter recommendations by genre
  const filterRecommendationsByGenre = (items: UnifiedContent[], genreName: string): UnifiedContent[] => {
    if (genreName === 'All') {
      return items;
    }

    let targetGenreIds = GENRE_ID_MAP[genreName] || [];

    if (targetGenreIds.length === 0) {
      // Try to find by partial match
      const matchKey = Object.keys(GENRE_ID_MAP).find(
        key => key.toLowerCase().includes(genreName.toLowerCase()) ||
               genreName.toLowerCase().includes(key.toLowerCase())
      );
      if (matchKey) {
        targetGenreIds = GENRE_ID_MAP[matchKey];
      }
    }

    console.log(`[Watchlist] Filtering for genre: ${genreName}, IDs: ${targetGenreIds}`);

    const filtered = items.filter(item => {
      // Handle different genre formats in the genres property
      if (!item.genres || !Array.isArray(item.genres)) {
        return false;
      }

      const itemGenreIds = item.genres.map((g: any) => typeof g === 'number' ? g : g.id);
      const hasMatch = itemGenreIds.some((id: number) => targetGenreIds.includes(id));
      return hasMatch;
    });

    console.log(`[Watchlist] Filtered to ${filtered.length} items for genre: ${genreName}`);
    return filtered;
  };

  // Fetch watchlist from Supabase
  const fetchWatchlist = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('watchlist_items')
        .select(`
          id,
          user_id,
          content_id,
          status,
          priority,
          rating,
          streaming_services,
          added_at,
          content!inner (
            id,
            tmdb_id,
            title,
            type,
            poster_url,
            overview
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;

      // Transform data: Supabase joins return content as array, convert to object
      const transformedData = data?.map((item: any) => ({
        ...item,
        content: Array.isArray(item.content) ? item.content[0] : item.content,
      })) as WatchlistItemWithContent[];

      // Group by status
      const watchingItems = transformedData?.filter((item) => item.status === 'watching') || [];
      const wantToWatchItems = transformedData?.filter((item) => item.status === 'want_to_watch') || [];
      const watchedItems = transformedData?.filter((item) => item.status === 'watched') || [];

      setWatching(watchingItems);
      setWantToWatch(wantToWatchItems);
      setWatched(watchedItems);
    } catch (error) {
      console.error('[Watchlist] Error fetching watchlist:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Load personalized recommendations
  useEffect(() => {
    if (user?.id) {
      loadPersonalizedContent();
    }
  }, [user?.id]);

  const loadPersonalizedContent = async (append: boolean = false) => {
    if (!user?.id) return;

    setLoadingForYou(true);
    try {
      const [recommendations, genres] = await Promise.all([
        getMixedRecommendations(user.id, 20),
        getUserTopGenres(user.id, 6),
      ]);

      console.log('[Watchlist] Loaded', recommendations.length, 'recommendations');

      if (append) {
        // Append new recommendations, avoiding duplicates
        setAllRecommendations(prev => {
          const existingIds = new Set(prev.map(item => `${item.type}-${item.id}`));
          const newItems = recommendations.filter(
            item => !existingIds.has(`${item.type}-${item.id}`)
          );
          return [...prev, ...newItems];
        });
      } else {
        setAllRecommendations(recommendations);
        setFilteredRecommendations(recommendations); // Initially show all
      }
      setUserTopGenres(genres.map(g => ({ id: g.genreId, name: g.genreName })));
    } catch (error) {
      console.error('[Watchlist] Error loading personalized content:', error);
    } finally {
      setLoadingForYou(false);
    }
  };

  // Filter recommendations when genre filter changes
  useEffect(() => {
    const filtered = filterRecommendationsByGenre(allRecommendations, activeGenreFilter);
    setFilteredRecommendations(filtered);
  }, [activeGenreFilter, allRecommendations, filterRecommendationsByGenre]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchWatchlist(),
        loadPersonalizedContent(),
      ]);
    } catch (error) {
      console.error('[Watchlist] Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Convert watchlist item to UnifiedContent for detail modal
  const convertToUnifiedContent = (item: WatchlistItemWithContent): UnifiedContent => {
    return {
      id: item.content.tmdb_id,
      title: item.content.title,
      originalTitle: item.content.title,
      type: item.content.type,
      overview: item.content.overview || '',
      posterPath: item.content.poster_url,
      backdropPath: null,
      releaseDate: null,
      genres: [],
      rating: 0,
      voteCount: 0,
      popularity: 0,
      language: '',
    };
  };

  // Handle item press - open detail modal
  const handleItemPress = (item: WatchlistItemWithContent) => {
    const content = convertToUnifiedContent(item);
    setSelectedContent(content);
    setShowContentDetail(true);
  };

  // Handle trending item press
  const handleTrendingPress = (item: any) => {
    const content: UnifiedContent = {
      id: item.id,
      title: item.media_type === 'movie' ? item.title : item.name,
      originalTitle: item.media_type === 'movie' ? item.original_title : item.original_name,
      type: item.media_type as 'movie' | 'tv',
      overview: item.overview,
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      releaseDate: item.media_type === 'movie' ? item.release_date : item.first_air_date,
      genres: [],
      rating: item.vote_average || 0,
      voteCount: item.vote_count || 0,
      popularity: item.popularity || 0,
      language: item.original_language || '',
    };
    setSelectedContent(content);
    setShowContentDetail(true);
  };

  // Handle personalized content press
  const handleContentPress = (content: UnifiedContent) => {
    setSelectedContent(content);
    setShowContentDetail(true);
  };

  const totalItems = watching.length + wantToWatch.length + watched.length;

  // ============================================================================
  // RENDER HORIZONTAL SECTION
  // ============================================================================

  const renderHorizontalSection = (
    title: string,
    items: WatchlistItemWithContent[],
    showRating: boolean = false
  ) => {
    if (items.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {items.map((item) => {
            const posterUrl = item.content.poster_url
              ? getPosterUrl(item.content.poster_url, 'small')
              : null;

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.posterCard}
                onPress={() => handleItemPress(item)}
              >
                {posterUrl ? (
                  <Image source={{ uri: posterUrl }} style={styles.poster} />
                ) : (
                  <View style={[styles.poster, styles.posterPlaceholder, { backgroundColor: colors.border }]}>
                    <MaterialCommunityIcons name="image-off" size={32} color={colors.textSecondary} />
                  </View>
                )}
                <Text style={[styles.posterTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.content.title}
                </Text>
                {showRating && item.rating && (
                  <View style={styles.ratingContainer}>
                    <MaterialCommunityIcons name="star" size={14} color={COLORS.warning} />
                    <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                      {item.rating}/10
                    </Text>
                  </View>
                )}
                {item.streaming_services && Array.isArray(item.streaming_services) && item.streaming_services.length > 0 && (
                  <View style={styles.serviceContainer}>
                    <MaterialCommunityIcons name="play-circle" size={12} color={colors.primary} />
                    <Text style={[styles.serviceText, { color: colors.primary }]} numberOfLines={1}>
                      {item.streaming_services[0]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading your watchlist...
        </Text>
      </View>
    );
  }

  // ============================================================================
  // EMPTY STATE
  // ============================================================================

  if (totalItems === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="playlist-plus"
          title="Your Watchlist is Empty"
          message="Start adding movies and TV shows you want to watch"
          actionLabel="Browse Content"
          onActionPress={() => setShowContentSearch(true)}
        />

        {/* Trending Suggestions */}
        {trending && trending.results.length > 0 && (
          <View style={styles.trendingSection}>
            <Text style={[styles.trendingTitle, { color: colors.text }]}>🔥 Trending Now</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingScroll}>
              {trending.results.slice(0, 10).map((item) => {
                const title = item.media_type === 'movie' ? item.title : item.name;
                const posterUrl = item.poster_path ? getPosterUrl(item.poster_path, 'small') : null;

                return (
                  <TouchableOpacity
                    key={`${item.media_type}-${item.id}`}
                    style={styles.trendingCard}
                    onPress={() => handleTrendingPress(item)}
                  >
                    {posterUrl ? (
                      <Image source={{ uri: posterUrl }} style={styles.trendingPoster} />
                    ) : (
                      <View style={[styles.trendingPoster, styles.posterPlaceholder, { backgroundColor: colors.border }]}>
                        <MaterialCommunityIcons name="image-off" size={24} color={colors.textSecondary} />
                      </View>
                    )}
                    <Text style={[styles.trendingText, { color: colors.text }]} numberOfLines={2}>
                      {title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <FAB
          style={[styles.fab, { backgroundColor: colors.primary }]}
          icon="plus"
          onPress={() => setShowContentSearch(true)}
          color={COLORS.white}
        />
      </View>
    );
  }

  // ============================================================================
  // WATCHLIST WITH ITEMS
  // ============================================================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Watchlist</Text>
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.card }]}
            onPress={() => setShowContentSearch(true)}
          >
            <MaterialCommunityIcons name="magnify" size={20} color={colors.text} />
            <Text style={[styles.searchButtonText, { color: colors.text }]}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Personalized For You Section */}
        {allRecommendations.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWithSubtitle}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  ✨ For You
                </Text>
                {userTopGenres.length > 0 && activeGenreFilter === 'All' && (
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Based on {userTopGenres.slice(0, 2).map(g => g.name).join(' & ')}
                  </Text>
                )}
                {activeGenreFilter !== 'All' && (
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Filtered by {activeGenreFilter}
                  </Text>
                )}
              </View>
            </View>

            {/* Genre Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsContainer}
            >
              {getGenreFilters().map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.filterChip,
                    activeGenreFilter === genre && styles.filterChipActive,
                    {
                      backgroundColor: activeGenreFilter === genre ? colors.primary : colors.card,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => {
                    console.log(`[Watchlist] Genre filter tapped: ${genre}`);
                    setActiveGenreFilter(genre);
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: activeGenreFilter === genre ? COLORS.white : colors.text }
                    ]}
                  >
                    {genre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {filteredRecommendations.map(item => (
                <TouchableOpacity
                  key={`foryou-${item.id}-${item.type}`}
                  onPress={() => handleContentPress(item)}
                  style={styles.posterCard}
                >
                  <Image
                    source={{
                      uri: item.posterPath
                        ? (getPosterUrl(item.posterPath, 'small') ?? 'https://via.placeholder.com/120x180')
                        : 'https://via.placeholder.com/120x180'
                    }}
                    style={[styles.poster, { backgroundColor: colors.card }]}
                  />
                  <Text
                    numberOfLines={2}
                    style={[styles.posterTitle, { color: colors.text }]}
                  >
                    {item.title}
                  </Text>
                  <View style={styles.contentMeta}>
                    <Text style={[styles.contentMetaText, { color: colors.textSecondary }]}>
                      {item.type === 'tv' ? '📺' : '🎬'} {item.rating?.toFixed(1) || 'N/A'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* More Button */}
              {filteredRecommendations.length > 0 && !loadingForYou && (
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={() => loadPersonalizedContent(true)}
                >
                  <MaterialCommunityIcons name="plus-circle-outline" size={36} color={colors.primary} />
                  <Text style={[styles.moreButtonText, { color: colors.primary }]}>More</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        ) : !loadingForYou && totalItems > 0 ? (
          <View style={[styles.onboardingCard, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="star-four-points" size={32} color={colors.primary} />
            <Text style={[styles.onboardingTitle, { color: colors.text }]}>
              Personalized picks coming soon
            </Text>
            <Text style={[styles.onboardingText, { color: colors.textSecondary }]}>
              Add shows and movies to your watchlist to get recommendations tailored to your taste
            </Text>
          </View>
        ) : null}

        {loadingForYou && allRecommendations.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Finding recommendations...
            </Text>
          </View>
        )}

        {/* Currently Watching Section */}
        {renderHorizontalSection('Currently Watching', watching)}

        {/* Want to Watch Section */}
        {renderHorizontalSection('Want to Watch', wantToWatch)}

        {/* Watched Section */}
        {renderHorizontalSection('Watched', watched, true)}

        {/* Trending Now Section */}
        {trending && trending.results.length > 0 && (
          <View style={styles.section}>
            <View style={styles.trendingHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>🔥 Trending Now</Text>
              <TouchableOpacity onPress={() => setShowContentSearch(true)}>
                <Text style={[styles.browseLink, { color: colors.primary }]}>Browse All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {trending.results.slice(0, 10).map((item) => {
                const title = item.media_type === 'movie' ? item.title : item.name;
                const posterUrl = item.poster_path ? getPosterUrl(item.poster_path, 'small') : null;

                return (
                  <TouchableOpacity
                    key={`${item.media_type}-${item.id}`}
                    style={styles.posterCard}
                    onPress={() => handleTrendingPress(item)}
                  >
                    {posterUrl ? (
                      <Image source={{ uri: posterUrl }} style={styles.poster} />
                    ) : (
                      <View style={[styles.poster, styles.posterPlaceholder, { backgroundColor: colors.border }]}>
                        <MaterialCommunityIcons name="image-off" size={32} color={colors.textSecondary} />
                      </View>
                    )}
                    <Text style={[styles.posterTitle, { color: colors.text }]} numberOfLines={2}>
                      {title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={[styles.fab, { backgroundColor: colors.primary }]}
        icon="plus"
        onPress={() => setShowContentSearch(true)}
        color={COLORS.white}
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
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeaderWithSubtitle: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    paddingLeft: 0,
  },
  horizontalScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  posterCard: {
    width: 120,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterTitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  serviceText: {
    fontSize: 11,
    fontWeight: '500',
  },
  trendingSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  trendingTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  browseLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendingScroll: {
    gap: 12,
  },
  trendingCard: {
    width: 100,
  },
  trendingPoster: {
    width: 100,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  trendingText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 14,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  bottomPadding: {
    height: 100,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contentMetaText: {
    fontSize: 11,
  },
  onboardingCard: {
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  onboardingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  onboardingText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  filterChipsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {
    // Active state is handled via backgroundColor in component
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  moreButton: {
    width: 100,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});
