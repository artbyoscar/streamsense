import React, { useEffect } from 'react';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';
import { useAuthStore } from '@/stores';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    // Initialize auth state on app start
    initialize();
  }, [initialize]);

  return (
    <QueryProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryProvider>
  );
};

export { QueryProvider } from './QueryProvider';
export { ThemeProvider } from './ThemeProvider';
