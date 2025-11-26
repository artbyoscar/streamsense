import React from 'react';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563EB',
    secondary: '#7C3AED',
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

// Export for use in RootNavigator
export const navigationTheme = {
  dark: false,
  colors: {
    primary: '#2563EB',
    background: '#F9FAFB',
    card: '#FFFFFF',
    text: '#1F2937',
    border: '#E5E7EB',
    notification: '#EF4444',
  },
  fonts: MD3LightTheme.fonts,
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <PaperProvider theme={paperTheme}>
      {children}
    </PaperProvider>
  );
}
