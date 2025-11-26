import { enableScreens } from 'react-native-screens';
enableScreens(false);

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
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

function AppContent() {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    // Debug: Check if Supabase env vars are loaded
    console.log('[App] Checking Supabase config...');
    try {
      const { env } = require('./src/config/env');
      console.log('[App] Supabase URL:', env.supabase.url ? 'SET' : 'MISSING');
      console.log('[App] Supabase Anon Key:', env.supabase.anonKey ? 'SET' : 'MISSING');
    } catch (error) {
      console.error('[App] Error loading env config:', error);
    }

    console.log('[App] Starting auth initialization...');
    console.log('[App] Before init - isLoading:', isLoading, 'isInitialized:', isInitialized);

    initialize().then(() => {
      console.log('[App] Auth initialization completed');
      const state = useAuthStore.getState();
      console.log('[App] After init - isLoading:', state.isLoading, 'isInitialized:', state.isInitialized);
    }).catch((error) => {
      console.error('[App] Auth initialization failed:', error);
    });
  }, [initialize]);

  console.log('[App] Rendering - isLoading:', isLoading, 'isInitialized:', isInitialized);

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Login" component={LoginScreen} />
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
