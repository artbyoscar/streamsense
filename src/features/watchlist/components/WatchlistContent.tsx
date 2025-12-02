/**
 * Watchlist Content Component
 * For Want to Watch, Watching, and Watched tabs
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RecommendationLane } from './RecommendationLane';
import { EmptyWatchlist } from './EmptyWatchlist';

interface WatchlistContentProps {
  items: any[];
  status: 'want_to_watch' | 'watching' | 'watched';
  isEmpty: boolean;
  onItemPress: (item: any) => void;
  onNavigate: (destination: string) => void;
}

export const WatchlistContent: React.FC<WatchlistContentProps> = ({
  items,
  status,
  isEmpty,
  onItemPress,
  onNavigate,
}) => {
  if (isEmpty) {
    return <EmptyWatchlist status={status} onNavigate={onNavigate} />;
  }

  // Group items by service for better organization (optional)
  const groupByService = (items: any[]) => {
    const groups: Record<string, any[]> = {};

    items.forEach((item) => {
      // Use first streaming service or "Unknown"
      const service = item.streaming_services?.[0] || 'All Content';
      if (!groups[service]) {
        groups[service] = [];
      }
      groups[service].push(item);
    });

    return groups;
  };

  const grouped = status === 'watching' ? groupByService(items) : { 'All Content': items };

  return (
    <View style={styles.container}>
      {Object.entries(grouped).map(([service, serviceItems]) => (
        <RecommendationLane
          key={service}
          title={service !== 'All Content' ? `On ${service}` : getLaneTitle(status)}
          subtitle={getLaneSubtitle(status)}
          items={serviceItems}
          showProgress={status === 'watching'}
          onItemPress={onItemPress}
        />
      ))}
    </View>
  );
};

const getLaneTitle = (status: 'want_to_watch' | 'watching' | 'watched'): string => {
  switch (status) {
    case 'want_to_watch':
      return 'Want to Watch';
    case 'watching':
      return 'Currently Watching';
    case 'watched':
      return 'Watched';
  }
};

const getLaneSubtitle = (status: 'want_to_watch' | 'watching' | 'watched'): string | undefined => {
  switch (status) {
    case 'want_to_watch':
      return 'Your saved content';
    case 'watching':
      return 'Continue where you left off';
    case 'watched':
      return 'Your viewing history';
  }
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
});
