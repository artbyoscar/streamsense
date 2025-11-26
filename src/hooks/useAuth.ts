import { useAuthStore } from '@/stores';

/**
 * Custom hook for accessing authentication state and methods
 * This is a convenience wrapper around the Zustand auth store
 */
export const useAuth = () => {
  const user = useAuthStore(state => state.user);
  const session = useAuthStore(state => state.session);
  const isLoading = useAuthStore(state => state.isLoading);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const signIn = useAuthStore(state => state.signIn);
  const signUp = useAuthStore(state => state.signUp);
  const signOut = useAuthStore(state => state.signOut);

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
  };
};
