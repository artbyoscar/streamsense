import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppProviders } from './src/providers';
import { RootNavigator } from './src/navigation';
import { ErrorBoundary, ToastProvider, OfflineBanner } from './src/components';
import { markAppStart } from './src/utils';
import { initializeSentry } from './src/services/sentry';

// Initialize Sentry as early as possible
initializeSentry();

/**
 * StreamSense App
 * Subscription tracking application with authentication and navigation
 */
export default function App() {
  useEffect(() => {
    // Mark app startup for performance tracking
    markAppStart();
  }, []);

  return (
    <ErrorBoundary>
      <AppProviders>
        <ToastProvider>
          <StatusBar style="auto" />
          <OfflineBanner />
          <RootNavigator />
        </ToastProvider>
      </AppProviders>
    </ErrorBoundary>
  );
}
