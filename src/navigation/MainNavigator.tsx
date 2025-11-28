/**
 * Custom State-Based Navigation with Context
 * Real screens integrated incrementally
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DashboardScreen } from '@/features/dashboard';
import { WatchlistScreen } from '@/features/watchlist';
import { SettingsScreen } from '@/features/settings';
import { RecommendationsScreen } from '@/features/recommendations';
import { NavigationProvider, useCustomNavigation } from './NavigationContext';

// Navigator component - uses the context
const Navigator: React.FC = () => {
  const { activeTab, setActiveTab } = useCustomNavigation();

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home': return <DashboardScreen />;
      case 'Watchlist': return <WatchlistScreen />;
      case 'Tips': return <RecommendationsScreen />;
      case 'Settings': return <SettingsScreen />;
      default: return <DashboardScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <View style={styles.tabBar}>
        {[
          { name: 'Home' as const, icon: 'home' },
          { name: 'Watchlist' as const, icon: 'bookmark' },
          { name: 'Tips' as const, icon: 'lightbulb' },
          { name: 'Settings' as const, icon: 'cog' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.name}
            style={[styles.tab, activeTab === tab.name && styles.activeTab]}
            onPress={() => setActiveTab(tab.name)}
          >
            <MaterialCommunityIcons
              name={activeTab === tab.name ? tab.icon : `${tab.icon}-outline`}
              size={24}
              color={activeTab === tab.name ? '#2563eb' : '#9ca3af'}
            />
            <Text style={[styles.tabText, activeTab === tab.name && styles.activeTabText]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

// Main export - wraps Navigator with Provider
export const MainNavigator: React.FC = () => {
  return (
    <NavigationProvider>
      <Navigator />
    </NavigationProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#fff',
    paddingBottom: 20,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: '#2563eb',
  },
  tabText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
