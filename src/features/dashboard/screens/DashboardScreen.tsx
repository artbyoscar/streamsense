/**
 * Dashboard Screen - Rocket Money Inspired
 * Main dashboard with hero spending card, insights, and sections
 * Redesigned for maximum impact and value communication
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useCustomNavigation } from '@/navigation/NavigationContext';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionsData } from '@/features/subscriptions';
import { useWatchlistStore } from '@/features/watchlist';
import { syncAllPlaidItems } from '@/services/plaid';
import { isFeatureEnabled } from '@/config/env';
import { COLORS, EmptyState, LoadingScreen, PaywallModal } from '@/components';
import { usePremiumFeature } from '@/hooks/usePremiumFeature';
import { QuickActionsCard } from '../components/QuickActionsCard';
import { SuggestionsAlert } from '../components/SuggestionsAlert';
import { HeroSpendCard } from '../components/HeroSpendCard';
import { QuickInsights } from '../components/QuickInsights';
import { UpcomingSection } from '../components/UpcomingSection';
import { ServicesSection } from '../components/ServicesSection';
import { ContinueWatchingSection } from '../components/ContinueWatchingSection';
import { PickedForYouSection } from '../components/PickedForYouSection';

export const DashboardScreen: React.FC = () => {
  const { setActiveTab, navigateToScreen, refreshKey } = useCustomNavigation();
  const user = useAuthStore((state) => state.user);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Premium feature check
  const { canAddSubscription, isPremium } = usePremiumFeature();

  const {
    subscriptions,
    activeSubscriptions,
    suggestions,
    totalActive,
    isLoading,
    error,
    refetch,
  } = useSubscriptionsData();

  // Watchlist data
  const fetchWatchlist = useWatchlistStore((state) => state.fetchWatchlist);

  // Load watchlist on mount
  useEffect(() => {
    fetchWatchlist().catch(console.error);
  }, []);

  // Refresh when refreshKey changes (e.g., after adding a subscription)
  useEffect(() => {
    if (refreshKey > 0) {
      console.log('[Dashboard] Refreshing data due to refreshKey change');
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]); // Only run when refreshKey changes, not when refetch changes

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Sync transactions from Plaid (only if configured)
      if (isFeatureEnabled('plaid')) {
        await syncAllPlaidItems();
      }

      // Refetch subscriptions and watchlist
      await Promise.all([
        refetch(),
        fetchWatchlist(),
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, fetchWatchlist]);

  // Navigation handlers
  const handleAddSubscription = () => {
    // Check if user can add more subscriptions
    const check = canAddSubscription(totalActive);

    if (!check.allowed) {
      // Show paywall if limit reached
      setShowPaywall(true);
      return;
    }

    navigateToScreen('SubscriptionForm');
  };

  const handleUpgrade = () => {
    setShowPaywall(false);
    setActiveTab('Settings');
  };

  const handleConnectBank = () => {
    if (!isFeatureEnabled('plaid')) {
      Alert.alert(
        'Feature Unavailable',
        'Bank connection is not currently enabled. Please contact support.',
        [{ text: 'OK' }]
      );
      return;
    }
    navigateToScreen('PlaidConnection');
  };

  const handleViewRecommendations = () => {
    setActiveTab('Tips');
  };

  const handleViewSuggestions = () => {
    setActiveTab('Tips');
  };

  // Get greeting with user's name
  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.user_metadata?.full_name?.split(' ')[0] ||
      user?.user_metadata?.first_name ||
      user?.email?.split('@')[0] ||
      'there';

    if (hour < 12) return `Good morning, ${firstName}`;
    if (hour < 17) return `Good afternoon, ${firstName}`;
    return `Good evening, ${firstName}`;
  };

  // Format current date
  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  // Show loading state
  if (isLoading && subscriptions.length === 0) {
    return <LoadingScreen message="Loading your subscriptions..." />;
  }

  // Show empty state if no subscriptions
  if (activeSubscriptions.length === 0 && !isLoading) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {getGreeting()}
          </Text>
          <Text style={styles.subtitle}>{getCurrentDate()}</Text>
        </View>

        {/* Suggestions Alert */}
        {suggestions.length > 0 && (
          <View style={styles.content}>
            <SuggestionsAlert
              count={suggestions.length}
              onPress={handleViewSuggestions}
            />
          </View>
        )}

        <EmptyState
          icon="wallet-outline"
          title="No Subscriptions Yet"
          message="Connect your bank account to automatically detect subscriptions, or add them manually."
          actionLabel="Connect Bank Account"
          onActionPress={handleConnectBank}
        />

        <View style={styles.content}>
          <QuickActionsCard
            onAddSubscription={handleAddSubscription}
            onConnectBank={handleConnectBank}
            onViewRecommendations={handleViewRecommendations}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header with Greeting */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {getGreeting()}
        </Text>
        <Text style={styles.subtitle}>{getCurrentDate()}</Text>
      </View>

      {/* Suggestions Alert */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <SuggestionsAlert
            count={suggestions.length}
            onPress={handleViewSuggestions}
          />
        </View>
      )}

      {/* Hero Spending Card - The Crown Jewel */}
      <HeroSpendCard />

      {/* Quick Insights Row - 3 Glanceable Metrics */}
      <QuickInsights />

      {/* Upcoming Section - Bills & Releases */}
      <UpcomingSection />

      {/* Services Section - All Subscriptions with Value Indicators */}
      <ServicesSection />

      {/* Continue Watching Section */}
      <ContinueWatchingSection />

      {/* Picked For You Section - Recommendations Preview */}
      <PickedForYouSection />

      {/* Bottom Padding */}
      <View style={styles.bottomPadding} />

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        feature="subscriptions"
        limit={3}
        current={totalActive}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f', // Dark background
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    fontWeight: '500',
  },
  suggestionsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  content: {
    paddingHorizontal: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
