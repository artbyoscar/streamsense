import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';

interface PlaidConnectionScreenProps {
  onClose: () => void;
}

export const PlaidConnectionScreen: React.FC<PlaidConnectionScreenProps> = ({
  onClose,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  console.log('[PlaidScreen] Rendering, onClose exists:', !!onClose);

  const handleClose = () => {
    console.log('[PlaidScreen] Close button pressed');
    if (onClose) {
      onClose();
    } else {
      console.error('[PlaidScreen] onClose is undefined!');
    }
  };

  const handleLearnMore = () => {
    Alert.alert(
      'Plaid SDK Not Available',
      'The Plaid Link SDK is not compatible with Expo SDK 54. Your Plaid backend is configured correctly.\n\nOptions:\n• Use manual subscription entry for now\n• Wait for an updated Plaid SDK\n• Eject to bare workflow (advanced)\n\nYour subscriptions can still be tracked manually!',
      [
        { text: 'Use Manual Entry', onPress: handleClose },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  const handleManualEntry = () => {
    console.log('[PlaidScreen] Manual entry pressed');
    handleClose();
  };

  const features = [
    {
      icon: 'lock-closed',
      title: 'Bank-Level Security',
      description: 'We use Plaid, trusted by thousands of apps, to securely connect to your bank',
      color: '#F59E0B',
    },
    {
      icon: 'eye',
      title: 'Read-Only Access',
      description: 'We can only view your transactions, never move money or make changes',
      color: '#3B82F6',
    },
    {
      icon: 'search',
      title: 'Automatic Detection',
      description: 'We will automatically detect recurring subscription charges',
      color: '#EF4444',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Single Header with proper spacing */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top > 0 ? insets.top + 8 : 20,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Connect Your Bank
        </Text>
        <Pressable
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Feature Cards */}
        <View style={[styles.featuresCard, { backgroundColor: colors.card }]}>
          {features.map((feature, index) => (
            <View key={feature.title} style={styles.featureRow}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: `${feature.color}20` },
                ]}
              >
                <Ionicons
                  name={feature.icon as any}
                  size={24}
                  color={feature.color}
                />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  {feature.title}
                </Text>
                <Text
                  style={[
                    styles.featureDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* SDK Not Available Notice */}
        <View style={[styles.noticeCard, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="information-circle" size={24} color="#D97706" />
          <Text style={styles.noticeText}>
            The Plaid Link SDK is not yet compatible with Expo SDK 54. Use
            manual subscription entry for now.
          </Text>
        </View>

        {/* Learn More Button */}
        <Pressable
          style={[styles.learnMoreButton, { backgroundColor: colors.primary }]}
          onPress={handleLearnMore}
        >
          <Ionicons name="business" size={20} color="#FFFFFF" />
          <Text style={styles.learnMoreText}>Learn More</Text>
        </Pressable>

        {/* Manual Entry Button - THIS MUST WORK */}
        <Pressable
          style={[styles.manualButton, { borderColor: colors.border }]}
          onPress={handleManualEntry}
        >
          <Text style={[styles.manualButtonText, { color: colors.text }]}>
            Use Manual Entry Instead
          </Text>
        </Pressable>

        {/* Test Credentials Info */}
        <View style={[styles.testInfo, { backgroundColor: colors.card }]}>
          <Ionicons name="flask" size={16} color={colors.textSecondary} />
          <Text style={[styles.testInfoText, { color: colors.textSecondary }]}>
            Test credentials for future use:{'\n'}
            Institution: First Platypus Bank{'\n'}
            Username: user_good | Password: pass_good
          </Text>
        </View>
      </ScrollView>
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
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  featuresCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  learnMoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  manualButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  testInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  testInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default PlaidConnectionScreen;
