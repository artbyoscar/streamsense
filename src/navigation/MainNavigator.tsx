/**
 * Tab Navigator with Minimal Test Screens
 * Testing if Tab Navigator itself causes the crash
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

// Minimal test screens - no imports, no hooks, just View and Text
const HomeScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Home Screen</Text>
  </View>
);

const WatchlistScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Watchlist Screen</Text>
  </View>
);

const TipsScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Tips Screen</Text>
  </View>
);

const SettingsScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Settings Screen</Text>
  </View>
);

export const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bookmark" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Tips"
        component={TipsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="lightbulb" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
