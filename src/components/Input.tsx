/**
 * Input Component
 * Text input wrapper with label, error display, and icon support
 */

import React, { useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { TextInput, Text, HelperText } from 'react-native-paper';
import { useTheme } from '@/providers/ThemeProvider';
import { COLORS } from './theme';

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad' | 'decimal-pad';
  autoComplete?:
    | 'off'
    | 'email'
    | 'name'
    | 'password'
    | 'tel'
    | 'username'
    | 'new-password'
    | 'current-password';
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  style?: ViewStyle;
  testID?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  disabled = false,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  autoComplete = 'off',
  leftIcon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
  testID,
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        error={!!error}
        disabled={disabled}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        left={leftIcon ? <TextInput.Icon icon={leftIcon} disabled /> : undefined}
        right={
          rightIcon ? (
            <TextInput.Icon
              icon={rightIcon}
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
            />
          ) : undefined
        }
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
        maxLength={maxLength}
        mode="outlined"
        outlineColor={colors.lightGray}
        activeOutlineColor={error ? colors.error : colors.primary}
        textColor={colors.darkGray}
        style={[
          styles.input,
          { backgroundColor: colors.white },
          multiline && { minHeight: numberOfLines * 20 + 30 },
        ]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        testID={testID}
        theme={{
          colors: {
            primary: colors.primary,
            error: colors.error,
          },
          roundness: 8,
        }}
      />
      {error && (
        <HelperText type="error" visible={!!error} style={[styles.errorText, { color: colors.error }]}>
          {error}
        </HelperText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: -4,
    color: COLORS.error,
  },
});
