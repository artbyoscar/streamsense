/**
 * Button Component
 * Reusable button with variants and loading state
 */

import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button as PaperButton, ActivityIndicator } from 'react-native-paper';
import { useTheme } from '@/providers/ThemeProvider';
import { COLORS } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'success' | 'error';

export interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  mode?: 'text' | 'outlined' | 'contained';
  fullWidth?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = React.memo(({
  children,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
  testID,
}) => {
  const { colors } = useTheme();

  const getButtonMode = (): 'text' | 'outlined' | 'contained' => {
    if (variant === 'outline') return 'outlined';
    if (variant === 'secondary') return 'text';
    return 'contained';
  };

  const getButtonColor = (): string => {
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'secondary':
        return colors.gray;
      case 'outline':
        return colors.primary;
      default:
        return colors.primary;
    }
  };

  const getTextColor = (): string => {
    if (variant === 'outline' || variant === 'secondary') {
      return variant === 'outline' ? colors.primary : colors.gray;
    }
    return colors.white;
  };

  const buttonMode = getButtonMode();
  const buttonColor = getButtonColor();
  const textColor = getTextColor();

  return (
    <PaperButton
      mode={buttonMode}
      onPress={onPress}
      disabled={disabled || loading}
      loading={loading}
      icon={icon}
      buttonColor={buttonMode === 'contained' ? buttonColor : undefined}
      textColor={textColor}
      style={[
        styles.button,
        fullWidth && styles.fullWidth,
        variant === 'outline' && { borderColor: buttonColor, borderWidth: 1 },
        style,
      ]}
      contentStyle={styles.content}
      labelStyle={styles.label}
      testID={testID}
    >
      {children}
    </PaperButton>
  );
});

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    elevation: 0,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
