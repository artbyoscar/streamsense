/**
 * Premium Upgrade Screen
 * Beautiful upgrade screen highlighting premium benefits with pricing options
 */

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { PurchasesPackage } from 'react-native-purchases';
import { usePremiumStore, selectAvailablePackages } from '../store/premiumStore';
import { COLORS, Button } from '@/components';

// ============================================================================
// CONSTANTS
// ============================================================================

const PREMIUM_BENEFITS = [
  {
    icon: 'infinity' as const,
    title: 'Unlimited Subscriptions',
    description: 'Track as many subscriptions as you need without limits',
    color: COLORS.primary,
  },
  {
    icon: 'chart-box' as const,
    title: 'Advanced Analytics',
    description: 'Get deep insights into your spending patterns and trends',
    color: '#2196F3',
  },
  {
    icon: 'headset' as const,
    title: 'Priority Support',
    description: 'Get help faster with dedicated priority customer support',
    color: '#4CAF50',
  },
  {
    icon: 'shimmer' as const,
    title: 'Ad-Free Experience',
    description: 'Enjoy a clean, distraction-free interface',
    color: '#FF9800',
  },
];

const ANNUAL_MONTHLY_PRICE = 4.99;
const MONTHLY_PRICE = 4.99;
const ANNUAL_PRICE = 47.99;
const ANNUAL_SAVINGS = ((MONTHLY_PRICE * 12) - ANNUAL_PRICE).toFixed(2);
const SAVINGS_PERCENTAGE = Math.round(((MONTHLY_PRICE * 12 - ANNUAL_PRICE) / (MONTHLY_PRICE * 12)) * 100);

// ============================================================================
// PRICING CARD COMPONENT
// ============================================================================

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  description: string;
  isPopular?: boolean;
  savings?: string;
  onPress: () => void;
  isLoading: boolean;
  isSelected: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({
  title,
  price,
  period,
  description,
  isPopular,
  savings,
  onPress,
  isLoading,
  isSelected,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.pricingCard,
        isPopular && styles.pricingCardPopular,
        isSelected && styles.pricingCardSelected,
      ]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isPopular && (
        <View style={styles.popularBadge}>
          <MaterialCommunityIcons name="star" size={14} color={COLORS.white} />
          <Text style={styles.popularBadgeText}>BEST VALUE</Text>
        </View>
      )}

      {savings && (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsBadgeText}>Save {savings}</Text>
        </View>
      )}

      <View style={styles.pricingCardContent}>
        <Text style={styles.pricingTitle}>{title}</Text>

        <View style={styles.pricingRow}>
          <Text style={styles.pricingPrice}>${price}</Text>
          <Text style={styles.pricingPeriod}>/{period}</Text>
        </View>

        <Text style={styles.pricingDescription}>{description}</Text>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.primary} />
            <Text style={styles.selectedText}>Selected</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// BENEFIT ITEM COMPONENT
// ============================================================================

interface BenefitItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  color: string;
  delay?: number;
}

