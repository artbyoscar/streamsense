// CRITICAL: Disable screens before any navigator imports to prevent New Architecture conflicts
import { enableScreens } from 'react-native-screens';
enableScreens(false);

/**
 * Main Navigator with Root Stack
 * Root stack wraps tab navigation with globally accessible modal screens
 */

import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native-paper';

// Screens
import { DashboardScreen } from '@/features/dashboard';
import { SubscriptionDetailScreen, SubscriptionFormScreen } from '@/features/subscriptions';
import { WatchlistScreen, ContentSearchScreen } from '@/features/watchlist';
import { RecommendationsScreen } from '@/features/recommendations';
import { SettingsScreen } from '@/features/settings';
import { TestScreen } from '@/screens/TestScreen';

// Services
import { generateRecommendations } from '@/services/recommendations';
import { useSubscriptionsStore } from '@/features/subscriptions';

// Types
import type {
  MainTabParamList,
  DashboardStackParamList,
  WatchlistStackParamList,
  RecommendationsStackParamList,
  SettingsStackParamList,
  RootStackParamList,
} from './types';

// Colors
import { COLORS } from '@/components';
import { useTheme } from '@/providers/ThemeProvider';

const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();
const DashboardStack = createStackNavigator<DashboardStackParamList>();
const WatchlistStack = createStackNavigator<WatchlistStackParamList>();
const RecommendationsStack = createStackNavigator<RecommendationsStackParamList>();
const SettingsStack = createStackNavigator<SettingsStackParamList>();

// ============================================================================
// STACK NAVIGATORS
// ============================================================================

/**
 * Dashboard Stack Navigator
 * Removed SubscriptionForm - now in RootStack
 */
const DashboardStackNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <DashboardStack.Navigator
      screenOptions={{
        detachInactiveScreens: false,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <DashboardStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="SubscriptionDetail"
        component={SubscriptionDetailScreen}
        options={{
          title: 'Subscription Details',
          headerBackTitle: 'Back',
        }}
      />
    </DashboardStack.Navigator>
  );
};

/**
 * Watchlist Stack Navigator
 * Removed ContentSearch - now in RootStack
 */
const WatchlistStackNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <WatchlistStack.Navigator
      screenOptions={{
        detachInactiveScreens: false,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <WatchlistStack.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{
          title: 'My Watchlist',
        }}
      />
    </WatchlistStack.Navigator>
  );
};

/**
 * Recommendations Stack Navigator
 */
const RecommendationsStackNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <RecommendationsStack.Navigator
      screenOptions={{
        detachInactiveScreens: false,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <RecommendationsStack.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{
          title: 'Recommendations',
        }}
      />
    </RecommendationsStack.Navigator>
  );
};

/**
 * Settings Stack Navigator
 */
const SettingsStackNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <SettingsStack.Navigator
      screenOptions={{
        detachInactiveScreens: false,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <SettingsStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
      <SettingsStack.Screen
        name="Test"
        component={TestScreen}
        options={{
          title: 'Test Features',
          headerBackTitle: 'Settings',
        }}
      />
    </SettingsStack.Navigator>
  );
};

// ============================================================================
// CUSTOM TAB BAR BADGE
// ============================================================================

/**
 * Custom badge component with animation
 */
interface TabBarBadgeProps {
  count: number;
}

const TabBarBadge: React.FC<TabBarBadgeProps> = ({ count }) => {
  const [scale] = useState(new Animated.Value(0));

  useEffect(() => {
    if (count > 0) {
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      scale.setValue(0);
    }
  }, [count]);

  if (count === 0) return null;

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          transform: [{ scale }],
        },
      ]}
    >
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </Animated.View>
  );
};

// ============================================================================
// TAB NAVIGATOR
// ============================================================================

/**
 * Tab Navigator Component
 * Bottom tabs with stack navigators for each tab
 */
const TabNavigator: React.FC = () => {
  const { colors } = useTheme();
  const [recommendationCount, setRecommendationCount] = useState(0);
  const subscriptions = useSubscriptionsStore((state) => state.subscriptions);

  // Load recommendation count
  useEffect(() => {
    const loadRecommendationCount = async () => {
      try {
        const recs = await generateRecommendations(subscriptions);
        setRecommendationCount(recs.length);
      } catch (error) {
        console.error('Error loading recommendations:', error);
      }
    };

    if (subscriptions.length > 0) {
      loadRecommendationCount();
    }
  }, [subscriptions]);

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
          borderTopColor: colors.lightGray,
          backgroundColor: colors.white,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStackNavigator}
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
        name="WatchlistTab"
        component={WatchlistStackNavigator}
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
        name="RecommendationsTab"
        component={RecommendationsStackNavigator}
        options={{
          tabBarLabel: 'Tips',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <MaterialCommunityIcons
                name={focused ? 'lightbulb-on' : 'lightbulb-on-outline'}
                color={color}
                size={size}
              />
              {recommendationCount > 0 && <TabBarBadge count={recommendationCount} />}
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
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
};

// ============================================================================
// ROOT STACK NAVIGATOR
// ============================================================================

/**
 * Root Stack Navigator
 * Wraps tab navigator and provides globally accessible modal screens
 */
export const MainNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <RootStack.Navigator
      screenOptions={{
        detachInactiveScreens: false,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      {/* Main Tab Navigator */}
      <RootStack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{
          headerShown: false,
        }}
      />

      {/* Global Modal Screens - Accessible from anywhere */}
      <RootStack.Screen
        name="SubscriptionForm"
        component={SubscriptionFormScreen}
        options={({ route }) => ({
          title: route.params?.subscriptionId ? 'Edit Subscription' : 'Add Subscription',
          presentation: 'modal',
          headerBackTitle: 'Cancel',
        })}
      />

      <RootStack.Screen
        name="ContentSearch"
        component={ContentSearchScreen}
        options={{
          title: 'Search Content',
          presentation: 'modal',
          headerBackTitle: 'Cancel',
        }}
      />
    </RootStack.Navigator>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
});
