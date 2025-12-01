/**
 * Watchlist Screen
 * User's watchlist grouped by status with content search integration
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { getSmartRecommendations, getGenreRecommendations } from '@/services/smartRecommendations';
import { COLORS, EmptyState } from '@/components';
import type { UnifiedContent, WatchlistStatus } from '@/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const GENRE_ID_MAP: Record<string, number[]> = {
  'All': [],
  'Drama': [18],
  'Adventure': [12],
  'Action': [28, 10759], // Movie + TV Action
  'Science Fiction': [878, 10765], // Movie Sci-Fi + TV Sci-Fi & Fantasy
  'Animation': [16],        // Western animation/cartoons
  'Anime': [16],            // Japanese anime (same ID, filtered by origin)
  'Comedy': [35],
  'Thriller': [53],
  'Horror': [27],
  'Romance': [10749],
  'Documentary': [99],
  'Crime': [80],
  'Mystery': [9648],
  'Fantasy': [14, 10765],
  'Family': [10751],
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
  const [userTopGenres, setUserTopGenres] = useState<{ id: number; name: string }[]>([]);
  const [activeGenreFilter, setActiveGenreFilter] = useState<string>('All');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [loadingForYou, setLoadingForYou] = useState(false);

  // Fetch trending for suggestions
  const { data: trending } = useTrending('week', 1);

  // ============================================================================
  // DERIVED STATE - Use useMemo to avoid infinite loops
  // ============================================================================

  // ROBUST filtering that handles different data structures
  const filteredRecommendations = useMemo(() => {
    if (!allRecommendations || allRecommendations.length === 0) {
      console.log('[Watchlist] No recommendations to filter');
      return [];
    }

    let filtered = [...allRecommendations];

    // Debug: Log first item structure
    if (filtered.length > 0) {
      const sample = filtered[0] as any;
      console.log('[Watchlist] Sample item structure:', {
        id: sample.id,
        title: sample.title,
        type: sample.type,
        media_type: sample.media_type,
        genre_ids: sample.genre_ids,
        genres: sample.genres,
      });
    }

    // Filter by media type
    if (mediaTypeFilter !== 'all') {
      filtered = filtered.filter((item: any) => {
        // UnifiedContent uses 'type' field (not 'media_type')
        const itemType = item.type || item.media_type;

        if (itemType) {
          return itemType === mediaTypeFilter;
        }

        // Fallback: Check if it has 'title' (movie) or 'name' (TV)
        if (mediaTypeFilter === 'movie') {
          return item.title && !item.first_air_date;
        }
        if (mediaTypeFilter === 'tv') {
          return item.name || item.first_air_date;
        }
        return true;
      });
      console.log(`[Watchlist] After media type filter (${mediaTypeFilter}): ${filtered.length} items`);
    }

    // Filter by genre
    if (activeGenreFilter !== 'All') {
      const targetGenreIds = GENRE_ID_MAP[activeGenreFilter] || [];

      if (targetGenreIds.length > 0) {
        filtered = filtered.filter((item: any) => {
          // Try genre_ids first (array of numbers)
          let itemGenreIds: number[] = [];

          if (Array.isArray(item.genre_ids)) {
            itemGenreIds = item.genre_ids;
          }
          // Try genres as array of objects with id
          else if (Array.isArray(item.genres)) {
            itemGenreIds = item.genres.map((g: any) =>
              typeof g === 'number' ? g : (g.id || 0)
            );
          }

          const hasMatch = itemGenreIds.some((id: number) => targetGenreIds.includes(id));

          // Special handling for Anime vs Animation
          if (activeGenreFilter === 'Anime') {
            // Must be animation (16) AND Japanese origin
            const isAnimated = itemGenreIds.includes(16);
            const isJapanese = item.original_language === 'ja';
            return isAnimated && isJapanese;
          } else if (activeGenreFilter === 'Animation') {
            // Must be animation (16) AND NOT Japanese origin
            const isAnimated = itemGenreIds.includes(16);
            const isJapanese = item.original_language === 'ja';
            return isAnimated && !isJapanese;
          }

          return hasMatch;
        });
        console.log(`[Watchlist] After genre filter (${activeGenreFilter}): ${filtered.length} items`);
      }
    }

    console.log(`[Watchlist] Final filtered: ${filtered.length} items`);
    return filtered;
  }, [allRecommendations, activeGenreFilter, mediaTypeFilter]);

  // ============================================================================
  // DEBUG - Log item structure when recommendations load
  // ============================================================================

  useEffect(() => {
    if (allRecommendations.length > 0) {
      console.log('[Watchlist] DEBUG - First 3 items structure:');
      allRecommendations.slice(0, 3).forEach((item, i) => {
        const anyItem = item as any;
        console.log(`Item ${i}:`, {
          id: anyItem.id,
          title: anyItem.title,
          name: anyItem.name,
          media_type: anyItem.media_type,
          genre_ids: anyItem.genre_ids,
          genres: anyItem.genres,
          original_language: anyItem.original_language,
          first_air_date: anyItem.first_air_date,
          release_date: anyItem.release_date,
        });
      });
    }
  }, [allRecommendations]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  // Get available genre filters
  const getGenreFilters = (): string[] => {
    const baseFilters = ['All'];
    const topGenres = ['Drama', 'Adventure', 'Action', 'Science Fiction', 'Animation', 'Anime', 'Comedy'];
    const extraGenres = ['Thriller', 'Horror', 'Romance', 'Documentary', 'Crime', 'Mystery', 'Fantasy', 'Family'];
    return [...baseFilters, ...topGenres, ...extraGenres];
  };

  // Handle genre filter tap - fetch fresh content for that genre (Netflix-style)
  const handleGenreFilterTap = useCallback(async (genre: string) => {
    if (!user?.id) return;

    console.log('[Watchlist] Genre filter tapped:', genre);
    setActiveGenreFilter(genre);
    setLoadingForYou(true);

    try {
      if (genre === 'All') {
        // Load mixed recommendations
        const recs = await getSmartRecommendations({
          userId: user.id,
          mediaType: mediaTypeFilter === 'all' ? 'mixed' : mediaTypeFilter,
          limit: 20,
          forceRefresh: true,
        });
        setAllRecommendations(recs);
      } else {
        // Load genre-specific recommendations
        const recs = await getGenreRecommendations({
          userId: user.id,
          genre: genre,
          mediaType: mediaTypeFilter === 'all' ? 'mixed' : mediaTypeFilter,
          limit: 20,
        });
        setAllRecommendations(recs);
      }
    } catch (error) {
      console.error('[Watchlist] Genre filter error:', error);
    } finally {
      setLoadingForYou(false);
    }
  }, [user?.id, mediaTypeFilter]);

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

  // Refetch when media type filter changes
  useEffect(() => {
    if (user?.id && allRecommendations.length > 0) {
      // Re-apply current genre filter with new media type
      handleGenreFilterTap(activeGenreFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaTypeFilter]); // Only run when mediaTypeFilter changes

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
      }
      setUserTopGenres(genres.map(g => ({ id: g.genreId, name: g.genreName })));
    } catch (error) {
      console.error('[Watchlist] Error loading personalized content:', error);
    } finally {
      setLoadingForYou(false);
    }
  };

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

            {/* Media Type Segmented Control */}
            <View style={styles.mediaTypeContainer}>
              <View style={[styles.segmentedControl, { backgroundColor: colors.card }]}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'movie', label: '🎬 Movies' },
                  { key: 'tv', label: '📺 TV Shows' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.segmentButton,
                      mediaTypeFilter === item.key && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                    onPress={() => setMediaTypeFilter(item.key as 'all' | 'movie' | 'tv')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        {
                          color: mediaTypeFilter === item.key ? COLORS.white : colors.text,
                          fontWeight: mediaTypeFilter === item.key ? '600' : '400',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
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
                  onPress={() => handleGenreFilterTap(genre)}
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

            {loadingForYou ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading {activeGenreFilter !== 'All' ? activeGenreFilter : ''} recommendations...
                </Text>
              </View>
            ) : (
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
            )}
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
  mediaTypeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentText: {
    fontSize: 14,
  },
});
