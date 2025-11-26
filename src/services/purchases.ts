/**
 * RevenueCat Purchases Service
 * Handles in-app subscription purchases and premium feature access
 */

import Purchases, {
  PurchasesOfferings,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/config/supabase';

// RevenueCat API Keys from environment variables
const REVENUECAT_API_KEY = {
  ios: Constants.expoConfig?.extra?.revenueCatIosApiKey || 'test_ajgNphwrEgWZuCyrkRFtfhhnbOq',
  android: Constants.expoConfig?.extra?.revenueCatAndroidApiKey || 'test_ajgNphwrEgWZuCyrkRFtfhhnbOq',
};

/**
 * Initialize RevenueCat SDK
 * Should be called once when the app starts, after user authentication
 */
export const initializePurchases = async (userId: string): Promise<void> => {
  try {
    const apiKey = Platform.select({
      ios: REVENUECAT_API_KEY.ios,
      android: REVENUECAT_API_KEY.android,
      default: REVENUECAT_API_KEY.android,
    });

    if (!apiKey) {
      throw new Error('RevenueCat API key not configured');
    }

    // Configure SDK
    Purchases.setLogLevel(LOG_LEVEL.INFO);

    // Initialize with user ID
    await Purchases.configure({
      apiKey,
      appUserID: userId,
    });

    console.log('RevenueCat initialized for user:', userId);

    // Get initial customer info
    const customerInfo = await Purchases.getCustomerInfo();

    // Sync subscription status with Supabase
    await syncSubscriptionStatus(customerInfo);
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    throw error;
  }
};

/**
 * Get available subscription offerings
 */
export const getOfferings = async (): Promise<PurchasesOfferings | null> => {
  try {
    const offerings = await Purchases.getOfferings();

    if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
      console.log('Available packages:', offerings.current.availablePackages.length);
      return offerings;
    }

    console.warn('No offerings available');
    return null;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    throw error;
  }
};

/**
 * Purchase a subscription package
 */
export const purchasePackage = async (
  packageToPurchase: PurchasesPackage
): Promise<CustomerInfo> => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

    console.log('Purchase successful');

    // Sync subscription status with Supabase
    await syncSubscriptionStatus(customerInfo);

    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('User cancelled purchase');
      throw new Error('Purchase cancelled');
    }

    console.error('Purchase failed:', error);
    throw error;
  }
};

/**
 * Restore previous purchases
 */
export const restorePurchases = async (): Promise<CustomerInfo> => {
  try {
    const customerInfo = await Purchases.restorePurchases();

    console.log('Purchases restored');

    // Sync subscription status with Supabase
    await syncSubscriptionStatus(customerInfo);

    return customerInfo;
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    throw error;
  }
};

/**
 * Check current subscription status
 */
export const checkSubscriptionStatus = async (): Promise<{
  isPremium: boolean;
  expirationDate: string | null;
  productIdentifier: string | null;
}> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();

    // Check if user has active premium entitlement
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;

    const premiumEntitlement = customerInfo.entitlements.active['premium'];

    return {
      isPremium,
      expirationDate: premiumEntitlement?.expirationDate || null,
      productIdentifier: premiumEntitlement?.productIdentifier || null,
    };
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return {
      isPremium: false,
      expirationDate: null,
      productIdentifier: null,
    };
  }
};

/**
 * Sync subscription status with Supabase user profile
 */
export const syncSubscriptionStatus = async (customerInfo: CustomerInfo): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('No authenticated user to sync subscription status');
      return;
    }

    // Check if user has active premium entitlement
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
    const premiumEntitlement = customerInfo.entitlements.active['premium'];

    // Update user metadata in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        is_premium: isPremium,
        premium_expires_at: premiumEntitlement?.expirationDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to sync subscription status to Supabase:', error);
    } else {
      console.log('Subscription status synced to Supabase');
    }
  } catch (error) {
    console.error('Error syncing subscription status:', error);
  }
};

/**
 * Get customer info
 */
export const getCustomerInfo = async (): Promise<CustomerInfo> => {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Failed to get customer info:', error);
    throw error;
  }
};

/**
 * Login user to RevenueCat
 * Use when switching between users
 */
export const loginUser = async (userId: string): Promise<CustomerInfo> => {
  try {
    const { customerInfo } = await Purchases.logIn(userId);

    // Sync subscription status with Supabase
    await syncSubscriptionStatus(customerInfo);

    return customerInfo;
  } catch (error) {
    console.error('Failed to login user to RevenueCat:', error);
    throw error;
  }
};

/**
 * Logout user from RevenueCat
 * Use when user signs out
 */
export const logoutUser = async (): Promise<CustomerInfo> => {
  try {
    const { customerInfo } = await Purchases.logOut();
    return customerInfo;
  } catch (error) {
    console.error('Failed to logout user from RevenueCat:', error);
    throw error;
  }
};

/**
 * Check if a specific entitlement is active
 */
export const hasEntitlement = async (entitlementId: string): Promise<boolean> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[entitlementId] !== undefined;
  } catch (error) {
    console.error('Failed to check entitlement:', error);
    return false;
  }
};
