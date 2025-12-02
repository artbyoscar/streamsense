/**
 * Tab Bar Component
 * Netflix-style segmented tabs for filtering watchlist
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, Bookmark, Play, CheckCircle } from 'lucide-react-native';

export type WatchlistTab = 'forYou' | 'wantToWatch' | 'watching' | 'watched';

interface Tab {
  id: WatchlistTab;
  label: string;
  icon: typeof Sparkles;
}

interface TabBarProps {
  activeTab: WatchlistTab;
  onTabChange: (tab: WatchlistTab) => void;
}

const TABS: Tab[] = [
  { id: 'forYou', label: 'For You', icon: Sparkles },
  { id: 'wantToWatch', label: 'Want to Watch', icon: Bookmark },
  { id: 'watching', label: 'Watching', icon: Play },
  { id: 'watched', label: 'Watched', icon: CheckCircle },
];

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.tabBarContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onTabChange(tab.id)}
            >
              <Icon
                size={16}
                color={isActive ? '#000' : '#888'}
                fill={isActive && tab.id === 'forYou' ? '#a78bfa' : 'transparent'}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: '#0f0f0f',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tabActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
});
