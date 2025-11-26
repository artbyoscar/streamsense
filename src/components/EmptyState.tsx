/**
 * EmptyState Component
 * Empty state with icon, message, and optional action button
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { Button } from './Button';

// Color scheme
const COLORS = {
  gray: '#6B7280',
  lightGray: '#9CA3AF',
  darkGray: '#374151',
  primary: '#2563EB',
};

export interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox-outline',
  title,
  message,
  actionLabel,
  onActionPress,
  style,
  testID,
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <IconButton
        icon={icon}
        size={64}
        iconColor={COLORS.lightGray}
        style={styles.icon}
        disabled
      />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onActionPress && (
        <Button
          variant="primary"
          onPress={onActionPress}
          style={styles.action}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 300,
  },
  action: {
    marginTop: 8,
  },
});
