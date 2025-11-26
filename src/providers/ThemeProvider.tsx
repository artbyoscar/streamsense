import React from 'react';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

// Customize the Material Design 3 theme
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6750A4',
    secondary: '#625B71',
    tertiary: '#7D5260',
    background: '#FFFBFE',
    surface: '#FFFBFE',
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
