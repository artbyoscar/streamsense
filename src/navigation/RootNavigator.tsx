import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '@/features/auth';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OnboardingNavigator } from '@/features/onboarding';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils';

/**
 * Root Navigator
 * Handles app-level navigation and authentication flow
 * Shows AuthNavigator for unauthenticated users
 * Shows OnboardingNavigator for authenticated users who haven't completed onboarding
 * Shows MainNavigator for authenticated users who have completed onboarding
 */
export const RootNavigator: React.FC = () => {
  const { user, isAuthenticated, isInitialized } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Initialize RevenueCat when user is authenticated
  useRevenueCat();

  // Fetch user profile to check onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isAuthenticated || !user?.id) {
        setOnboardingCompleted(null);
        setIsLoadingProfile(false);
        return;
      }

      try {
        setIsLoadingProfile(true);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (error) {
          logger.error('[RootNavigator] Error fetching profile:', error);
          // Default to showing onboarding if we can't fetch the status
          setOnboardingCompleted(false);
        } else {
          setOnboardingCompleted(profile?.onboarding_completed ?? false);
        }
      } catch (error) {
        logger.error('[RootNavigator] Error checking onboarding status:', error);
        setOnboardingCompleted(false);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    checkOnboardingStatus();
  }, [isAuthenticated, user?.id]);

  // Show loading screen while initializing
  if (!isInitialized || (isAuthenticated && isLoadingProfile)) {
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
  logger.debug('[RootNavigator] Navigation state', {
    isAuthenticated,
    isInitialized,
    onboardingCompleted,
  });

  // Determine which navigator to show
  const getNavigator = () => {
    if (!isAuthenticated) {
      return <AuthNavigator />;
    }

    if (onboardingCompleted === false) {
      return <OnboardingNavigator />;
    }

    return <MainNavigator />;
  };

  return (
    <NavigationContainer
      onStateChange={state => {
        logger.debug('[RootNavigator] Navigation state changed', state);
      }}
    >
      {getNavigator()}
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
