/**
 * Custom State-Based Navigation
 * Adding real screens incrementally
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DashboardScreen } from '@/features/dashboard';

// Placeholder screens - will replace with real ones incrementally
const WatchlistScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Watchlist</Text>
    <Text>Your watchlist will appear here</Text>
  </View>
);

const TipsScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Tips</Text>
    <Text>Recommendations will appear here</Text>
  </View>
);

const SettingsScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Settings</Text>
    <Text>Settings will appear here</Text>
  </View>
);

export const MainNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home': return <DashboardScreen />;
      case 'Watchlist': return <WatchlistScreen />;
      case 'Tips': return <TipsScreen />;
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
          { name: 'Home', icon: 'home' },
          { name: 'Watchlist', icon: 'bookmark' },
          { name: 'Tips', icon: 'lightbulb' },
          { name: 'Settings', icon: 'cog' },
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
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
