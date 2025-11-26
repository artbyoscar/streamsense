/**
 * Plaid Connection Screen - Step 2 of Onboarding
 * Explain bank connection benefits and connect bank
 */

import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, Button } from '@/components';

interface PlaidConnectionOnboardingScreenProps {
  onConnect: () => void;
  onSkip: () => void;
}

const BENEFITS = [
  {
    icon: 'auto-fix' as const,
    title: 'Automatic Detection',
    description: 'We\'ll automatically find all your streaming subscriptions from your bank transactions',
  },
  {
    icon: 'clock-fast' as const,
    title: 'Save Time',
    description: 'No need to manually enter each subscription - we do the work for you',
  },
  {
    icon: 'lock-check' as const,
    title: 'Bank-Level Security',
    description: 'Your data is encrypted and we never store your bank credentials',
  },
  {
    icon: 'sync' as const,
    title: 'Stay Up to Date',
    description: 'Subscriptions are automatically synced when prices change or services are added',
  },
];

export const PlaidConnectionOnboardingScreen: React.FC<PlaidConnectionOnboardingScreenProps> = ({
  onConnect,
  onSkip,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect();
    } catch (error) {
      Alert.alert('Connection Failed', 'Please try again or skip for now.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="bank-check" size={56} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Connect Your Bank</Text>
        <Text style={styles.subtitle}>
          Securely link your bank account to automatically track your subscriptions
        </Text>
      </View>

      {/* Benefits */}
      <View style={styles.benefitsSection}>
        {BENEFITS.map((benefit, index) => (
          <View key={index} style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <MaterialCommunityIcons
                name={benefit.icon}
                size={24}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDescription}>{benefit.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Security Note */}
      <View style={styles.securityNote}>
        <MaterialCommunityIcons name="shield-check" size={20} color={COLORS.success} />
        <Text style={styles.securityText}>
          Powered by Plaid - Trusted by millions of users and apps
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleConnect}
          loading={isConnecting}
          disabled={isConnecting}
          style={styles.connectButton}
          contentStyle={styles.buttonContent}
        >
          Connect Bank Account
        </Button>

        <Button
          mode="text"
          onPress={onSkip}
          disabled={isConnecting}
          style={styles.skipButton}
        >
          Skip for Now
        </Button>
      </View>

      {/* Privacy Note */}
      <Text style={styles.privacyNote}>
        We'll never share your data or make charges without your permission
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
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
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  benefitsSection: {
    paddingHorizontal: 24,
    gap: 20,
    marginBottom: 24,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  securityText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  connectButton: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  skipButton: {
    borderRadius: 12,
  },
  privacyNote: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 20,
    lineHeight: 18,
  },
});
