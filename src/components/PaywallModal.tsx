/**
 * Paywall Modal Component
 * Soft paywall shown when free tier limits are reached
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { FeatureKey } from '@/hooks/usePremiumFeature';
import { COLORS, Button } from '@/components';

// ============================================================================
// TYPES
// ============================================================================

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature: FeatureKey;
  limit?: number;
  current?: number;
}

// ============================================================================
// FEATURE MESSAGES
// ============================================================================

const FEATURE_MESSAGES: Record<
  FeatureKey,
  {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    description: string;
    limitMessage: (limit: number, current: number) => string;
  }
> = {
  subscriptions: {
    icon: 'wallet-outline',
    title: 'Subscription Limit Reached',
    description: 'You\'ve reached the free tier limit for tracked subscriptions.',
    limitMessage: (limit, current) =>
      `You have ${current} of ${limit} subscriptions. Upgrade to premium for unlimited tracking.`,
  },
  watchlist: {
    icon: 'bookmark-outline',
    title: 'Watchlist Limit Reached',
    description: 'You\'ve reached the free tier limit for watchlist items.',
    limitMessage: (limit, current) =>
      `You have ${current} of ${limit} items in your watchlist. Upgrade to premium for unlimited items.`,
  },
  recommendations: {
    icon: 'lightbulb-outline',
    title: 'Premium Feature',
    description: 'Advanced recommendations are available with premium.',
    limitMessage: () =>
      'Get AI-powered insights and advanced recommendation types with premium.',
  },
  email_reports: {
    icon: 'email-outline',
    title: 'Premium Feature',
    description: 'Monthly email reports are available with premium.',
    limitMessage: () =>
      'Receive detailed monthly reports about your subscriptions via email with premium.',
  },
};

// ============================================================================
// PREMIUM HIGHLIGHTS
// ============================================================================

const PREMIUM_HIGHLIGHTS = [
  {
    icon: 'infinity' as const,
    text: 'Unlimited subscriptions',
  },
  {
    icon: 'bookmark-multiple' as const,
    text: 'Unlimited watchlist',
  },
  {
    icon: 'chart-box' as const,
    text: 'Advanced analytics',
  },
  {
    icon: 'email-fast' as const,
    text: 'Monthly email reports',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const PaywallModal: React.FC<PaywallModalProps> = ({
  visible,
  onClose,
  onUpgrade,
  feature,
  limit = 0,
  current = 0,
}) => {
  const featureData = FEATURE_MESSAGES[feature];

  if (!featureData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={COLORS.gray} />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={featureData.icon}
                size={64}
                color={COLORS.primary}
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>{featureData.title}</Text>

            {/* Description */}
            <Text style={styles.description}>{featureData.description}</Text>

            {/* Limit Message */}
            <View style={styles.limitCard}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.limitText}>
                {featureData.limitMessage(limit, current)}
              </Text>
            </View>

            {/* Premium Highlights */}
            <View style={styles.highlightsSection}>
              <Text style={styles.highlightsTitle}>Premium Includes:</Text>

              {PREMIUM_HIGHLIGHTS.map((highlight, index) => (
                <View key={index} style={styles.highlightItem}>
                  <MaterialCommunityIcons
                    name={highlight.icon}
                    size={20}
                    color={COLORS.success}
                  />
                  <Text style={styles.highlightText}>{highlight.text}</Text>
                </View>
              ))}
            </View>

            {/* Pricing Preview */}
            <View style={styles.pricingPreview}>
              <Text style={styles.pricingText}>Starting at</Text>
              <View style={styles.pricingRow}>
                <Text style={styles.price}>$4.99</Text>
                <Text style={styles.period}>/month</Text>
              </View>
              <Text style={styles.savingsText}>Save 20% with annual plan</Text>
            </View>

            {/* Upgrade Button */}
            <Button
              mode="contained"
              onPress={onUpgrade}
              style={styles.upgradeButton}
              contentStyle={styles.upgradeButtonContent}
            >
              Upgrade to Premium
            </Button>

            {/* Maybe Later Link */}
            <TouchableOpacity onPress={onClose} style={styles.laterButton}>
              <Text style={styles.laterText}>Maybe Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
  },
  content: {
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  limitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  limitText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 20,
  },
  highlightsSection: {
    width: '100%',
    marginBottom: 24,
  },
  highlightsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 16,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  highlightText: {
    fontSize: 15,
    color: COLORS.darkGray,
  },
  pricingPreview: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: `${COLORS.success}08`,
    borderRadius: 16,
    width: '100%',
    marginBottom: 24,
  },
  pricingText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
  },
  period: {
    fontSize: 16,
    color: COLORS.gray,
    marginLeft: 4,
  },
  savingsText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
    marginTop: 4,
  },
  upgradeButton: {
    width: '100%',
    borderRadius: 12,
  },
  upgradeButtonContent: {
    paddingVertical: 8,
  },
  laterButton: {
    paddingVertical: 16,
  },
  laterText: {
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '600',
  },
});
