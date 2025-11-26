/**
 * StreamSense UI Components
 * Reusable UI components for the application
 */

// Base UI Components
export { Button } from './Button';
export type { ButtonProps, ButtonVariant } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Card } from './Card';
export type { CardProps } from './Card';

export { LoadingScreen } from './LoadingScreen';
export type { LoadingScreenProps } from './LoadingScreen';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { PaywallModal } from './PaywallModal';

export { ErrorBoundary } from './ErrorBoundary';

// Color Scheme Constants
export const COLORS = {
  primary: '#2563EB',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#E5E7EB',
  darkGray: '#374151',
  background: '#F9FAFB',
  border: '#E5E7EB',
} as const;
