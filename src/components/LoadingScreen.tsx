/**
 * LoadingScreen Component
 * Full screen loading spinner with optional message
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { COLORS } from './theme';

export interface LoadingScreenProps {
  message?: string;
  backgroundColor?: string;
  testID?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  backgroundColor = COLORS.background,
  testID,
}) => {
  return (
    <View style={[styles.container, { backgroundColor }]} testID={testID}>
      <ActivityIndicator
        size="large"
        color={COLORS.primary}
        style={styles.spinner}
      />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 8,
  },
});
