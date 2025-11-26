import { useAuthStore } from '../store/authStore';
import type { LoginCredentials, RegisterCredentials, PasswordResetRequest } from '../types';

/**
 * Custom hook for accessing authentication state and actions
 * Provides a clean interface to the auth store
 */
export const useAuth = () => {
  // State selectors
  const user = useAuthStore(state => state.user);
  const session = useAuthStore(state => state.session);
  const isLoading = useAuthStore(state => state.isLoading);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const error = useAuthStore(state => state.error);

  // Actions
  const initialize = useAuthStore(state => state.initialize);
  const login = useAuthStore(state => state.login);
  const register = useAuthStore(state => state.register);
  const logout = useAuthStore(state => state.logout);
  const resetPassword = useAuthStore(state => state.resetPassword);
  const updatePassword = useAuthStore(state => state.updatePassword);
  const refreshSession = useAuthStore(state => state.refreshSession);
  const setSession = useAuthStore(state => state.setSession);
  const clearError = useAuthStore(state => state.clearError);

  return {
    // State
    user,
    session,
    isLoading,
    isAuthenticated,
    isInitialized,
    error,

    // Actions
    initialize,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    refreshSession,
    setSession,
    clearError,
  };
};

/**
 * Hook to get only user data (without actions)
 */
export const useUser = () => {
  return useAuthStore(state => state.user);
};

/**
 * Hook to get only auth status (without user data)
 */
export const useAuthStatus = () => {
  return useAuthStore(state => ({
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    isInitialized: state.isInitialized,
    error: state.error,
  }));
};

/**
 * Hook to get only session data
 */
export const useSession = () => {
  return useAuthStore(state => state.session);
};
