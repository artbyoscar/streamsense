/**
 * Premium Subscription Screen
 * Displays available subscription packages and allows users to purchase premium
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { PurchasesPackage } from 'react-native-purchases';
import { usePremiumStore, selectAvailablePackages, selectIsLoading } from '../store/premiumStore';
import { COLORS, Card, Button, EmptyState } from '@/components';

// Premium features list
const PREMIUM_FEATURES = [
  {
    icon: 'chart-line' as const,
    title: 'Advanced Analytics',
    description: 'Detailed spending insights and trends',
  },
  {
    icon: 'lightbulb-on' as const,
    title: 'AI Recommendations',
    description: 'Smart suggestions to optimize subscriptions',
  },
  {
    icon: 'shield-check' as const,
    title: 'Priority Support',
    description: 'Get help when you need it',
  },
  {
    icon: 'cloud-sync' as const,
    title: 'Unlimited Sync',
    description: 'Sync unlimited bank accounts',
  },
  {
    icon: 'bell-ring' as const,
    title: 'Smart Alerts',
    description: 'Custom notifications for renewals',
  },
  {
    icon: 'export-variant' as const,
    title: 'Export Data',
    description: 'Download your subscription history',
  },
];

/**
 * Package Card Component
 */
interface PackageCardProps {
  package: PurchasesPackage;
  onPress: () => void;
  isLoading: boolean;
}

const PackageCard: React.FC<PackageCardProps> = ({ package: pkg, onPress, isLoading }) => {
  const isPopular = pkg.packageType === 'ANNUAL';

  return (
    <TouchableOpacity
      style={[styles.packageCard, isPopular && styles.packageCardPopular]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}

      <View style={styles.packageContent}>
        <Text style={styles.packageTitle}>
          {pkg.product.title.replace('(StreamSense)', '').trim()}
        </Text>

        <View style={styles.packagePricing}>
          <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
          <Text style={styles.packagePeriod}>
            /{pkg.packageType === 'ANNUAL' ? 'year' : 'month'}
          </Text>
        </View>

        {pkg.product.introPrice && (
          <Text style={styles.packageIntro}>
            {pkg.product.introPrice.priceString} for{' '}
            {pkg.product.introPrice.periodNumberOfUnits}{' '}
            {pkg.product.introPrice.periodUnit}
          </Text>
        )}

        <Button
          mode="contained"
          onPress={onPress}
          disabled={isLoading}
          loading={isLoading}
          style={styles.packageButton}
        >
          Subscribe
        </Button>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Main Premium Screen
 */
export const PremiumScreen: React.FC = () => {
  const {
    isPremium,
    loadOfferings,
    purchaseSubscription,
    restoreSubscriptions,
    checkStatus,
    expirationDate,
    productIdentifier,
  } = usePremiumStore();

  const packages = usePremiumStore(selectAvailablePackages);
  const isLoading = usePremiumStore(selectIsLoading);

  // Load offerings on mount
  useEffect(() => {
    loadOfferings();
    checkStatus();
  }, []);

  // Handle purchase
  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      await purchaseSubscription(pkg);
      Alert.alert(
        'Success! 🎉',
        'You now have access to all premium features!',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      if (error.message !== 'Purchase cancelled') {
        Alert.alert('Purchase Failed', 'Please try again or contact support.');
      }
    }
  };

  // Handle restore
  const handleRestore = async () => {
    try {
      await restoreSubscriptions();
      Alert.alert('Success', 'Your purchases have been restored!');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    }
  };

  // Show premium status if already premium
  if (isPremium) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Premium Badge */}
        <View style={styles.premiumHeader}>
          <MaterialCommunityIcons name="crown" size={64} color={COLORS.warning} />
          <Text style={styles.premiumTitle}>Premium Member</Text>
          <Text style={styles.premiumSubtitle}>
            You have access to all premium features!
          </Text>

          {expirationDate && (
            <Text style={styles.premiumExpiry}>
              Expires: {new Date(expirationDate).toLocaleDateString()}
            </Text>
          )}

          {productIdentifier && (
            <Text style={styles.premiumPlan}>Plan: {productIdentifier}</Text>
          )}
        </View>

        {/* Features List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Premium Features</Text>

          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <MaterialCommunityIcons
                  name={feature.icon}
                  size={24}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
            </View>
          ))}
        </View>

        {/* Manage Subscription */}
        <View style={styles.section}>
          <Button mode="outlined" onPress={handleRestore} style={styles.restoreButton}>
            Restore Purchases
          </Button>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="crown-outline" size={48} color={COLORS.primary} />
        <Text style={styles.title}>Upgrade to Premium</Text>
        <Text style={styles.subtitle}>
          Unlock powerful features to take control of your subscriptions
        </Text>
      </View>

      {/* Features List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What's Included</Text>

        {PREMIUM_FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <MaterialCommunityIcons
                name={feature.icon}
                size={24}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Subscription Packages */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose Your Plan</Text>

        {isLoading && packages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading subscription plans...</Text>
          </View>
        ) : packages.length > 0 ? (
          packages.map((pkg) => (
            <PackageCard
              key={pkg.identifier}
              package={pkg}
              onPress={() => handlePurchase(pkg)}
              isLoading={isLoading}
            />
          ))
        ) : (
          <EmptyState
            icon="alert-circle-outline"
            title="No Plans Available"
            message="Subscription plans are not available at the moment. Please try again later."
          />
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleRestore}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Subscriptions auto-renew unless cancelled.
        </Text>
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 32,
    backgroundColor: COLORS.primary + '10',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.gray,
  },
  packageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  packageCardPopular: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  packageContent: {
    alignItems: 'center',
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  packagePricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
  },
  packagePeriod: {
    fontSize: 16,
    color: COLORS.gray,
    marginLeft: 4,
  },
  packageIntro: {
    fontSize: 14,
    color: COLORS.success,
    marginBottom: 16,
  },
  packageButton: {
    width: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.gray,
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 20,
    marginTop: 32,
    alignItems: 'center',
  },
  restoreText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
  premiumHeader: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 32,
    backgroundColor: COLORS.warning + '10',
  },
  premiumTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginTop: 16,
    marginBottom: 8,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 16,
  },
  premiumExpiry: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  premiumPlan: {
    fontSize: 14,
    color: COLORS.gray,
  },
  restoreButton: {
    marginTop: 8,
  },
});
