import { enableScreens } from 'react-native-screens';
enableScreens(false);

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { RegisterScreen } from './src/features/auth/screens/RegisterScreen';
import { ToastProvider } from './src/components/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAuthStore } from './src/features/auth/store/authStore';
import Constants from 'expo-constants';

const queryClient = new QueryClient();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563EB',
  },
};

const Stack = createStackNavigator();

function AppContent() {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    console.log('[App] Checking Supabase config...');
    const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    console.log('[App] Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('[App] Supabase Anon Key:', supabaseKey ? 'SET' : 'NOT SET');

    console.log('[App] Starting auth initialization...');
    initialize().then(() => {
      console.log('[App] Auth initialization completed');
    });
  }, [initialize]);

  console.log(`[App] Rendering - isLoading: ${isLoading} isInitialized: ${isInitialized}`);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
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
