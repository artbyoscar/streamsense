/**
 * Dashboard Screen
 * Main dashboard showing subscriptions, spending, and quick actions
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionsData, formatCurrency } from '@/features/subscriptions';
import { syncAllPlaidItems } from '@/services/plaid';
import { COLORS, EmptyState, LoadingScreen, Card } from '@/components';
import { SubscriptionListItem } from '../components/SubscriptionListItem';
import { QuickActionsCard } from '../components/QuickActionsCard';
import { SuggestionsAlert } from '../components/SuggestionsAlert';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Sync transactions from Plaid
      await syncAllPlaidItems();

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
    // TODO: Navigate to add subscription screen
    console.log('Navigate to add subscription');
  };

  const handleConnectBank = () => {
    // TODO: Navigate to Plaid connection screen
    console.log('Navigate to connect bank');
  };

  const handleViewRecommendations = () => {
    // TODO: Navigate to recommendations screen
    console.log('Navigate to recommendations');
  };

  const handleViewSuggestions = () => {
    // TODO: Navigate to suggestions review screen
    console.log('Navigate to suggestions');
  };

  const handleSubscriptionPress = (subscriptionId: string) => {
    // TODO: Navigate to subscription details
    console.log('Navigate to subscription details:', subscriptionId);
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
          <Text style={styles.subtitle}>Start tracking your subscriptions</Text>
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
          <Text style={styles.subtitle}>Here's your subscription overview</Text>
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

        {/* Quick Actions */}
        <QuickActionsCard
          onAddSubscription={handleAddSubscription}
          onConnectBank={handleConnectBank}
          onViewRecommendations={handleViewRecommendations}
        />

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
  bottomPadding: {
    height: 40,
  },
});
