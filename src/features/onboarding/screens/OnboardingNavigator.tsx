/**
 * Onboarding Navigator
 * Manages the 4-step onboarding flow with progress indicator
 */

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/components';
import { WelcomeScreen } from './WelcomeScreen';
import { PlaidConnectionOnboardingScreen } from './PlaidConnectionOnboardingScreen';
import { SubscriptionReviewScreen } from './SubscriptionReviewScreen';
import { FirstInsightsScreen } from './FirstInsightsScreen';
import { useAuth } from '@/features/auth';
import { supabase } from '@/config/supabase';

// ============================================================================
// TYPES
// ============================================================================

type OnboardingStep = 'welcome' | 'plaid' | 'subscriptions' | 'insights';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

// ============================================================================
// PROGRESS INDICATOR COMPONENT
// ============================================================================

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, totalSteps }) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  );
};

// ============================================================================
// BACK BUTTON COMPONENT
// ============================================================================

interface BackButtonProps {
  onPress: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({ onPress }) => {
  return (
    <View style={styles.backButtonContainer}>
      <MaterialCommunityIcons
        name="chevron-left"
        size={28}
        color={COLORS.darkGray}
        onPress={onPress}
        style={styles.backButton}
      />
    </View>
  );
};

// ============================================================================
// MAIN ONBOARDING NAVIGATOR
// ============================================================================

export const OnboardingNavigator: React.FC = () => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<string[]>([]);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<
    Array<{ id: string; service_name: string; price: number }>
  >([]);

  // Step mapping for progress indicator
  const stepNumbers: Record<OnboardingStep, number> = {
    welcome: 1,
    plaid: 2,
    subscriptions: 3,
    insights: 4,
  };

  const currentStepNumber = stepNumbers[currentStep];
  const totalSteps = 4;

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================

  const handleGetStarted = () => {
    setCurrentStep('plaid');
  };

  const handleConnectBank = () => {
    // TODO: Implement Plaid connection flow
    // For now, just move to next step
    setCurrentStep('subscriptions');
  };

  const handleSkipPlaid = () => {
    setCurrentStep('subscriptions');
  };

  const handleSubscriptionsReview = async (selectedIds: string[]) => {
    setSelectedSubscriptionIds(selectedIds);

    // If subscriptions were selected, confirm them in the database
    // and fetch their details for the insights screen
    if (selectedIds.length > 0) {
      try {
        // Fetch the selected subscriptions to pass to insights screen
        const { data: subscriptions, error } = await supabase
          .from('user_subscriptions')
          .select('id, service_name, price')
          .in('id', selectedIds)
          .eq('user_id', user?.id);

        if (error) {
          console.error('Error fetching subscriptions:', error);
        } else if (subscriptions) {
          setSelectedSubscriptions(subscriptions);
        }

        // Update subscription status to active (they were suggested)
        await supabase
          .from('user_subscriptions')
          .update({ status: 'active' })
          .in('id', selectedIds)
          .eq('user_id', user?.id);
      } catch (error) {
        console.error('Error processing subscriptions:', error);
      }
    }

    setCurrentStep('insights');
  };

  const handleAddManualSubscription = () => {
    // TODO: Navigate to subscription form
    // For now, just show alert
    console.log('Add manual subscription');
  };

  const handleFinishOnboarding = async () => {
    try {
      // Mark onboarding as completed in the user's profile
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user?.id);

      if (error) {
        console.error('Error marking onboarding complete:', error);
      }

      // Navigation will automatically handle this via RootNavigator
      // which checks onboarding_completed status
    } catch (error) {
      console.error('Error finishing onboarding:', error);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'plaid':
        setCurrentStep('welcome');
        break;
      case 'subscriptions':
        setCurrentStep('plaid');
        break;
      case 'insights':
        setCurrentStep('subscriptions');
        break;
      default:
        break;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const showBackButton = currentStep !== 'welcome';
  const showProgress = currentStep !== 'welcome';

  return (
    <View style={styles.container}>
      {/* Header with Back Button and Progress */}
      {(showBackButton || showProgress) && (
        <View style={styles.header}>
          {showBackButton ? (
            <BackButton onPress={handleBack} />
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}

          {showProgress && (
            <ProgressIndicator currentStep={currentStepNumber} totalSteps={totalSteps} />
          )}
        </View>
      )}

      {/* Step Screens */}
      <View style={styles.content}>
        {currentStep === 'welcome' && <WelcomeScreen onGetStarted={handleGetStarted} />}

        {currentStep === 'plaid' && (
          <PlaidConnectionOnboardingScreen
            onConnect={handleConnectBank}
            onSkip={handleSkipPlaid}
          />
        )}

        {currentStep === 'subscriptions' && (
          <SubscriptionReviewScreen
            onContinue={handleSubscriptionsReview}
            onAddManual={handleAddManualSubscription}
          />
        )}

        {currentStep === 'insights' && (
          <FirstInsightsScreen
            selectedSubscriptions={selectedSubscriptions}
            onFinish={handleFinishOnboarding}
          />
        )}
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButtonContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  progressContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
});
