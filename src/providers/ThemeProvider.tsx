import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { MD3LightTheme, MD3DarkTheme, PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS } from '@/components/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  colors: typeof LIGHT_COLORS;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@streamsense:theme';

const lightPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: LIGHT_COLORS.primary,
    secondary: LIGHT_COLORS.secondary,
    error: LIGHT_COLORS.error,
    background: LIGHT_COLORS.background,
    surface: LIGHT_COLORS.surface,
    surfaceVariant: LIGHT_COLORS.borderLight,
    onPrimary: LIGHT_COLORS.white,
    onSecondary: LIGHT_COLORS.white,
    onBackground: LIGHT_COLORS.text,
    onSurface: LIGHT_COLORS.text,
    outline: LIGHT_COLORS.border,
  },
};

const darkPaperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: DARK_COLORS.primary,
    secondary: DARK_COLORS.secondary,
    error: DARK_COLORS.error,
    background: DARK_COLORS.background,
    surface: DARK_COLORS.surface,
    surfaceVariant: DARK_COLORS.borderLight,
    onPrimary: DARK_COLORS.white,
    onSecondary: DARK_COLORS.white,
    onBackground: DARK_COLORS.text,
    onSurface: DARK_COLORS.text,
    outline: DARK_COLORS.border,
  },
};

// Export for use in RootNavigator
export const getNavigationTheme = (isDark: boolean) => ({
  dark: isDark,
  colors: isDark ? {
    primary: DARK_COLORS.primary,
    background: DARK_COLORS.background,
    card: DARK_COLORS.card,
    text: DARK_COLORS.text,
    border: DARK_COLORS.border,
    notification: DARK_COLORS.error,
  } : {
    primary: LIGHT_COLORS.primary,
    background: LIGHT_COLORS.background,
    card: LIGHT_COLORS.card,
    text: LIGHT_COLORS.text,
    border: LIGHT_COLORS.border,
    notification: LIGHT_COLORS.error,
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700',
    },
    heavy: {
      fontFamily: 'System',
      fontWeight: '900',
    },
  },
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  // Load theme preference from storage
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
        setThemeModeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  // Determine if dark mode should be active
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  const paperTheme = isDark ? darkPaperTheme : lightPaperTheme;
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, setThemeMode, colors }}>
      <PaperProvider theme={paperTheme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
