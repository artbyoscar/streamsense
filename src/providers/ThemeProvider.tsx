import React from 'react';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

// Customize the Material Design 3 theme
const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563EB',
    secondary: '#7C3AED',
    tertiary: '#3B82F6',
    error: '#EF4444',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceVariant: '#F3F4F6',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#1F2937',
    onSurface: '#1F2937',
    outline: '#E5E7EB',
  },
};

// Navigation theme that matches React Native Paper
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2563EB',
    background: '#F9FAFB',
    card: '#FFFFFF',
    text: '#1F2937',
    border: '#E5E7EB',
    notification: '#EF4444',
  },
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer theme={navigationTheme}>{children}</NavigationContainer>
    </PaperProvider>
  );
};

export { paperTheme as theme };
