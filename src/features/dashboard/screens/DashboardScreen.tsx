/**
 * Dashboard Screen
 * Main dashboard showing subscriptions, spending, and quick actions
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useCustomNavigation } from '@/navigation/NavigationContext';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionsData, formatCurrency, useUpcomingRenewals } from '@/features/subscriptions';
import { useWatchlistStore } from '@/features/watchlist';
import { generateRecommendations } from '@/services/recommendations';
import { getPosterUrl } from '@/services/tmdb';
import { syncAllPlaidItems } from '@/services/plaid';
import { isFeatureEnabled } from '@/config/env';
import { COLORS, EmptyState, LoadingScreen, Card, PaywallModal } from '@/components';
import { usePremiumFeature } from '@/hooks/usePremiumFeature';
import { SubscriptionListItem } from '../components/SubscriptionListItem';
import { QuickActionsCard } from '../components/QuickActionsCard';
import { SuggestionsAlert } from '../components/SuggestionsAlert';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const DashboardScreen: React.FC = () => {
  const { setActiveTab, navigateToScreen } = useCustomNavigation();
  const user = useAuthStore((state) => state.user);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [potentialSavings, setPotentialSavings] = useState(0);

  // Premium feature check
  const { canAddSubscription, isPremium } = usePremiumFeature();

  const {
    subscriptions,
    activeSubscriptions,
    suggestions,
    monthlySpend,
    annualSpend,
    totalActive,
    isLoading,
    error,
    refetch,
  } = useSubscriptionsData();

  // Get upcoming renewals (next 14 days)
  const { data: upcomingRenewals14 } = useUpcomingRenewals(14);

  // Watchlist data
  const watchlist = useWatchlistStore((state) => state.watchlist) as any[];
  const getWatchlistCount = useWatchlistStore((state) => state.getWatchlistCount);
  const fetchWatchlist = useWatchlistStore((state) => state.fetchWatchlist);

  // Load watchlist on mount
  useEffect(() => {
    fetchWatchlist().catch(console.error);
  }, []);

  // Calculate potential savings from recommendations
  useEffect(() => {
    const calculateSavings = async () => {
      if (activeSubscriptions.length > 0) {
        try {
          const recommendations = await generateRecommendations(activeSubscriptions);
          const totalSavings = recommendations.reduce((sum, rec) => {
            return sum + (rec.potentialSavings || 0);
          }, 0);
          setPotentialSavings(totalSavings);
        } catch (error) {
          console.error('Error calculating savings:', error);
        }
      }
    };
    calculateSavings();
  }, [activeSubscriptions]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Sync transactions from Plaid (only if configured)
      if (isFeatureEnabled('plaid')) {
        await syncAllPlaidItems();
      }

      // Refetch subscriptions
      await refetch();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

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
    Alert.alert(
      'Coming Soon',
      'Bank connection will be available once Plaid approval is received.',
      [{ text: 'OK' }]
    );
  };

  const handleViewRecommendations = () => {
    setActiveTab('Tips');
  };

  const handleViewSuggestions = () => {
    setActiveTab('Tips');
  };

  const handleSubscriptionPress = (subscriptionId: string) => {
    navigateToScreen('SubscriptionForm', { subscriptionId });
  };

  const handleFindContent = () => {
    setActiveTab('Watchlist');
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get user's first name
  const getUserFirstName = () => {
    if (user?.user_metadata?.first_name) {
      return user.user_metadata.first_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'there';
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

  // Format renewal date
  const formatRenewalDate = (date: string) => {
    const renewalDate = new Date(date);
    const now = new Date();
    const diffTime = renewalDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;

    return renewalDate.toLocaleDateString('en-US', {
      month: 'short',
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
            {getGreeting()}, {getUserFirstName()}!
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
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>
            {getGreeting()}, {getUserFirstName()}!
          </Text>
          <Text style={styles.subtitle}>{getCurrentDate()}</Text>
        </View>
      </View>

      {/* Monthly Spending Card */}
      <Card style={styles.spendingCard}>
        <View style={styles.spendingContent}>
          <View style={styles.spendingLeft}>
            <Text style={styles.spendingLabel}>Monthly Spending</Text>
            <Text style={styles.spendingAmount}>{formatCurrency(monthlySpend)}</Text>
            <Text style={styles.spendingSubtext}>
              {formatCurrency(annualSpend)}/year • {totalActive} active
            </Text>
            {upcomingRenewals14 && upcomingRenewals14.length > 0 && (
              <Text style={styles.nextRenewal}>
                Next: {upcomingRenewals14[0].serviceName} {formatRenewalDate(upcomingRenewals14[0].nextBillingDate)}
              </Text>
            )}
          </View>
          <View style={styles.spendingIcon}>
            <Image
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' }}
              style={styles.walletIcon}
            />
          </View>
        </View>
      </Card>

      <View style={styles.content}>
        {/* Suggestions Alert */}
        {suggestions.length > 0 && (
          <SuggestionsAlert
            count={suggestions.length}
            onPress={handleViewSuggestions}
          />
        )}

        {/* Quick Stats Row */}
        <View style={styles.quickStatsRow}>
          <Card style={styles.quickStatCard}>
            <MaterialCommunityIcons name="bookmark-outline" size={24} color={COLORS.primary} />
            <Text style={styles.quickStatValue}>{getWatchlistCount()}</Text>
            <Text style={styles.quickStatLabel}>Watchlist</Text>
          </Card>
          <Card style={styles.quickStatCard}>
            <MaterialCommunityIcons name="currency-usd" size={24} color={COLORS.success} />
            <Text style={styles.quickStatValue}>{formatCurrency(potentialSavings)}</Text>
            <Text style={styles.quickStatLabel}>Potential Savings</Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <Card style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleAddSubscription}>
              <MaterialCommunityIcons name="plus-circle" size={32} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Add Subscription</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleConnectBank}>
              <MaterialCommunityIcons name="bank" size={32} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Connect Bank</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleFindContent}>
              <MaterialCommunityIcons name="movie-search" size={32} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Find to Watch</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Upcoming Renewals Section */}
        {upcomingRenewals14 && upcomingRenewals14.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Renewals</Text>
              <Text style={styles.sectionCount}>{upcomingRenewals14.length}</Text>
            </View>
            {upcomingRenewals14.slice(0, 5).map((renewal) => (
              <TouchableOpacity
                key={renewal.subscriptionId}
                style={styles.renewalItem}
                onPress={() => handleSubscriptionPress(renewal.subscriptionId)}
              >
                <View style={styles.renewalLeft}>
                  <Text style={styles.renewalService}>{renewal.serviceName}</Text>
                  <Text style={styles.renewalDate}>
                    Renews {formatRenewalDate(renewal.nextBillingDate)}
                  </Text>
                </View>
                <Text style={styles.renewalPrice}>{formatCurrency(renewal.price)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Watchlist */}
        {watchlist.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Watchlist</Text>
              <TouchableOpacity onPress={() => setActiveTab('Watchlist')}>
                <Text style={styles.seeAllLink}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.watchlistScroll}>
              {watchlist.slice(0, 5).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.watchlistItem}
                  onPress={() => setActiveTab('Watchlist')}
                >
                  {item.content?.poster_path ? (
                    <Image
                      source={{ uri: getPosterUrl(item.content.poster_path, 'small') || '' }}
                      style={styles.watchlistPoster}
                    />
                  ) : (
                    <View style={[styles.watchlistPoster, styles.watchlistPlaceholder]}>
                      <MaterialCommunityIcons name="movie" size={32} color={COLORS.gray} />
                    </View>
                  )}
                  <Text style={styles.watchlistTitle} numberOfLines={2}>
                    {item.content?.title || 'Unknown'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Subscriptions List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Subscriptions</Text>
            <Text style={styles.sectionCount}>{activeSubscriptions.length}</Text>
          </View>

          {activeSubscriptions.map((subscription) => (
            <SubscriptionListItem
              key={subscription.id}
              subscription={subscription}
              onPress={() => handleSubscriptionPress(subscription.id)}
            />
          ))}
        </View>

        {/* Show cancelled subscriptions if any */}
        {subscriptions.filter((s) => s.status === 'cancelled').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cancelled</Text>
            {subscriptions
              .filter((s) => s.status === 'cancelled')
              .map((subscription) => (
                <SubscriptionListItem
                  key={subscription.id}
                  subscription={subscription}
                  onPress={() => handleSubscriptionPress(subscription.id)}
                />
              ))}
          </View>
        )}

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </View>

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
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greetingContainer: {
    marginBottom: 0,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.white + 'CC',
  },
  spendingCard: {
    marginHorizontal: 20,
    marginTop: -32,
    marginBottom: 20,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  spendingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spendingLeft: {
    flex: 1,
  },
  spendingLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 6,
    fontWeight: '500',
  },
  spendingAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  spendingSubtext: {
    fontSize: 13,
    color: COLORS.gray,
  },
  nextRenewal: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 6,
    fontWeight: '600',
  },
  spendingIcon: {
    marginLeft: 16,
  },
  walletIcon: {
    width: 64,
    height: 64,
    opacity: 0.3,
  },
  content: {
    paddingHorizontal: 20,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  quickActionsCard: {
    marginBottom: 24,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkGray,
  },
  sectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray,
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  renewalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  renewalLeft: {
    flex: 1,
  },
  renewalService: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  renewalDate: {
    fontSize: 13,
    color: COLORS.gray,
  },
  renewalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  watchlistScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  watchlistItem: {
    width: 100,
    marginRight: 12,
  },
  watchlistPoster: {
    width: 100,
    height: 150,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  watchlistPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchlistTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginTop: 6,
    lineHeight: 16,
  },
  bottomPadding: {
    height: 40,
  },
});
