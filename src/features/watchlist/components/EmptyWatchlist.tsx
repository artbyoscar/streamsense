/**
 * Empty Watchlist Component
 * Engaging empty states that drive action
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bookmark, Play, CheckCircle, ArrowRight } from 'lucide-react-native';
import type { WatchlistTab } from './TabBar';

interface EmptyConfig {
  icon: typeof Bookmark;
  title: string;
  subtitle: string;
  action: string;
}

interface EmptyWatchlistProps {
  status: 'want_to_watch' | 'watching' | 'watched';
  onNavigate: (destination: string) => void;
}

const EMPTY_CONFIGS: Record<string, EmptyConfig> = {
  want_to_watch: {
    icon: Bookmark,
    title: 'Your watchlist is empty',
    subtitle: 'Discover something new and save it for later',
    action: 'Start Discovering',
  },
  watching: {
    icon: Play,
    title: 'Nothing in progress',
    subtitle: 'Start watching something from your list',
    action: 'View Watchlist',
  },
  watched: {
    icon: CheckCircle,
    title: 'No watch history yet',
    subtitle: 'Mark content as watched to track your viewing',
    action: 'Browse Recommendations',
  },
};

export const EmptyWatchlist: React.FC<EmptyWatchlistProps> = ({ status, onNavigate }) => {
  const config = EMPTY_CONFIGS[status];
  const Icon = config.icon;

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon size={48} color="#444" />
      </View>
      <Text style={styles.emptyTitle}>{config.title}</Text>
      <Text style={styles.emptySubtitle}>{config.subtitle}</Text>
      <TouchableOpacity style={styles.emptyAction} onPress={() => onNavigate('forYou')}>
        <Text style={styles.emptyActionText}>{config.action}</Text>
        <ArrowRight size={18} color="#a78bfa" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  emptyActionText: {
    color: '#a78bfa',
    fontSize: 15,
    fontWeight: '600',
  },
});
