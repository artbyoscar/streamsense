/**
 * Test Screen for Error Handling, Performance, and Sentry
 *
 * This screen lets you test all the features we've implemented:
 * - Error handling
 * - Loading states
 * - Toast notifications
 * - Network detection
 * - Performance utilities
 * - Sentry integration
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorView } from '@/components/ErrorView';
import {
  SkeletonListItem,
  SkeletonCard,
  SkeletonSubscriptionCard,
  SkeletonDashboard,
} from '@/components/SkeletonLoader';
import { useToast } from '@/components/Toast';
import { OptimizedImage, Avatar, Logo } from '@/components/OptimizedImage';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useDebounce, useRenderPerformance, measurePerformance } from '@/utils/performance';
import {
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  addNavigationBreadcrumb,
  addAPIBreadcrumb,
  addUserActionBreadcrumb,
  isSentryEnabled,
} from '@/services/sentry';
import { useTheme } from '@/providers/ThemeProvider';
import { COLORS } from '@/components/theme';

export const TestScreen = () => {
  const { colors } = useTheme();

  // Track render performance
  useRenderPerformance('TestScreen');

  const toast = useToast();
  const network = useNetworkStatus();

  // State
  const [showError, setShowError] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shouldCrash, setShouldCrash] = useState(false);

  // Debounce search
  const debouncedQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (debouncedQuery) {
      console.log('Debounced search:', debouncedQuery);
    }
  }, [debouncedQuery]);

  // Crash test
  if (shouldCrash) {
    throw new Error('Test crash for ErrorBoundary');
  }

  // Test functions
  const testPerformanceMeasurement = async () => {
    const result = await measurePerformance('testAsyncOperation', async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'Operation completed';
    });
    toast.showSuccess(`Performance test done: ${result}`);
  };

  const testSentryException = () => {
    captureException(new Error('Test Sentry exception'), {
      component: 'TestScreen',
      action: 'testButton',
      customData: { test: true },
    });
    toast.showInfo(`Sentry exception captured (enabled: ${isSentryEnabled()})`);
  };

  const testSentryMessage = () => {
    captureMessage('Test Sentry message', 'info', {
      screen: 'TestScreen',
      timestamp: new Date().toISOString(),
    });
    toast.showInfo(`Sentry message sent (enabled: ${isSentryEnabled()})`);
  };

  const testSentryBreadcrumbs = () => {
    addBreadcrumb({ category: 'test', message: 'Test breadcrumb 1', level: 'info' });
    addNavigationBreadcrumb('TestScreen', 'Settings');
    addAPIBreadcrumb('GET', '/test', 200);
    addUserActionBreadcrumb('click', 'Test Button');
    toast.showSuccess('4 breadcrumbs added');
  };

  const testSentryUserContext = () => {
    setUserContext({
      id: 'test-user-123',
      email: 'test@example.com',
      isPremium: false,
    });
    toast.showSuccess('User context set');
  };

  const testClearUserContext = () => {
    clearUserContext();
    toast.showSuccess('User context cleared');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>StreamSense Testing</Text>
      <Text style={[styles.subtitle, { color: colors.gray }]}>Test error handling, performance, and Sentry</Text>

      {/* Network Status */}
      <Card title="Network Status">
        <View style={styles.networkInfo}>
          <Text style={[styles.infoText, { color: colors.text }]}>
            Connected: {network.isConnected ? '✅' : '❌'}
          </Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            Internet: {network.isInternetReachable ? '✅' : '❌'}
          </Text>
          <Text style={[styles.infoText, { color: colors.text }]}>Type: {network.type || 'Unknown'}</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            Offline: {network.isOffline ? '⚠️ Yes' : '✅ No'}
          </Text>
        </View>
      </Card>

      {/* Error Handling Tests */}
      <Card title="Error Handling">
        <View style={styles.buttonGroup}>
          <Button onPress={() => setShowError(!showError)}>
            Toggle Error View
          </Button>

          {showError && (
            <ErrorView
              title="Test Error"
              message="This is a test error message with retry functionality"
              onRetry={() => setShowError(false)}
            />
          )}

          <Button onPress={() => setShouldCrash(true)} variant="danger">
            Trigger Crash (ErrorBoundary)
          </Button>
        </View>
      </Card>

      {/* Toast Tests */}
      <Card title="Toast Notifications">
        <View style={styles.buttonGroup}>
          <Button onPress={() => toast.showSuccess('Success message!')}>
            Show Success
          </Button>
          <Button onPress={() => toast.showError('Error message!')}>
            Show Error
          </Button>
          <Button onPress={() => toast.showWarning('Warning message!')}>
            Show Warning
          </Button>
          <Button onPress={() => toast.showInfo('Info message!')}>
            Show Info
          </Button>
        </View>
      </Card>

      {/* Skeleton Loaders */}
      <Card title="Loading States">
        <View style={styles.buttonGroup}>
          <Button onPress={() => setShowSkeletons(!showSkeletons)}>
            Toggle Skeletons
          </Button>

          {showSkeletons && (
            <View style={styles.skeletonContainer}>
              <SkeletonListItem />
              <SkeletonCard />
              <SkeletonSubscriptionCard />
            </View>
          )}
        </View>
      </Card>

      {/* Image Optimization Tests */}
      <Card title="Optimized Images">
        <View style={styles.imageContainer}>
          <OptimizedImage
            source={{ uri: 'https://picsum.photos/200' }}
            width={100}
            height={100}
            borderRadius={8}
          />

          <Avatar
            source={{ uri: 'https://i.pravatar.cc/150?img=1' }}
            name="John Doe"
            size={48}
          />

          <Avatar name="Test User" size={48} />

          <Logo
            source={{ uri: 'https://logo.clearbit.com/netflix.com' }}
            name="Netflix"
            size={40}
          />
        </View>
        <Text style={[styles.helpText, { color: colors.gray }]}>
          Images use expo-image with memory+disk caching
        </Text>
      </Card>

      {/* Performance Tests */}
      <Card title="Performance Utilities">
        <View style={styles.buttonGroup}>
          <Button onPress={testPerformanceMeasurement}>
            Test Performance Measurement (1s)
          </Button>
          <Text style={[styles.helpText, { color: colors.gray }]}>
            Check console for: [Performance] testAsyncOperation: 1000ms
          </Text>
        </View>
      </Card>

      {/* Sentry Tests */}
      <Card title="Sentry Integration">
        <View style={styles.buttonGroup}>
          <Text style={[styles.infoText, { color: colors.text }]}>
            Sentry Status: {isSentryEnabled() ? '✅ Enabled' : '⚠️ Disabled (Dev Mode)'}
          </Text>

          <Button onPress={testSentryException}>
            Capture Exception
          </Button>

          <Button onPress={testSentryMessage}>
            Capture Message
          </Button>

          <Button onPress={testSentryBreadcrumbs}>
            Add Breadcrumbs
          </Button>

          <Button onPress={testSentryUserContext}>
            Set User Context
          </Button>

          <Button onPress={testClearUserContext}>
            Clear User Context
          </Button>

          <Text style={[styles.helpText, { color: colors.gray }]}>
            Note: Sentry only sends events in production builds. In development, check
            console logs.
          </Text>
        </View>
      </Card>

      {/* Instructions */}
      <Card title="Testing Tips">
        <View style={styles.tipsContainer}>
          <Text style={[styles.tipText, { color: colors.text }]}>• Turn on Airplane Mode to test offline banner</Text>
          <Text style={[styles.tipText, { color: colors.text }]}>• Check console for performance measurements</Text>
          <Text style={[styles.tipText, { color: colors.text }]}>• Use React DevTools Profiler for render tracking</Text>
          <Text style={[styles.tipText, { color: colors.text }]}>
            • Create production build to test Sentry fully
          </Text>
          <Text style={[styles.tipText, { color: colors.text }]}>
            • Check docs/TESTING_GUIDE.md for detailed instructions
          </Text>
        </View>
      </Card>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    padding: 16,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  buttonGroup: {
    gap: 12,
  },
  networkInfo: {
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
  },
  skeletonContainer: {
    gap: 12,
    marginTop: 8,
  },
  imageContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
    fontStyle: 'italic',
  },
  tipsContainer: {
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  spacer: {
    height: 32,
  },
});
