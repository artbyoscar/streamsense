/**
 * Custom State-Based Navigation - No Libraries
 * Testing without @react-navigation to isolate the issue
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

const HomeScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Home Screen</Text>
    <Text>Welcome to StreamSense!</Text>
  </View>
);

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
      case 'Home': return <HomeScreen />;
      case 'Watchlist': return <WatchlistScreen />;
      case 'Tips': return <TipsScreen />;
      case 'Settings': return <SettingsScreen />;
      default: return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <View style={styles.tabBar}>
        {['Home', 'Watchlist', 'Tips', 'Settings'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
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
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
