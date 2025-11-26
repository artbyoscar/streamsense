import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Main Tab Navigator
 * Bottom tab navigation for authenticated users
 */
export const MainNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#FFFFFF',
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Icon name="view-dashboard" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Subscriptions"
        component={SubscriptionsScreen}
        options={{
          title: 'Subscriptions',
          tabBarIcon: ({ color, size }) => <Icon name="credit-card" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <Icon name="chart-line" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Icon name="account" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Placeholder Screens
 * TODO: Implement full screens for each tab
 */

const DashboardScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text variant="displaySmall" style={styles.title}>
        Dashboard
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Overview of your subscriptions
      </Text>
    </View>
  );
};

const SubscriptionsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text variant="displaySmall" style={styles.title}>
        Subscriptions
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Manage your subscriptions
      </Text>
    </View>
  );
};

const AnalyticsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text variant="displaySmall" style={styles.title}>
        Analytics
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        View your spending insights
      </Text>
    </View>
  );
};

const ProfileScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text variant="displaySmall" style={styles.title}>
        Profile
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Manage your account settings
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    opacity: 0.7,
    textAlign: 'center',
  },
});
