import { enableScreens } from 'react-native-screens';
enableScreens(false);

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme, Text, Button } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { RegisterScreen } from './src/features/auth/screens/RegisterScreen';
import { ToastProvider } from './src/components/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAuthStore } from './src/features/auth/store/authStore';

const queryClient = new QueryClient();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563EB',
  },
};

const Tab = createBottomTabNavigator();

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
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    console.log('[App] Starting auth initialization...');
    initialize().then(() => {
      console.log('[App] Auth initialization completed');
    });
  }, [initialize]);

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text variant="bodyLarge" style={{ marginTop: 16, opacity: 0.7 }}>
          Loading StreamSense...
        </Text>
      </View>
    );
  }

  // Show main app if authenticated
  if (isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFFFFF' }}>
        <Text variant="displaySmall" style={{ fontWeight: 'bold', marginBottom: 10 }}>
          Welcome to StreamSense!
        </Text>
        <Text variant="bodyLarge" style={{ marginBottom: 20, opacity: 0.7 }}>
          Logged in as: {user?.email}
        </Text>
        <Button mode="contained" onPress={logout}>
          Logout
        </Button>
      </View>
    );
  }

  // Show auth flow if not authenticated
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
        <Tab.Screen name="Auth" component={AuthFlow} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </PaperProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
