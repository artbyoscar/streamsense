/**
 * RevenueCat Initialization Hook
 * Manages RevenueCat initialization based on authentication state
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth';
import { usePremiumStore } from '@/features/premium';
import { initializePurchases, logoutUser } from '@/services/purchases';

/**
 * Hook to initialize RevenueCat when user is authenticated
 * and clean up when user logs out
 */
export const useRevenueCat = () => {
  const { user, isAuthenticated } = useAuth();
  const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { checkStatus, reset: resetPremiumStore } = usePremiumStore();

  useEffect(() => {
    let mounted = true;

    const initializeRevenueCat = async () => {
      if (!isAuthenticated || !user?.id) {
        // User is not authenticated, clean up
        if (isRevenueCatReady) {
          try {
            await logoutUser();
            resetPremiumStore();
            setIsRevenueCatReady(false);
          } catch (err) {
            console.error('Failed to logout from RevenueCat:', err);
          }
        }
        return;
      }

      try {
        // Initialize RevenueCat with user ID
        await initializePurchases(user.id);

        if (!mounted) return;

        setIsRevenueCatReady(true);
        setError(null);

        // Check initial subscription status
        await checkStatus();
      } catch (err: any) {
        console.error('Failed to initialize RevenueCat:', err);
        if (!mounted) return;

        setError(err.message || 'Failed to initialize purchases');
        setIsRevenueCatReady(false);
      }
    };

    initializeRevenueCat();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user?.id]);

  return {
    isRevenueCatReady,
    error,
  };
};
