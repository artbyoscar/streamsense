import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * Hook to protect routes/screens that require authentication
 * Redirects to login if user is not authenticated
 *
 * @param options - Configuration options
 * @param options.redirectTo - Path to redirect to if not authenticated
 * @param options.onUnauthenticated - Callback when user is not authenticated
 * @returns Authentication status
 */
interface UseAuthGuardOptions {
  onUnauthenticated?: () => void;
  requireEmailVerified?: boolean;
}

export const useAuthGuard = (options: UseAuthGuardOptions = {}) => {
  const { onUnauthenticated, requireEmailVerified = false } = options;

  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const user = useAuthStore(state => state.user);

  const isEmailVerified = user?.email_confirmed_at !== null;
  const canAccess = isAuthenticated && (!requireEmailVerified || isEmailVerified);

  useEffect(() => {
    if (isInitialized && !canAccess && onUnauthenticated) {
      onUnauthenticated();
    }
  }, [isInitialized, canAccess, onUnauthenticated]);

  return {
    isAuthenticated,
    isInitialized,
    canAccess,
    isEmailVerified,
    user,
  };
};

/**
 * Hook to require authentication
 * Throws an error if user is not authenticated
 */
export const useRequireAuth = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isInitialized = useAuthStore(state => state.isInitialized);

  if (isInitialized && !isAuthenticated) {
    throw new Error('Authentication required');
  }

  return { isAuthenticated, isInitialized };
};
