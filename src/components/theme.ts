/**
 * Theme Colors
 * App-wide color constants with light and dark mode support
 */

// Light theme colors
export const LIGHT_COLORS = {
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

  // Gray scale
  lightGray: '#E5E7EB',
  gray: '#6B7280',
  darkGray: '#4B5563',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Skeleton loading
  skeleton: '#E5E7EB',
  skeletonHighlight: '#F3F4F6',
} as const;

// Dark theme colors
export const DARK_COLORS = {
  // Brand colors
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  secondary: '#8B5CF6',

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  background: '#111827',
  surface: '#1F2937',
  card: '#1F2937',

  // Text colors
  text: '#F9FAFB',
  textPrimary: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textDisabled: '#6B7280',
  textInverse: '#1F2937',

  // Border colors
  border: '#374151',
  borderLight: '#4B5563',

  // Gray scale
  lightGray: '#374151',
  gray: '#9CA3AF',
  darkGray: '#D1D5DB',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Skeleton loading
  skeleton: '#374151',
  skeletonHighlight: '#4B5563',
} as const;

// Default export for backward compatibility (light theme)
export const COLORS = LIGHT_COLORS;
