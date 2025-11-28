/**
 * Watchlist Screen
 * Manage and view watchlist with filters, sorting, and swipe actions
 */

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
} from 'react-native';
import { Text, FAB, Menu, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useWatchlistStore, SortOption, FilterOption } from '../store/watchlistStore';
import { useTrending, getPosterUrl } from '@/hooks/useTMDb';
import { COLORS, Card, LoadingScreen, EmptyState, PaywallModal } from '@/components';
import { usePremiumFeature } from '@/hooks/usePremiumFeature';
import type { WatchlistItem, WatchlistPriority } from '@/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_COLORS: Record<WatchlistPriority, string> = {
  high: COLORS.error,
  medium: COLORS.warning,
  low: COLORS.success,
};

const PRIORITY_LABELS: Record<WatchlistPriority, string> = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority',
};

const SORT_OPTIONS: Array<{ value: SortOption; label: string; icon: string }> = [
  { value: 'date', label: 'Date Added', icon: 'calendar' },
  { value: 'priority', label: 'Priority', icon: 'flag' },
  { value: 'title', label: 'Title (A-Z)', icon: 'sort-alphabetical-ascending' },
];

// ============================================================================
// SWIPEABLE ITEM COMPONENT
// ============================================================================

interface SwipeableWatchlistItemProps {
  item: WatchlistItem;
  onPress: () => void;
  onMarkWatched: () => void;
  onRemove: () => void;
}

