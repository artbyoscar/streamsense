/**
 * ErrorView Component
 * Displays error states with retry functionality
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from './theme';
import { Button } from './Button';

interface ErrorViewProps {
  error?: Error | string | null;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  fullScreen?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

/**
 * ErrorView displays error states with optional retry functionality
 *
 * @example
 * // Simple error
 * <ErrorView
 *   error={error}
 *   onRetry={refetch}
 * />
 *
 * @example
 * // Custom messaging
 * <ErrorView
 *   title="Connection Failed"
 *   message="Unable to load your subscriptions. Please check your internet connection."
 *   onRetry={handleRetry}
 *   retryLabel="Try Again"
 * />
 *
 * @example
 * // Full screen error
 * <ErrorView
 *   error={error}
 *   onRetry={refetch}
 *   fullScreen
 * />
 */
export const ErrorView: React.FC<ErrorViewProps> = ({
  error,
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  fullScreen = false,
  icon = 'alert-circle-outline',
}) => {
  // Determine the error message to display
  const getErrorMessage = (): string => {
    if (message) return message;

    if (error) {
      if (typeof error === 'string') return error;
      if (error instanceof Error) return error.message;
    }

    return 'Something went wrong. Please try again.';
  };

  const errorTitle = title || 'Oops!';
  const errorMessage = getErrorMessage();

  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container;

  return (
    <View style={containerStyle}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon} size={64} color={COLORS.error} />
      </View>

      <Text style={styles.title}>{errorTitle}</Text>
      <Text style={styles.message}>{errorMessage}</Text>

      {onRetry && (
        <Button
          mode="contained"
          onPress={onRetry}
          style={styles.retryButton}
          contentStyle={styles.buttonContent}
        >
          {retryLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${COLORS.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
  retryButton: {
    borderRadius: 12,
    minWidth: 160,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
