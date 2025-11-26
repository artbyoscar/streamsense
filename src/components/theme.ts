/**
 * Theme Colors
 * App-wide color constants
 */

export const COLORS = {
  // Brand colors
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  secondary: '#7C3AED',

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  // Text colors
  text: '#1F2937',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Gray scale (for backward compatibility)
  lightGray: '#E5E7EB',
  gray: '#6B7280',
  darkGray: '#4B5563',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Skeleton loading
  skeleton: '#E5E7EB',
  skeletonHighlight: '#F3F4F6',
} as const;
