/**
 * Screen Configuration
 * CRITICAL: This file must be imported FIRST before any navigator imports
 * to prevent New Architecture conflicts with Expo Go
 */

import { enableScreens } from 'react-native-screens';

// Disable react-native-screens to prevent Java casting errors in Expo Go
enableScreens(false);

// Export flag to confirm configuration is loaded
export const screensConfigured = true;
