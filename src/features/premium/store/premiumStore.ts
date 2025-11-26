/**
 * Premium Store
 * Manages premium subscription state with Zustand
 */

import { create } from 'zustand';
import type { PurchasesOfferings, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  checkSubscriptionStatus,
  getCustomerInfo,
} from '@/services/purchases';

// ============================================================================
// TYPES
// ============================================================================

export interface PremiumState {
  // Premium status
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;

  // Offerings
  offerings: PurchasesOfferings | null;
  offeringsLoading: boolean;

  // Purchase state
  purchaseInProgress: boolean;
  restoreInProgress: boolean;

  // Subscription details
  expirationDate: string | null;
  productIdentifier: string | null;

  // Customer info
  customerInfo: CustomerInfo | null;

  // Actions
  loadOfferings: () => Promise<void>;
  purchaseSubscription: (packageToPurchase: PurchasesPackage) => Promise<void>;
  restoreSubscriptions: () => Promise<void>;
  checkStatus: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  isPremium: false,
  isLoading: false,
  error: null,
  offerings: null,
  offeringsLoading: false,
  purchaseInProgress: false,
  restoreInProgress: false,
  expirationDate: null,
  productIdentifier: null,
  customerInfo: null,
};

// ============================================================================
// STORE
// ============================================================================

export const usePremiumStore = create<PremiumState>((set, get) => ({
  ...initialState,

  /**
   * Load available subscription offerings
   */
  loadOfferings: async () => {
    set({ offeringsLoading: true, error: null });

    try {
      const offerings = await getOfferings();

      set({
        offerings,
        offeringsLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load offerings',
        offeringsLoading: false,
        offerings: null,
      });
    }
  },

  /**
   * Purchase a subscription package
   */
  purchaseSubscription: async (packageToPurchase: PurchasesPackage) => {
    set({ purchaseInProgress: true, error: null });

    try {
      const customerInfo = await purchasePackage(packageToPurchase);

      // Check if purchase granted premium access
      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
      const premiumEntitlement = customerInfo.entitlements.active['premium'];

      set({
        purchaseInProgress: false,
        isPremium,
        customerInfo,
        expirationDate: premiumEntitlement?.expirationDate || null,
        productIdentifier: premiumEntitlement?.productIdentifier || null,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Purchase failed',
        purchaseInProgress: false,
      });
      throw error;
    }
  },

  /**
   * Restore previous purchases
   */
  restoreSubscriptions: async () => {
    set({ restoreInProgress: true, error: null });

    try {
      const customerInfo = await restorePurchases();

      // Check if user has premium access
      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
      const premiumEntitlement = customerInfo.entitlements.active['premium'];

      set({
        restoreInProgress: false,
        isPremium,
        customerInfo,
        expirationDate: premiumEntitlement?.expirationDate || null,
        productIdentifier: premiumEntitlement?.productIdentifier || null,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to restore purchases',
        restoreInProgress: false,
      });
      throw error;
    }
  },

  /**
   * Check current subscription status
   */
  checkStatus: async () => {
    set({ isLoading: true, error: null });

    try {
      const status = await checkSubscriptionStatus();

      set({
        isLoading: false,
        isPremium: status.isPremium,
        expirationDate: status.expirationDate,
        productIdentifier: status.productIdentifier,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to check status',
        isLoading: false,
        isPremium: false,
      });
    }
  },

  /**
   * Refresh customer info from RevenueCat
   */
  refreshCustomerInfo: async () => {
    set({ isLoading: true, error: null });

    try {
      const customerInfo = await getCustomerInfo();

      // Check if user has premium access
      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
      const premiumEntitlement = customerInfo.entitlements.active['premium'];

      set({
        isLoading: false,
        isPremium,
        customerInfo,
        expirationDate: premiumEntitlement?.expirationDate || null,
        productIdentifier: premiumEntitlement?.productIdentifier || null,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to refresh customer info',
        isLoading: false,
      });
    }
  },

  /**
   * Reset premium state
   * Called on logout
   */
  reset: () => {
    set(initialState);
  },
}));

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Check if user has active premium subscription
 */
export const selectIsPremium = (state: PremiumState) => state.isPremium;

/**
 * Get current offering packages
 */
export const selectCurrentOffering = (state: PremiumState) => state.offerings?.current;

/**
 * Get available packages
 */
export const selectAvailablePackages = (state: PremiumState) =>
  state.offerings?.current?.availablePackages || [];

/**
 * Check if any operation is in progress
 */
export const selectIsLoading = (state: PremiumState) =>
  state.isLoading || state.purchaseInProgress || state.restoreInProgress || state.offeringsLoading;

/**
 * Get subscription details
 */
export const selectSubscriptionDetails = (state: PremiumState) => ({
  isPremium: state.isPremium,
  expirationDate: state.expirationDate,
  productIdentifier: state.productIdentifier,
});
