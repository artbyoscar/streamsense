import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { createLinkToken } from '@/services/plaid';

interface PlaidConnectionScreenProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const PlaidConnectionScreen: React.FC<PlaidConnectionScreenProps> = ({
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    initializePlaid();
  }, []);

  const initializePlaid = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await createLinkToken();
      console.log('[PlaidScreen] Got link token:', token?.substring(0, 20) + '...');
      setLinkToken(token);
    } catch (err: any) {
      console.error('[PlaidScreen] Error:', err);
      setError(err.message || 'Failed to initialize Plaid');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectBank = () => {
    // Show informative message about Plaid SDK compatibility
    Alert.alert(
      'Plaid SDK Not Available',
      'The Plaid Link SDK is not compatible with Expo SDK 54. Your Plaid backend is working correctly (link token generated successfully).\n\n' +
      'Options:\n' +
      '• Use manual subscription entry for now\n' +
      '• Wait for an updated Plaid SDK\n' +
      '• Eject to bare workflow (advanced)\n\n' +
      'Your subscriptions can still be tracked manually!',
      [
        { text: 'Use Manual Entry', onPress: onClose },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Connect Your Bank
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Info Cards */}
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
              We will automatically detect recurring subscription charges
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
        <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2' }]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={initializePlaid}>
            <Text style={[styles.retryText, { color: colors.primary }]}>
              Tap to retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {linkToken && !loading && !error && (
        <View style={[styles.successContainer, { backgroundColor: '#D1FAE5' }]}>
          <MaterialCommunityIcons name="check-circle" size={20} color="#059669" />
          <Text style={styles.successText}>
            Plaid API connected successfully!
          </Text>
        </View>
      )}

      {/* SDK Notice */}
      <View style={[styles.noticeCard, { backgroundColor: '#FEF3C7' }]}>
        <MaterialCommunityIcons name="information" size={20} color="#D97706" />
        <Text style={[styles.noticeText, { color: '#92400E' }]}>
          The Plaid Link SDK is not yet compatible with Expo SDK 54.
          Use manual subscription entry for now.
        </Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={[styles.connectButton, { backgroundColor: colors.primary }]}
        onPress={handleConnectBank}
        disabled={loading}
      >
        <MaterialCommunityIcons name="bank" size={20} color="#FFFFFF" />
        <Text style={styles.connectButtonText}>
          {loading ? 'Initializing...' : 'Learn More'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.skipButton, { borderColor: colors.border }]}
        onPress={onClose}
      >
        <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
          Use Manual Entry Instead
        </Text>
      </TouchableOpacity>

      {/* Test credentials for reference */}
      <View style={[styles.testInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.testInfoTitle, { color: colors.primary }]}>
          💡 Test Credentials (for future use)
        </Text>
        <Text style={[styles.testInfoText, { color: colors.textSecondary }]}>
          Institution: First Platypus Bank
        </Text>
        <Text style={[styles.testInfoText, { color: colors.textSecondary }]}>
          Username: user_good | Password: pass_good
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
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
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 8,
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
    marginBottom: 16,
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  noticeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  noticeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    lineHeight: 18,
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
});

export default PlaidConnectionScreen;
