import { StatusBar } from 'expo-status-bar';
import { AppProviders } from './src/providers';
import { RootNavigator } from './src/navigation';

/**
 * StreamSense App
 * Subscription tracking application with authentication and navigation
 */
export default function App() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <RootNavigator />
    </AppProviders>
  );
}
