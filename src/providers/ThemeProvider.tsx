import React from 'react';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { COLORS } from '@/components';

// Customize the Material Design 3 theme
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    tertiary: COLORS.info,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
    onPrimary: COLORS.white,
    onSecondary: COLORS.white,
    onSurface: COLORS.text,
    onBackground: COLORS.text,
    outline: COLORS.border,
  },
};

// Navigation theme that matches React Native Paper
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.onSurface,
    border: theme.colors.outline,
  },
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={navigationTheme}>{children}</NavigationContainer>
    </PaperProvider>
  );
};

export { theme };
