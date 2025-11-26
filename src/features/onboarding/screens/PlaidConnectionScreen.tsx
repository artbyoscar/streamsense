/**
 * Plaid Connection Screen
 * Allows users to connect their bank accounts for automatic subscription detection
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import {
  PlaidLink,
  LinkSuccess,
  LinkExit,
  LinkLogLevel,
} from 'react-native-plaid-link-sdk';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, COLORS } from '@/components';
import { useAuthStore } from '@/store/authStore';
import {
  createLinkToken,
  exchangePublicToken,
  syncTransactions,
  getPlaidErrorMessage,
  isPlaidErrorRecoverable,
} from '@/services/plaid';

export const PlaidConnectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Plaid Link
  const initializePlaidLink = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await createLinkToken(user.id);
      setLinkToken(token);
    } catch (err: any) {
      console.error('Error creating link token:', err);
      setError(getPlaidErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Handle successful connection
  const handleSuccess = useCallback(
    async (success: LinkSuccess) => {
      setIsLoading(true);

      try {
        // Exchange public token for access token
        const result = await exchangePublicToken(success.publicToken, success.metadata);

        // Sync initial transactions
        if (result.plaidItem) {
          await syncTransactions(result.plaidItem.id);
        }

        // Show success message
        Alert.alert(
          'Bank Connected!',
          `Successfully connected to ${success.metadata.institution?.name}. We're now syncing your transactions to detect subscriptions.`,
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to next screen or dashboard
                navigation.goBack();
              },
            },
          ]
        );
      } catch (err: any) {
        console.error('Error exchanging token:', err);
        Alert.alert(
          'Connection Error',
          getPlaidErrorMessage(err),
          [
            {
              text: 'Try Again',
              onPress: initializePlaidLink,
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      } finally {
        setIsLoading(false);
      }
    },
    [navigation, initializePlaidLink]
  );

  // Handle exit/error
  const handleExit = useCallback(
    (exit: LinkExit) => {
      if (exit.error) {
        console.error('Plaid Link error:', exit.error);
        const errorMessage = getPlaidErrorMessage(exit.error);

        if (isPlaidErrorRecoverable(exit.error)) {
          Alert.alert(
            'Connection Failed',
            errorMessage,
            [
              {
                text: 'Try Again',
                onPress: initializePlaidLink,
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
            ]
          );
        } else {
          setError(errorMessage);
        }
      }
    },
    [initializePlaidLink]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Connect Your Bank</Text>
        <Text style={styles.subtitle}>
          Securely link your bank account to automatically detect and track your streaming
          subscriptions
        </Text>
      </View>

      <Card style={styles.infoCard}>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>🔒</Text>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Bank-Level Security</Text>
            <Text style={styles.infoDescription}>
              We use Plaid, trusted by thousands of apps, to securely connect to your bank
            </Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>👁️</Text>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Read-Only Access</Text>
            <Text style={styles.infoDescription}>
              We can only view your transactions, never move money or make changes
            </Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>🤖</Text>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Automatic Detection</Text>
            <Text style={styles.infoDescription}>
              We'll automatically detect recurring subscription charges and track them for you
            </Text>
          </View>
        </View>
      </Card>

      {error && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Connecting to your bank...</Text>
        </View>
      ) : linkToken ? (
        <PlaidLink
          tokenConfig={{
            token: linkToken,
            logLevel: LinkLogLevel.ERROR,
          }}
          onSuccess={handleSuccess}
          onExit={handleExit}
        >
          <Button variant="primary" onPress={() => {}} fullWidth>
            Connect Bank Account
          </Button>
        </PlaidLink>
      ) : (
        <Button
          variant="primary"
          onPress={initializePlaidLink}
          fullWidth
          icon="bank"
        >
          Get Started
        </Button>
      )}

      <Button
        variant="outline"
        onPress={() => navigation.goBack()}
        fullWidth
        style={styles.skipButton}
      >
        Skip for Now
      </Button>

      <View style={styles.testInfo}>
        <Text style={styles.testInfoTitle}>Test Credentials (Sandbox)</Text>
        <Text style={styles.testInfoText}>Username: user_good</Text>
        <Text style={styles.testInfoText}>Password: pass_good</Text>
        <Text style={styles.testInfoNote}>
          Use these credentials to test the connection in sandbox mode
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
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    lineHeight: 24,
  },
  infoCard: {
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  errorCard: {
    marginBottom: 16,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
  },
  skipButton: {
    marginTop: 12,
  },
  testInfo: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  testInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  testInfoText: {
    fontSize: 13,
    color: '#92400E',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  testInfoNote: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
