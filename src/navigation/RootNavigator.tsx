import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '@/features/auth';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { logger } from '@/utils';

/**
 * Root Navigator
 * Handles app-level navigation and authentication flow
 * Shows AuthNavigator for unauthenticated users, MainNavigator for authenticated users
 */
export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isInitialized } = useAuth();

  // Show loading screen while initializing authentication
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6750A4" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading StreamSense...
        </Text>
      </View>
    );
  }

  // Log navigation state for debugging
  logger.debug('[RootNavigator] Auth state', {
    isAuthenticated,
    isInitialized,
  });

  return (
    <NavigationContainer
      onStateChange={state => {
        logger.debug('[RootNavigator] Navigation state changed', state);
      }}
    >
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
});
