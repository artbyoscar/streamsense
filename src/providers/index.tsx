import React from 'react';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';
import { useAuthInit } from '@/features/auth';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  // Initialize authentication on app start
  useAuthInit();

  return (
    <QueryProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryProvider>
  );
};

export { QueryProvider } from './QueryProvider';
export { ThemeProvider } from './ThemeProvider';
