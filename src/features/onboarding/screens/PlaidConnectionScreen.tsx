/**
 * Plaid Connection Screen
 * Full implementation using Plaid Link SDK
 * Requires development build
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PlaidLink, LinkSuccess, LinkExit } from '@burstware/expo-plaid-link';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/features/auth';
import { createLinkToken, exchangePublicToken } from '@/services/plaid';

interface PlaidConnectionScreenProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}

export const PlaidConnectionScreen: React.FC<PlaidConnectionScreenProps> = ({
  onSuccess,
  onCancel,
  onError,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    initializePlaid();
  }, []);

  const initializePlaid = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[PlaidScreen] Initializing for user:', user.id);
      const token = await createLinkToken(user.id);
      console.log('[PlaidScreen] Got link token:', token?.substring(0, 20) + '...');
      setLinkToken(token);
    } catch (err: any) {
      console.error('[PlaidScreen] Error:', err);
      const errorMessage = err.message || 'Failed to initialize Plaid';
      setError(errorMessage);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectBank = async () => {
    if (!linkToken) {
      Alert.alert('Error', 'Plaid not initialized. Please try again.');
      return;
    }

    try {
      // Open Plaid Link
      PlaidLink.open({
        token: linkToken,
        onSuccess: handlePlaidSuccess,
        onExit: handlePlaidExit,
      });
    } catch (error) {
      console.error('[PlaidScreen] Error opening Plaid Link:', error);
      Alert.alert('Error', 'Failed to open Plaid Link. Please try again.');
    }
  };

  const handlePlaidSuccess = async (success: LinkSuccess) => {
    console.log('[PlaidScreen] Plaid success:', success);

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setLoading(true);

      // Exchange public token for access token
      await exchangePublicToken(success.publicToken, success.metadata);

      Alert.alert(
        'Success',
        'Your bank account has been connected successfully!',
        [{ text: 'OK', onPress: () => onSuccess?.() }]
      );
    } catch (error: any) {
      console.error('[PlaidScreen] Error exchanging token:', error);
      Alert.alert('Error', error.message || 'Failed to complete bank connection');
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaidExit = (exit: LinkExit) => {
    console.log('[PlaidScreen] Plaid exit:', exit);

    if (exit.error) {
      console.error('[PlaidScreen] Plaid error:', exit.error);
      Alert.alert('Error', exit.error.displayMessage || 'Failed to connect bank account');
      onError?.(new Error(exit.error.errorMessage));
    } else {
      // User closed Plaid without completing
      console.log('[PlaidScreen] User cancelled Plaid Link');
    }
  };

  const handleClose = () => {
    onCancel?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Connect Your Bank
        </Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <View style={styles.infoRow}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="lock" size={24} color="#D97706" />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Bank-Level Security
              </Text>
              <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
                We use Plaid, trusted by thousands of apps, to securely connect to your bank
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
              <MaterialCommunityIcons name="eye" size={24} color="#2563EB" />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Read-Only Access
              </Text>
              <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
                We can only view your transactions, never move money or make changes
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconContainer, { backgroundColor: '#FCE7F3' }]}>
              <MaterialCommunityIcons name="magnify" size={24} color="#DB2777" />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Automatic Detection
              </Text>
              <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
                We'll automatically detect recurring subscription charges and track them for you
              </Text>
            </View>
          </View>
        </View>

        {/* Status */}
        {loading && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              Initializing secure connection...
            </Text>
          </View>
        )}

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={initializePlaid} style={styles.retryButton}>
              <Text style={[styles.retryText, { color: colors.primary }]}>
                Tap to retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {linkToken && !loading && !error && (
          <View style={[styles.successContainer, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#059669" />
            <Text style={styles.successText}>
              Ready to connect your bank!
            </Text>
          </View>
        )}
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.connectButton,
            {
              backgroundColor: loading ? colors.border : colors.primary,
              opacity: loading ? 0.6 : 1,
            }
          ]}
          onPress={handleConnectBank}
          disabled={loading}
        >
          <MaterialCommunityIcons name="bank" size={20} color="#FFFFFF" />
          <Text style={styles.connectButtonText}>
            {loading ? 'Initializing...' : 'Get Started'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.skipButton, { borderColor: colors.border }]}
          onPress={handleClose}
        >
          <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
            Skip for Now
          </Text>
        </TouchableOpacity>

        {/* Test credentials info */}
        <View style={[styles.testInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.testInfoTitle, { color: colors.primary }]}>
            💡 Test Credentials (Sandbox)
          </Text>
          <Text style={[styles.testInfoText, { color: colors.textSecondary }]}>
            Institution: First Platypus Bank
          </Text>
          <Text style={[styles.testInfoText, { color: colors.textSecondary }]}>
            Username: user_good
          </Text>
          <Text style={[styles.testInfoText, { color: colors.textSecondary }]}>
            Password: pass_good
          </Text>
          <Text style={[styles.testInfoNote, { color: colors.textSecondary }]}>
            (These work in dev builds only)
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 12,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 20,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  skipButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  skipButtonText: {
    fontSize: 16,
  },
  testInfo: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  testInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  testInfoText: {
    fontSize: 13,
    marginBottom: 2,
  },
  testInfoNote: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default PlaidConnectionScreen;
