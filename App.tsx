import { StatusBar } from 'expo-status-bar';
import { AppProviders } from './src/providers';
import { RootNavigator } from './src/navigation';
import { ErrorBoundary, ToastProvider, OfflineBanner } from './src/components';

/**
 * StreamSense App
 * Subscription tracking application with authentication and navigation
 */
export default function App() {
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
