import { enableScreens } from 'react-native-screens';
enableScreens(false);

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, LogBox } from 'react-native';
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

// Suppress Fragment warning (likely from third-party library)
LogBox.ignoreLogs(['Invalid prop `index` supplied to `React.Fragment`']);

const queryClient = new QueryClient();

// Auth context for switching between Login/Register
const AuthScreenContext = React.createContext<{
  showRegister: boolean;
  setShowRegister: (show: boolean) => void;
}>({
  showRegister: false,
  setShowRegister: () => {},
});

export const useAuthScreen = () => React.useContext(AuthScreenContext);

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
  const { colors, isDark } = useTheme();

  useEffect(() => {
    console.log('[App] Starting auth initialization...');
    initialize().then(() => {
      console.log('[App] Auth initialization completed');
    });
  }, [initialize]);

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
    return (
      <NavigationContainer theme={getNavigationTheme(isDark)}>
        <MainNavigator />
      </NavigationContainer>
    );
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
