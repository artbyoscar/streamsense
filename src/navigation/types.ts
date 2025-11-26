import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

/**
 * Navigation Type Definitions
 * Centralized type definitions for all navigators in the app
 */

// ============================================================================
// Auth Stack Navigator
// ============================================================================

/**
 * Auth Stack Parameter List
 * Defines the screens and their params in the authentication flow
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

/**
 * Auth Stack Navigation Prop
 * Type for navigation prop in auth screens
 */
export type AuthStackNavigationProp<T extends keyof AuthStackParamList> = StackNavigationProp<
  AuthStackParamList,
  T
>;

/**
 * Auth Stack Route Prop
 * Type for route prop in auth screens
 */
export type AuthStackRouteProp<T extends keyof AuthStackParamList> = RouteProp<
  AuthStackParamList,
  T
>;

// ============================================================================
// Main Tab Navigator
// ============================================================================

/**
 * Main Tab Parameter List
 * Defines the tabs and their params in the main app
 */
export type MainTabParamList = {
  DashboardTab: undefined;
  WatchlistTab: undefined;
  RecommendationsTab: undefined;
  SettingsTab: undefined;
};

/**
 * Dashboard Stack Parameter List
 */
export type DashboardStackParamList = {
  Dashboard: undefined;
  SubscriptionDetail: { subscriptionId: string };
  SubscriptionForm: { subscriptionId?: string };
};

/**
 * Watchlist Stack Parameter List
 */
export type WatchlistStackParamList = {
  Watchlist: undefined;
  ContentSearch: undefined;
  ContentDetail: { contentId: number; contentType: 'movie' | 'tv' };
};

/**
 * Recommendations Stack Parameter List
 */
export type RecommendationsStackParamList = {
  Recommendations: undefined;
};

/**
 * Settings Stack Parameter List
 */
export type SettingsStackParamList = {
  Settings: undefined;
  Profile: undefined;
  PlaidConnection: undefined;
  Test: undefined;
};

/**
 * Main Tab Navigation Prop
 * Type for navigation prop in main tab screens
 */
export type MainTabNavigationProp<T extends keyof MainTabParamList> = BottomTabNavigationProp<
  MainTabParamList,
  T
>;

/**
 * Main Tab Route Prop
 * Type for route prop in main tab screens
 */
export type MainTabRouteProp<T extends keyof MainTabParamList> = RouteProp<MainTabParamList, T>;

// ============================================================================
// Root Navigator
// ============================================================================

/**
 * Root Navigator Parameter List
 * Top-level navigator that switches between Auth and Main
 */
export type RootNavigatorParamList = {
  Auth: undefined;
  Main: undefined;
};

// ============================================================================
// Screen Props Helpers
// ============================================================================

/**
 * Auth Screen Props
 * Helper type for auth screen component props
 */
export type AuthScreenProps<T extends keyof AuthStackParamList> = {
  navigation: AuthStackNavigationProp<T>;
  route: AuthStackRouteProp<T>;
};

/**
 * Main Screen Props
 * Helper type for main tab screen component props
 */
export type MainScreenProps<T extends keyof MainTabParamList> = {
  navigation: MainTabNavigationProp<T>;
  route: MainTabRouteProp<T>;
};

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Check if screen is in auth stack
 */
export const isAuthScreen = (screenName: string): screenName is keyof AuthStackParamList => {
  return ['Login', 'Register', 'ForgotPassword'].includes(screenName);
};

/**
 * Check if screen is in main tab
 */
export const isMainScreen = (screenName: string): screenName is keyof MainTabParamList => {
  return ['DashboardTab', 'WatchlistTab', 'RecommendationsTab', 'SettingsTab'].includes(screenName);
};

// ============================================================================
// Declaration Merging for useNavigation Hook
// ============================================================================

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootNavigatorParamList {}
  }
}
