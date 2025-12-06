/**
 * Settings Screen
 * User preferences, account management, and app settings
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { usePremiumStore } from '@/features/premium';
import { COLORS, Card } from '@/components';
import { useTheme } from '@/providers/ThemeProvider';
import { useCustomNavigation } from '@/navigation/NavigationContext';
import { backfillWatchlistMetadata } from '@/utils/backfillWatchlistMetadata';
import { dnaComputationQueue } from '@/services/dnaComputationQueue';
import { contentDNAService } from '@/services/contentDNA';
import { recommendationOrchestrator } from '@/services/recommendationOrchestrator';

// ============================================================================
// TYPES
// ============================================================================

type SettingItemProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle?: string;
  value?: string;
  showChevron?: boolean;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  onPress?: () => void;
  badge?: string;
  badgeColor?: string;
  destructive?: boolean;
};

// ============================================================================
// SETTING ITEM COMPONENT
// ============================================================================

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  value,
  showChevron = true,
  showSwitch = false,
  switchValue = false,
  onSwitchChange,
  onPress,
  badge,
  badgeColor,
  destructive = false,
}) => {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress && !showSwitch}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingItemLeft}>
        <View
          style={[
            styles.settingIcon,
            destructive && styles.settingIconDestructive,
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={destructive ? COLORS.error : COLORS.primary}
          />
        </View>

        <View style={styles.settingItemText}>
          <Text
            style={[
              styles.settingTitle,
              destructive && styles.settingTitleDestructive,
            ]}
          >
            {title}
          </Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.settingItemRight}>
        {badge && (
          <View
            style={[
              styles.badge,
              badgeColor && { backgroundColor: badgeColor },
            ]}
          >
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}

        {value && <Text style={styles.settingValue}>{value}</Text>}

        {showSwitch && (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: COLORS.lightGray, true: COLORS.primary + '80' }}
            thumbColor={switchValue ? COLORS.primary : COLORS.gray}
          />
        )}

        {showChevron && !showSwitch && (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={COLORS.gray}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

// ============================================================================
// MAIN SETTINGS SCREEN
// ============================================================================

export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { isPremium, expirationDate } = usePremiumStore();
  const { themeMode, setThemeMode, colors } = useTheme();
  const { navigateToScreen } = useCustomNavigation();

  // Preferences state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [renewalReminders, setRenewalReminders] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [emailReports, setEmailReports] = useState(isPremium);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  // Developer state
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [dnaStatus, setDnaStatus] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [isBuildingDNA, setIsBuildingDNA] = useState(false);
  const [isBuildingProfile, setIsBuildingProfile] = useState(false);

  // Get user info
  const userName = user?.user_metadata?.first_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
    : user?.email || 'User';
  const userEmail = user?.email || '';

  // Handlers
  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing will be implemented soon.');
  };

  const handleManageSubscription = () => {
    if (isPremium) {
      Alert.alert(
        'Manage Subscription',
        'You can manage your subscription in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              // Open device subscription settings
              Linking.openURL('app-settings:');
            },
          },
        ]
      );
    } else {
      // Navigate to upgrade screen
      Alert.alert('Upgrade to Premium', 'Navigate to premium upgrade screen.');
    }
  };

  const handleConnectedBanks = () => {
    Alert.alert('Connected Banks', 'Bank connection management will be implemented soon.');
  };

  const handleAddBank = () => {
    Alert.alert('Add Bank', 'Plaid integration will open here.');
  };

  const handleCurrencySelect = () => {
    Alert.alert(
      'Select Currency',
      'Currency selection',
      [
        { text: 'USD ($)', onPress: () => setSelectedCurrency('USD') },
        { text: 'EUR (€)', onPress: () => setSelectedCurrency('EUR') },
        { text: 'GBP (£)', onPress: () => setSelectedCurrency('GBP') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleThemeSelect = () => {
    Alert.alert(
      'Select Theme',
      'Choose your preferred theme',
      [
        { text: 'Light', onPress: () => setThemeMode('light') },
        { text: 'Dark', onPress: () => setThemeMode('dark') },
        { text: 'System', onPress: () => setThemeMode('system') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleHelpCenter = () => {
    Linking.openURL('https://streamsense.app/help');
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@streamsense.app');
  };

  const handleRateApp = () => {
    // Open app store rating
    Alert.alert('Rate App', 'Would you like to rate StreamSense?', [
      { text: 'Not Now', style: 'cancel' },
      {
        text: 'Rate',
        onPress: () => {
          // Open App Store or Play Store
          Linking.openURL('https://apps.apple.com/app/streamsense');
        },
      },
    ]);
  };

  const handleShareApp = () => {
    Alert.alert('Share StreamSense', 'Share this app with your friends!');
    // Implement share functionality
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://streamsense.app/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://streamsense.app/terms');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Type DELETE to confirm account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm',
                  style: 'destructive',
                  onPress: async () => {
                    // Implement account deletion
                    Alert.alert('Account Deleted', 'Your account has been deleted.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Handler to populate Content DNA
  const handleBuildContentDNA = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    Alert.alert(
      'Build Content DNA',
      'This will analyze all your watchlist items to build deep content profiles. This improves recommendations and may take 1-2 minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Analysis',
          onPress: async () => {
            setIsBuildingDNA(true);
            setDnaStatus('Scanning watchlist...');

            try {
              // Scan watchlist and queue items for DNA computation
              await dnaComputationQueue.scanWatchlistForMissingDNA(user.id);

              // Check queue status
              const status = dnaComputationQueue.getStatus();

              if (status.queueSize === 0) {
                setDnaStatus('All items already analyzed!');
                Alert.alert('DNA Analysis', 'All your watchlist items already have DNA profiles!');
                setTimeout(() => {
                  setDnaStatus(null);
                  setIsBuildingDNA(false);
                }, 2000);
                return;
              }

              setDnaStatus(`Processing ${status.queueSize} items...`);

              // Poll for completion
              const checkProgress = setInterval(() => {
                const current = dnaComputationQueue.getStatus();
                const remaining = current.queueSize + current.processing;

                if (remaining === 0) {
                  clearInterval(checkProgress);
                  setDnaStatus('DNA computation complete!');
                  Alert.alert(
                    'Analysis Complete',
                    'Content DNA profiles have been built for your watchlist. Your recommendations are now smarter!'
                  );
                  setTimeout(() => {
                    setDnaStatus(null);
                    setIsBuildingDNA(false);
                  }, 2000);
                } else {
                  setDnaStatus(`Processing... ${remaining} remaining`);
                }
              }, 2000);

            } catch (error) {
              console.error('[Settings] DNA build error:', error);
              setDnaStatus('Error - check console');
              Alert.alert('Error', 'Failed to build DNA. Check console for details.');
              setTimeout(() => {
                setDnaStatus(null);
                setIsBuildingDNA(false);
              }, 3000);
            }
          },
        },
      ]
    );
  };

  // Handler to build/update Taste Profile
  const handleBuildTasteProfile = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    Alert.alert(
      'Build Taste Profile',
      'This will analyze your viewing history to create your personalized taste profile. This may take 30-60 seconds.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Build Profile',
          onPress: async () => {
            setIsBuildingProfile(true);
            setProfileStatus('Analyzing watch history...');

            try {
              const profile = await contentDNAService.buildUserTasteProfile(user.id);

              if (profile) {
                setProfileStatus(`Profile built: ${profile.tasteSignature || 'Complete'}`);
                Alert.alert(
                  'Profile Built!',
                  `Taste Signature: ${profile.tasteSignature}\n\nSample Size: ${profile.sampleSize} items\nConfidence: ${Math.round(profile.confidence * 100)}%${
                    profile.discoveryOpportunities.length > 0
                      ? `\n\nDiscovery Opportunities:\n• ${profile.discoveryOpportunities.slice(0, 3).join('\n• ')}`
                      : ''
                  }`
                );
              } else {
                setProfileStatus('Could not build profile');
                Alert.alert(
                  'Profile Not Built',
                  'Not enough data to build a taste profile. Add more items to your watchlist and mark them as watched.'
                );
              }

              setTimeout(() => {
                setProfileStatus(null);
                setIsBuildingProfile(false);
              }, 3000);
            } catch (error) {
              console.error('[Settings] Profile build error:', error);
              setProfileStatus('Error - check console');
              Alert.alert('Error', 'Failed to build profile. Check console for details.');
              setTimeout(() => {
                setProfileStatus(null);
                setIsBuildingProfile(false);
              }, 3000);
            }
          },
        },
      ]
    );
  };

  const handleBackfill = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    Alert.alert(
      'Backfill Watchlist Metadata',
      'This will fetch metadata for all watchlist items that show "Unknown". This may take 30-60 seconds.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Backfill',
          onPress: async () => {
            setIsBackfilling(true);
            try {
              console.log('[Settings] Starting backfill...');
              const result = await backfillWatchlistMetadata(user.id);

              if (result.success) {
                Alert.alert(
                  'Backfill Complete',
                  `Successfully updated ${result.updated} items.\n${result.failed > 0 ? `Failed: ${result.failed}` : 'No failures.'}`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Backfill Failed', 'An error occurred during backfill. Check console for details.');
              }
            } catch (error) {
              console.error('[Settings] Backfill error:', error);
              Alert.alert('Backfill Failed', 'An error occurred. Check console for details.');
            } finally {
              setIsBackfilling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      {/* Account Section */}
      <SectionHeader title="Account" />
      <Card style={styles.card}>
        <SettingItem
          icon="account-circle"
          title={userName}
          subtitle={userEmail}
          onPress={handleEditProfile}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="crown"
          title="Subscription Status"
          subtitle={
            isPremium
              ? `Premium • Expires ${expirationDate ? new Date(expirationDate).toLocaleDateString() : ''}`
              : 'Free Plan'
          }
          badge={isPremium ? 'PREMIUM' : 'FREE'}
          badgeColor={isPremium ? COLORS.warning : COLORS.gray}
          onPress={handleManageSubscription}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="bank"
          title="Connected Banks"
          subtitle="0 banks connected"
          onPress={handleConnectedBanks}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="plus-circle"
          title="Add Bank Account"
          subtitle="Connect via Plaid"
          onPress={handleAddBank}
        />
      </Card>

      {/* Preferences Section */}
      <SectionHeader title="Preferences" />
      <Card style={styles.card}>
        <SettingItem
          icon="bell"
          title="Push Notifications"
          subtitle="Receive app notifications"
          showSwitch
          switchValue={notificationsEnabled}
          onSwitchChange={setNotificationsEnabled}
          showChevron={false}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="calendar-alert"
          title="Renewal Reminders"
          subtitle="Get notified before renewals"
          showSwitch
          switchValue={renewalReminders}
          onSwitchChange={setRenewalReminders}
          showChevron={false}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="alert-circle"
          title="Price Alerts"
          subtitle="Notify when prices change"
          showSwitch
          switchValue={priceAlerts}
          onSwitchChange={setPriceAlerts}
          showChevron={false}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="email"
          title="Monthly Email Reports"
          subtitle={isPremium ? 'Receive monthly summaries' : 'Premium feature'}
          showSwitch
          switchValue={emailReports}
          onSwitchChange={setEmailReports}
          showChevron={false}
          badge={!isPremium ? 'PREMIUM' : undefined}
          badgeColor={COLORS.warning}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="currency-usd"
          title="Currency"
          value={selectedCurrency}
          onPress={handleCurrencySelect}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="theme-light-dark"
          title="Theme"
          value={themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
          onPress={handleThemeSelect}
        />
      </Card>

      {/* Developer Section (Only in Development) */}
      {__DEV__ && (
        <>
          <SectionHeader title="Developer" />
          <Card style={styles.card}>
            <SettingItem
              icon="bug"
              title="Debug Recommendations"
              subtitle="Test and validate recommendation intelligence"
              onPress={() => navigateToScreen('DebugRecommendations')}
            />

            <View style={styles.divider} />

            <SettingItem
              icon="test-tube"
              title="Test Features"
              subtitle="Test error handling, performance, and Sentry"
              onPress={() => Alert.alert('Test Features', 'Test features coming soon!')}
            />

            <View style={styles.divider} />

            <SettingItem
              icon="dna"
              title={isBuildingDNA ? 'Building Content DNA...' : 'Build Content DNA'}
              subtitle={dnaStatus || 'Analyze content for smarter recommendations'}
              onPress={isBuildingDNA ? undefined : handleBuildContentDNA}
              showChevron={!isBuildingDNA}
              badge={isBuildingDNA ? 'RUNNING' : undefined}
              badgeColor={COLORS.warning}
            />

            <View style={styles.divider} />

            <SettingItem
              icon="brain"
              title={isBuildingProfile ? 'Building Taste Profile...' : 'Build Taste Profile'}
              subtitle={profileStatus || 'Create your personalized taste signature'}
              onPress={isBuildingProfile ? undefined : handleBuildTasteProfile}
              showChevron={!isBuildingProfile}
              badge={isBuildingProfile ? 'RUNNING' : undefined}
              badgeColor={COLORS.warning}
            />

            <View style={styles.divider} />

            <SettingItem
              icon="database-refresh"
              title={isBackfilling ? 'Backfilling Metadata...' : 'Fix Unknown Watchlist Titles'}
              subtitle={isBackfilling ? 'Please wait, this may take 30-60 seconds' : 'Fetch metadata for items showing "Unknown"'}
              onPress={isBackfilling ? undefined : handleBackfill}
              showChevron={!isBackfilling}
              badge={isBackfilling ? 'RUNNING' : undefined}
              badgeColor={COLORS.warning}
            />
          </Card>
        </>
      )}

      {/* Support Section */}
      <SectionHeader title="Support" />
      <Card style={styles.card}>
        <SettingItem
          icon="help-circle"
          title="Help Center"
          subtitle="Get answers to common questions"
          onPress={handleHelpCenter}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="email-outline"
          title="Contact Support"
          subtitle="support@streamsense.app"
          onPress={handleContactSupport}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="star"
          title="Rate App"
          subtitle="Enjoying StreamSense? Leave a review"
          onPress={handleRateApp}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="share-variant"
          title="Share App"
          subtitle="Share with friends and family"
          onPress={handleShareApp}
        />
      </Card>

      {/* Legal Section */}
      <SectionHeader title="Legal" />
      <Card style={styles.card}>
        <SettingItem
          icon="shield-lock"
          title="Privacy Policy"
          onPress={handlePrivacyPolicy}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="file-document"
          title="Terms of Service"
          onPress={handleTermsOfService}
        />
      </Card>

      {/* Account Actions */}
      <Card style={styles.card}>
        <SettingItem
          icon="logout"
          title="Logout"
          onPress={handleLogout}
        />

        <View style={styles.divider} />

        <SettingItem
          icon="delete"
          title="Delete Account"
          subtitle="Permanently delete your account"
          destructive
          onPress={handleDeleteAccount}
        />
      </Card>

      {/* App Version */}
      <Text style={styles.versionText}>
        StreamSense v1.0.0
      </Text>

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
  },
  contentContainer: {
    paddingTop: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingIconDestructive: {
    backgroundColor: `${COLORS.error}15`,
  },
  settingItemText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 2,
  },
  settingTitleDestructive: {
    color: COLORS.error,
  },
  settingSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 15,
    color: COLORS.gray,
  },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginLeft: 64,
  },
  versionText: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
