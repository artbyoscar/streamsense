import { enableScreens } from 'react-native-screens';
enableScreens(false);

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { RegisterScreen } from './src/features/auth/screens/RegisterScreen';
import { ToastProvider } from './src/components/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAuthStore } from './src/features/auth/store/authStore';
import Constants from 'expo-constants';
import { supabase } from './src/config/supabase';

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

  useEffect(() => {
    console.log('[App] Checking Supabase config...');
    const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    console.log('[App] Supabase URL from extra:', supabaseUrl);
    console.log('[App] Supabase Anon Key:', supabaseKey ? 'SET (length: ' + supabaseKey.length + ')' : 'NOT SET');

    // Also check process.env directly
    console.log('[App] process.env.EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);

    // Test Supabase connection
    const testConnection = async () => {
      try {
        console.log('[App] Testing Supabase connection...');
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[App] Supabase connection error:', error.message);
        } else {
          console.log('[App] Supabase connection successful!');
        }
      } catch (e: any) {
        console.error('[App] Supabase connection failed:', e.message || e);
      }
    };

    console.log('[App] Starting auth initialization...');
    initialize().then(() => {
      console.log('[App] Auth initialization completed');
      testConnection();
    });
  }, [initialize]);

  console.log(`[App] Rendering - isLoading: ${isLoading} isInitialized: ${isInitialized}`);

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
