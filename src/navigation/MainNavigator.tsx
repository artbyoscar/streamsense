/**
 * Custom State-Based Navigation with Context
 * Real screens integrated incrementally
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DashboardScreen } from '@/features/dashboard';
import { WatchlistScreen } from '@/features/watchlist';
import { SettingsScreen } from '@/features/settings';
import { RecommendationsScreen } from '@/features/recommendations';
import { NavigationProvider, useCustomNavigation } from './NavigationContext';
import { useTheme } from '@/providers/ThemeProvider';

// Navigator component - uses the context
const Navigator: React.FC = () => {
  const { activeTab, setActiveTab, showSubscriptionForm, setShowSubscriptionForm } = useCustomNavigation();
  const { colors, isDark } = useTheme();

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {[
          { name: 'Home' as const, icon: 'home' as const, iconOutline: 'home-outline' as const },
          { name: 'Watchlist' as const, icon: 'bookmark' as const, iconOutline: 'bookmark-outline' as const },
          { name: 'Tips' as const, icon: 'lightbulb' as const, iconOutline: 'lightbulb-outline' as const },
          { name: 'Settings' as const, icon: 'cog' as const, iconOutline: 'cog-outline' as const },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.name}
            style={[styles.tab, activeTab === tab.name && { borderTopColor: colors.primary }]}
            onPress={() => setActiveTab(tab.name)}
          >
            <MaterialCommunityIcons
              name={activeTab === tab.name ? tab.icon : tab.iconOutline}
              size={24}
              color={activeTab === tab.name ? colors.primary : colors.textSecondary}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.name ? colors.primary : colors.textSecondary }
            ]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subscription Form Modal */}
      <Modal visible={showSubscriptionForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Subscription</Text>
            <TouchableOpacity onPress={() => setShowSubscriptionForm(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={[styles.modalText, { color: colors.text }]}>Subscription form will go here</Text>
            <Text style={[styles.modalSubtext, { color: colors.textSecondary }]}>This feature is coming soon!</Text>
          </View>
        </SafeAreaView>
      </Modal>
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
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 14,
  },
});
