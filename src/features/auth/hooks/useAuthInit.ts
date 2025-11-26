import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * Hook to initialize authentication on app start
 * Should be called once in the root component
 */
export const useAuthInit = () => {
  const initialize = useAuthStore(state => state.initialize);
  const isInitialized = useAuthStore(state => state.isInitialized);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  return { isInitialized };
};
