/**
 * Custom State-Based Navigation with Context
 * Real screens integrated incrementally
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DashboardScreen } from '@/features/dashboard';
import { WatchlistScreen } from '@/features/watchlist';
import { SettingsScreen } from '@/features/settings';
import { RecommendationsScreen } from '@/features/recommendations';
import { SwipeScreen } from '@/features/discover/screens/SwipeScreen';
import { SubscriptionForm } from '@/features/subscriptions/components/SubscriptionForm';
import { ContentSearchModal } from '@/features/watchlist/components/ContentSearchModal';
import { ContentDetailModal } from '@/features/watchlist/components/ContentDetailModal';
import { PlaidConnectionScreen } from '@/features/onboarding/screens/PlaidConnectionScreen';
import { NavigationProvider, useCustomNavigation } from './NavigationContext';
import { useTheme } from '@/providers/ThemeProvider';
// import { useNotifications } from '@/hooks/useNotifications'; // Disabled: requires dev build

// Navigator component - uses the context
const Navigator: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    showSubscriptionForm,
    setShowSubscriptionForm,
    showContentSearch,
    setShowContentSearch,
    showContentDetail,
    setShowContentDetail,
    showPlaidConnection,
    setShowPlaidConnection,
    selectedContent,
    setSelectedContent,
    selectedSubscriptionId,
    setSelectedSubscriptionId,
    triggerRefresh,
  } = useCustomNavigation();
  const { colors, isDark } = useTheme();

  // Initialize notifications
  // useNotifications(); // Disabled: requires dev build, enable when doing production build

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home': return <DashboardScreen />;
      case 'Watchlist': return <WatchlistScreen />;
      case 'Discover': return <SwipeScreen />;
      case 'Tips': return <RecommendationsScreen />;
      case 'Settings': return <SettingsScreen />;
      default: return <DashboardScreen />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {[
          { name: 'Home' as const, icon: 'home' as const, iconOutline: 'home-outline' as const },
          { name: 'Watchlist' as const, icon: 'bookmark' as const, iconOutline: 'bookmark-outline' as const },
          { name: 'Discover' as const, icon: 'cards' as const, iconOutline: 'cards-outline' as const },
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
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedSubscriptionId ? 'Edit Subscription' : 'Add Subscription'}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowSubscriptionForm(false);
              setSelectedSubscriptionId(null);
            }}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <SubscriptionForm
            onSuccess={() => {
              triggerRefresh();
              setShowSubscriptionForm(false);
              setSelectedSubscriptionId(null);
            }}
            onCancel={() => {
              setShowSubscriptionForm(false);
              setSelectedSubscriptionId(null);
            }}
            subscriptionId={selectedSubscriptionId}
          />
        </SafeAreaView>
      </Modal>

      {/* Content Search Modal */}
      <ContentSearchModal
        visible={showContentSearch}
        onClose={() => setShowContentSearch(false)}
      />

      {/* Content Detail Modal */}
      <ContentDetailModal
        visible={showContentDetail}
        content={selectedContent}
        onClose={() => {
          setShowContentDetail(false);
          setSelectedContent(null);
        }}
        onAddedToWatchlist={() => {
          // Optionally refresh watchlist data
          console.log('[Navigation] Content added to watchlist');
        }}
      />

      {/* Plaid Connection Modal */}
      <Modal
        visible={showPlaidConnection}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPlaidConnection(false)}
      >
        <PlaidConnectionScreen onClose={() => setShowPlaidConnection(false)} />
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
});
