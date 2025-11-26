import { enableScreens } from 'react-native-screens';
enableScreens(false);

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { RegisterScreen } from './src/features/auth/screens/RegisterScreen';
import { DashboardScreen } from './src/features/dashboard/screens/DashboardScreen';
import { WatchlistScreen } from './src/features/watchlist/screens/WatchlistScreen';
import { RecommendationsScreen } from './src/features/recommendations/screens/RecommendationsScreen';
import { SettingsScreen } from './src/features/settings/screens/SettingsScreen';
import { ToastProvider } from './src/components/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAuthStore } from './src/features/auth/store/authStore';
import { ThemeProvider, useTheme, getNavigationTheme } from './src/providers/ThemeProvider';

const queryClient = new QueryClient();

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

// Main app navigator with bottom tabs
function MainNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.card,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'home' : 'home-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{
          tabBarLabel: 'Watchlist',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'bookmark' : 'bookmark-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{
          tabBarLabel: 'Tips',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'lightbulb-on' : 'lightbulb-on-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'cog' : 'cog-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
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
        <ThemeProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