const BenefitItem: React.FC<BenefitItemProps> = ({
  icon,
  title,
  description,
  color,
}) => {
  return (
    <View style={styles.benefitItem}>
      <View style={[styles.benefitIconContainer, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={28} color={color} />
      </View>
      <View style={styles.benefitContent}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDescription}>{description}</Text>
      </View>
    </View>
  );
};

// ============================================================================
// MAIN UPGRADE SCREEN
// ============================================================================

export const UpgradeScreen: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  const {
    loadOfferings,
    purchaseSubscription,
    restoreSubscriptions,
    offerings,
    purchaseInProgress,
    restoreInProgress,
    offeringsLoading,
  } = usePremiumStore();

  const packages = usePremiumStore(selectAvailablePackages);

  // Load offerings on mount
  useEffect(() => {
    loadOfferings();
  }, []);

  // Get packages by type
  const monthlyPackage = packages.find(
    (pkg) => pkg.packageType === 'MONTHLY' || pkg.identifier.includes('monthly')
  );
  const annualPackage = packages.find(
    (pkg) => pkg.packageType === 'ANNUAL' || pkg.identifier.includes('annual')
  );

  // Handle purchase
  const handlePurchase = async () => {
    const packageToPurchase = selectedPlan === 'annual' ? annualPackage : monthlyPackage;

    if (!packageToPurchase) {
      Alert.alert('Error', 'Subscription package not available. Please try again later.');
      return;
    }

    try {
      await purchaseSubscription(packageToPurchase);
      Alert.alert(
        'Welcome to Premium! 🎉',
        'You now have access to all premium features. Enjoy!',
        [{ text: 'Get Started', style: 'default' }]
      );
    } catch (error: any) {
      if (error.message !== 'Purchase cancelled') {
        Alert.alert(
          'Purchase Failed',
          'We couldn\'t complete your purchase. Please try again or contact support.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  // Handle restore
  const handleRestore = async () => {
    try {
      await restoreSubscriptions();
      Alert.alert(
        'Purchases Restored',
        'Your previous purchases have been restored successfully!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Restore Failed',
        'We couldn\'t restore your purchases. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle terms/privacy links
  const handleOpenTerms = () => {
    Linking.openURL('https://streamsense.app/terms'); // Replace with actual URL
  };

  const handleOpenPrivacy = () => {
    Linking.openURL('https://streamsense.app/privacy'); // Replace with actual URL
  };

  const isLoading = purchaseInProgress || restoreInProgress || offeringsLoading;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.heroIconContainer}>
          <MaterialCommunityIcons name="crown" size={56} color={COLORS.warning} />
        </View>
        <Text style={styles.heroTitle}>Upgrade to Premium</Text>
        <Text style={styles.heroSubtitle}>
          Take full control of your subscriptions with powerful premium features
        </Text>
      </View>

      {/* Benefits Section */}
      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>Everything You Get</Text>

        {PREMIUM_BENEFITS.map((benefit, index) => (
          <BenefitItem
            key={index}
            icon={benefit.icon}
            title={benefit.title}
            description={benefit.description}
            color={benefit.color}
            delay={index * 100}
          />
        ))}
      </View>

      {/* Pricing Section */}
      <View style={styles.pricingSection}>
        <Text style={styles.sectionTitle}>Choose Your Plan</Text>

        {offeringsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading pricing options...</Text>
          </View>
        ) : (
          <>
            {/* Annual Plan */}
            <PricingCard
              title="Annual"
              price={ANNUAL_PRICE.toString()}
              period="year"
              description={`Just $${ANNUAL_MONTHLY_PRICE.toFixed(2)}/month, billed annually`}
              isPopular
              savings={`${SAVINGS_PERCENTAGE}% • $${ANNUAL_SAVINGS}`}
              onPress={() => setSelectedPlan('annual')}
              isLoading={isLoading}
              isSelected={selectedPlan === 'annual'}
            />

            {/* Monthly Plan */}
            <PricingCard
              title="Monthly"
              price={MONTHLY_PRICE.toFixed(2)}
              period="month"
              description="Billed monthly, cancel anytime"
              onPress={() => setSelectedPlan('monthly')}
              isLoading={isLoading}
              isSelected={selectedPlan === 'monthly'}
            />
          </>
        )}

        {/* Subscribe Button */}
        <Button
          mode="contained"
          onPress={handlePurchase}
          disabled={isLoading || !packages.length}
          loading={purchaseInProgress}
          style={styles.subscribeButton}
          contentStyle={styles.subscribeButtonContent}
        >
          {purchaseInProgress ? 'Processing...' : 'Start Premium'}
        </Button>

        {/* Restore Purchases Link */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoreInProgress}
          style={styles.restoreButton}
        >
          {restoreInProgress ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.restoreText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Subscriptions auto-renew unless cancelled at least 24 hours before the end of the
          current period.
        </Text>

        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleOpenTerms}>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}>•</Text>
          <TouchableOpacity onPress={handleOpenPrivacy}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 40,
  },

  // Hero Section
  hero: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: `${COLORS.primary}08`,
  },
  heroIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${COLORS.warning}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.darkGray,
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 17,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },

  // Benefits Section
  benefitsSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  benefitIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  benefitContent: {
    flex: 1,
    paddingTop: 4,
  },
  benefitTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 15,
    color: COLORS.gray,
    lineHeight: 21,
  },

  // Pricing Section
  pricingSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  pricingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pricingCardPopular: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}03`,
  },
  pricingCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  popularBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  savingsBadge: {
    position: 'absolute',
    top: -12,
    right: 24,
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  savingsBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  pricingCardContent: {
    alignItems: 'flex-start',
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  pricingPeriod: {
    fontSize: 18,
    color: COLORS.gray,
    marginLeft: 4,
  },
  pricingDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.gray,
    fontSize: 14,
  },
  subscribeButton: {
    marginTop: 24,
    borderRadius: 16,
  },
  subscribeButtonContent: {
    paddingVertical: 8,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  restoreText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  footerSeparator: {
    fontSize: 13,
    color: COLORS.gray,
  },

  bottomPadding: {
    height: 20,
  },
});
