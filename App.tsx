import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { RegisterScreen } from './src/features/auth/screens/RegisterScreen';
import { MainNavigator } from './src/navigation/MainNavigator';
import { ToastProvider } from './src/components/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAuthStore } from './src/features/auth/store/authStore';
import { ThemeProvider, useTheme, getNavigationTheme } from './src/providers/ThemeProvider';
import { initializeExclusions } from './src/services/smartRecommendations';
import { getPileOfShame } from './src/services/pileOfShame';
import { tipsCache } from './src/services/tipsCache';
import { supabase } from './src/config/supabase';

// Suppress non-breaking Fragment index prop warnings
// These come from third-party libraries and don't affect functionality
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Filter out Fragment index prop warnings
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Invalid prop') &&
    args[0].includes('React.Fragment') &&
    args[0].includes('index')
  ) {
    return; // Suppress this specific error
  }
  originalConsoleError.apply(console, args);
};

const queryClient = new QueryClient();

// Auth context for switching between Login/Register
const AuthScreenContext = React.createContext<{
  showRegister: boolean;
  setShowRegister: (show: boolean) => void;
}>({
  showRegister: false,
  setShowRegister: () => { },
});

export const useAuthScreen = () => React.useContext(AuthScreenContext);

/**
 * Preload Tips page data in the background
 * This ensures the Worth Discovering section loads instantly
 */
const preloadTipsData = async (userId: string) => {
  try {
    console.log('[Preload] Starting tips data preload...');

    // Load watchlist IDs for exclusions
    const { data: watchlistItems } = await supabase
      .from('watchlist_items')
      .select('content(tmdb_id)')
      .eq('user_id', userId);

    const watchlistIds = watchlistItems
      ?.filter(item => item.content)
      .map(item => (item.content as any).tmdb_id) || [];

    console.log('[Preload] Fetching blindspots with', watchlistIds.length, 'exclusions');

    // Load blindspots (Worth Discovering)
    const blindspots = await getPileOfShame(userId, 12, watchlistIds);

    // Cache them
    tipsCache.set('blindspots', blindspots);

    console.log('[Preload] Tips data cached:', blindspots.length, 'blindspot items');
  } catch (error) {
    console.warn('[Preload] Failed to preload tips:', error);
    // Don't throw - this is a background operation
  }
};

// Wrapper component that handles Login/Register switching
function AuthFlow() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <AuthScreenContext.Provider value={{ showRegister, setShowRegister }}>
      {showRegister ? <RegisterScreen /> : <LoginScreen />}
    </AuthScreenContext.Provider>
  );
}

function AppContent() {
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    console.log('[App] Starting auth initialization...');
    initialize().then(() => {
      console.log('[App] Auth initialization completed');
    });
  }, [initialize]);

  // Initialize exclusions when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('[App] Initializing exclusions for user:', user.id);
      initializeExclusions(user.id);
    }
  }, [isAuthenticated, user?.id]);

  // Preload Tips page data in background for instant loading
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      preloadTipsData(user.id);
    }
  }, [isAuthenticated, user?.id]);

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="bodyLarge" style={{ marginTop: 16, opacity: 0.7, color: colors.text }}>
          Loading StreamSense...
        </Text>
      </View>
    );
  }

  // Show main app if authenticated
  if (isAuthenticated) {
    return <MainNavigator />;
  }

  // Show auth flow if not authenticated
  return (
    <NavigationContainer theme={getNavigationTheme(isDark)}>
      <AuthFlow />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