const SwipeableWatchlistItem: React.FC<SwipeableWatchlistItemProps> = ({
  item,
  onPress,
  onMarkWatched,
  onRemove,
}) => {
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    return (
      <View style={styles.swipeActionsContainer}>
        {/* Mark as Watched */}
        {!item.watched && (
          <TouchableOpacity style={styles.swipeActionWatched} onPress={onMarkWatched}>
            <MaterialCommunityIcons name="check" size={24} color={COLORS.white} />
            <Text style={styles.swipeActionText}>Watched</Text>
          </TouchableOpacity>
        )}

        {/* Remove */}
        <TouchableOpacity style={styles.swipeActionDelete} onPress={onRemove}>
          <MaterialCommunityIcons name="delete" size={24} color={COLORS.white} />
          <Text style={styles.swipeActionText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const posterUrl = item.content?.poster_path
    ? getPosterUrl(item.content.poster_path, 'small')
    : null;

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity
        style={[styles.itemContainer, item.watched && styles.itemContainerWatched]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Poster */}
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.itemPoster} />
        ) : (
          <View style={[styles.itemPoster, styles.itemPosterPlaceholder]}>
            <MaterialCommunityIcons name="image-off" size={32} color={COLORS.gray} />
          </View>
        )}

        {/* Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.content?.title || 'Unknown Title'}
          </Text>

          <View style={styles.itemMeta}>
            {/* Type Badge */}
            <View
              style={[
                styles.typeBadge,
                item.content?.type === 'movie'
                  ? styles.typeBadgeMovie
                  : styles.typeBadgeTV,
              ]}
            >
              <Text style={styles.typeBadgeText}>
                {item.content?.type === 'movie' ? 'MOVIE' : 'TV SHOW'}
              </Text>
            </View>

            {/* Year */}
            {item.content?.release_date && (
              <Text style={styles.itemYear}>
                {new Date(item.content.release_date).getFullYear()}
              </Text>
            )}
          </View>

          {/* Priority Badge */}
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: PRIORITY_COLORS[item.priority] + '20' },
            ]}
          >
            <MaterialCommunityIcons
              name="flag"
              size={12}
              color={PRIORITY_COLORS[item.priority]}
            />
            <Text
              style={[styles.priorityText, { color: PRIORITY_COLORS[item.priority] }]}
            >
              {PRIORITY_LABELS[item.priority]}
            </Text>
          </View>

          {/* Watched Badge */}
          {item.watched && (
            <View style={styles.watchedBadge}>
              <MaterialCommunityIcons name="check-circle" size={14} color={COLORS.success} />
              <Text style={styles.watchedText}>Watched</Text>
            </View>
          )}
        </View>

        {/* Chevron */}
        <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.gray} />
      </TouchableOpacity>
    </Swipeable>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const WatchlistScreen: React.FC = () => {
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Premium feature check
  const { canAddWatchlistItem, isPremium } = usePremiumFeature();

  const {
    isLoading,
    error,
    sortBy,
    filterBy,
    fetchWatchlist,
    markAsWatched,
    removeFromWatchlist,
    setSortBy,
    setFilterBy,
    getFilteredAndSortedWatchlist,
    getUnwatchedCount,
  } = useWatchlistStore();

  const watchlist = getFilteredAndSortedWatchlist();
  const unwatchedCount = getUnwatchedCount();

  // Fetch trending for empty state
  const { data: trending } = useTrending('week', 1, {
    enabled: watchlist.length === 0 && !isLoading,
  });

  // Load watchlist on mount
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Handlers
  const handleItemPress = (item: WatchlistItem) => {
    // TODO: Implement content detail as modal/dialog
    Alert.alert(
      'Content Details',
      `Viewing details for "${item.content?.title}"\n\nContent detail view coming soon!`
    );
  };

  const handleMarkWatched = async (item: WatchlistItem) => {
    try {
      await markAsWatched(item.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as watched');
    }
  };

  const handleRemove = (item: WatchlistItem) => {
    Alert.alert(
      'Remove from Watchlist',
      `Remove "${item.content?.title}" from your watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromWatchlist(item.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove from watchlist');
            }
          },
        },
      ]
    );
  };

  const handleAddContent = () => {
    // Check if user can add more watchlist items
    const check = canAddWatchlistItem(watchlist.length);

    if (!check.allowed) {
      // Show paywall if limit reached
      setShowPaywall(true);
      return;
    }

    // Navigate to content search (will be implemented as modal)
    console.log('[Watchlist] Would navigate to: ContentSearch');
    Alert.alert('Content Search', 'Content search modal coming soon!');
  };

  const handleBrowseTrending = () => {
    // Navigate to content search (will be implemented as modal)
    console.log('[Watchlist] Would navigate to: ContentSearch');
    Alert.alert('Content Search', 'Content search modal coming soon!');
  };

  const handleUpgrade = () => {
    setShowPaywall(false);
    // Navigate to settings tab (will be implemented with useCustomNavigation)
    console.log('[Watchlist] Would navigate to: Settings');
    Alert.alert('Upgrade', 'Navigate to Settings tab to upgrade. Tab switching coming soon!');
  };

  // Get current sort label
  const currentSortLabel =
    SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || 'Date Added';

  // Loading state
  if (isLoading && watchlist.length === 0) {
    return <LoadingScreen message="Loading your watchlist..." />;
  }

  // Error state
  if (error && watchlist.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Failed to load watchlist</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
      </View>
    );
  }

  // Empty state
  if (watchlist.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="playlist-plus"
          title="Your Watchlist is Empty"
          message="Start adding movies and TV shows you want to watch"
          actionLabel="Browse Trending"
          onActionPress={handleBrowseTrending}
        />

        {/* Trending Suggestions */}
        {trending && trending.results.length > 0 && (
          <View style={styles.trendingSection}>
            <Text style={styles.trendingTitle}>🔥 Trending Now</Text>
            <View style={styles.trendingGrid}>
              {trending.results.slice(0, 6).map((item) => {
                const title = item.media_type === 'movie' ? item.title : item.name;
                return (
                  <View key={`${item.media_type}-${item.id}`} style={styles.trendingItem}>
                    {item.poster_path ? (
                      <Image
                        source={{ uri: getPosterUrl(item.poster_path, 'small')! }}
                        style={styles.trendingPoster}
                      />
                    ) : (
                      <View style={[styles.trendingPoster, styles.itemPosterPlaceholder]}>
                        <MaterialCommunityIcons
                          name="image-off"
                          size={24}
                          color={COLORS.gray}
                        />
                      </View>
                    )}
                    <Text style={styles.trendingItemTitle} numberOfLines={2}>
                      {title}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <FAB
          icon="plus"
          label="Add to Watchlist"
          style={styles.fab}
          onPress={handleAddContent}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>My Watchlist</Text>
          <Text style={styles.headerSubtitle}>
            {unwatchedCount} unwatched • {watchlist.length} total
          </Text>
        </View>

        {/* Sort Menu */}
        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setSortMenuVisible(true)}
            >
              <MaterialCommunityIcons name="sort" size={20} color={COLORS.primary} />
              <Text style={styles.sortButtonText}>{currentSortLabel}</Text>
            </TouchableOpacity>
          }
        >
          {SORT_OPTIONS.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                setSortBy(option.value);
                setSortMenuVisible(false);
              }}
              title={option.label}
              leadingIcon={option.icon}
              titleStyle={sortBy === option.value ? styles.selectedMenuItem : undefined}
            />
          ))}
        </Menu>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filterBy === 'all' && styles.filterTabActive]}
          onPress={() => setFilterBy('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterBy === 'all' && styles.filterTabTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filterBy === 'movies' && styles.filterTabActive]}
          onPress={() => setFilterBy('movies')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterBy === 'movies' && styles.filterTabTextActive,
            ]}
          >
            Movies
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filterBy === 'tv' && styles.filterTabActive]}
          onPress={() => setFilterBy('tv')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterBy === 'tv' && styles.filterTabTextActive,
            ]}
          >
            TV Shows
          </Text>
        </TouchableOpacity>
      </View>

      <Divider />

      {/* Watchlist */}
      <FlatList
        data={watchlist}
        renderItem={({ item }) => (
          <SwipeableWatchlistItem
            item={item}
            onPress={() => handleItemPress(item)}
            onMarkWatched={() => handleMarkWatched(item)}
            onRemove={() => handleRemove(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            icon="filter-off"
            title="No items found"
            message={`No ${filterBy === 'all' ? '' : filterBy} in your watchlist`}
          />
        }
      />

      {/* FAB */}
      <FAB icon="plus" style={styles.fab} onPress={handleAddContent} />

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        feature="watchlist"
        limit={10}
        current={watchlist.length}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.darkGray,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '10',
    gap: 6,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  selectedMenuItem: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
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
  listContainer: {
    paddingVertical: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  itemContainerWatched: {
    opacity: 0.6,
  },
  itemPoster: {
    width: 60,
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  itemPosterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 6,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeMovie: {
    backgroundColor: COLORS.primary + '20',
  },
  typeBadgeTV: {
    backgroundColor: COLORS.success + '20',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.darkGray,
  },
  itemYear: {
    fontSize: 13,
    color: COLORS.gray,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  watchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  watchedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginLeft: 96,
  },
  swipeActionsContainer: {
    flexDirection: 'row',
  },
  swipeActionWatched: {
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingHorizontal: 16,
  },
  swipeActionDelete: {
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingHorizontal: 16,
  },
  swipeActionText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: COLORS.primary,
  },
  trendingSection: {
    padding: 20,
  },
  trendingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 16,
  },
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  trendingItem: {
    width: '33.33%',
    padding: 8,
  },
  trendingPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  trendingItemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginTop: 6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
});
