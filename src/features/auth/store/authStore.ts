import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils';
import type {
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  PasswordResetRequest,
  UpdatePasswordRequest,
  Session,
  AuthError,
  AuthActionType,
} from '../types';

/**
 * Authentication store using Zustand
 * Manages authentication state and provides actions for auth operations
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    set => ({
      // Initial state
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      isInitialized: false,
      error: null,

      /**
       * Initialize auth state and set up session listener
       */
      initialize: async () => {
        try {
          logger.debug('[Auth] Initializing authentication...');
          set({ isLoading: true, error: null });

          // Get current session
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            logger.error('[Auth] Error getting session:', error);
            throw error;
          }

          // Set initial state
          set({
            user: session?.user ?? null,
            session,
            isAuthenticated: !!session,
            isLoading: false,
            isInitialized: true,
            error: null,
          });

          logger.info('[Auth] Authentication initialized', {
            authenticated: !!session,
            userId: session?.user?.id,
          });

          // Listen for auth state changes
          supabase.auth.onAuthStateChange((_event, session) => {
            logger.debug('[Auth] Auth state changed:', _event);

            set({
              user: session?.user ?? null,
              session,
              isAuthenticated: !!session,
              isLoading: false,
            });
          });
        } catch (error) {
          logger.error('[Auth] Initialization failed:', error);
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: error as AuthError,
          });
        }
      },

      /**
       * Login with email and password
       */
      login: async ({ email, password }: LoginCredentials) => {
        try {
          logger.debug('[Auth] Logging in...', { email });
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            logger.error('[Auth] Login failed:', error);
            throw error;
          }

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          logger.info('[Auth] Login successful', { userId: data.user?.id });
        } catch (error) {
          logger.error('[Auth] Login error:', error);
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: error as AuthError,
          });
          throw error;
        }
      },

      /**
       * Register new user with email and password
       */
      register: async ({ email, password, metadata }: RegisterCredentials) => {
        try {
          logger.debug('[Auth] Registering new user...', { email });
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: metadata,
            },
          });

          if (error) {
            logger.error('[Auth] Registration failed:', error);
            throw error;
          }

          // Note: User might need to confirm email before session is created
          set({
            user: data.user,
            session: data.session,
            isAuthenticated: !!data.session,
            isLoading: false,
            error: null,
          });

          logger.info('[Auth] Registration successful', {
            userId: data.user?.id,
            emailConfirmed: !!data.session,
          });
        } catch (error) {
          logger.error('[Auth] Registration error:', error);
          set({
            isLoading: false,
            error: error as AuthError,
          });
          throw error;
        }
      },

      /**
       * Logout current user
       */
      logout: async () => {
        try {
          logger.debug('[Auth] Logging out...');
          set({ isLoading: true, error: null });

          const { error } = await supabase.auth.signOut();

          if (error) {
            logger.error('[Auth] Logout failed:', error);
            throw error;
          }

          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });

          logger.info('[Auth] Logout successful');
        } catch (error) {
          logger.error('[Auth] Logout error:', error);
          set({
            isLoading: false,
            error: error as AuthError,
          });
          throw error;
        }
      },

      /**
       * Send password reset email
       */
      resetPassword: async ({ email }: PasswordResetRequest) => {
        try {
          logger.debug('[Auth] Requesting password reset...', { email });
          set({ isLoading: true, error: null });

          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'streamsense://reset-password',
          });

          if (error) {
            logger.error('[Auth] Password reset request failed:', error);
            throw error;
          }

          set({
            isLoading: false,
            error: null,
          });

          logger.info('[Auth] Password reset email sent', { email });
        } catch (error) {
          logger.error('[Auth] Password reset error:', error);
          set({
            isLoading: false,
            error: error as AuthError,
          });
          throw error;
        }
      },

      /**
       * Update user password
       */
      updatePassword: async ({ newPassword }: UpdatePasswordRequest) => {
        try {
          logger.debug('[Auth] Updating password...');
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (error) {
            logger.error('[Auth] Password update failed:', error);
            throw error;
          }

          set({
            user: data.user,
            isLoading: false,
            error: null,
          });

          logger.info('[Auth] Password updated successfully');
        } catch (error) {
          logger.error('[Auth] Password update error:', error);
          set({
            isLoading: false,
            error: error as AuthError,
          });
          throw error;
        }
      },

      /**
       * Refresh the current session
       */
      refreshSession: async () => {
        try {
          logger.debug('[Auth] Refreshing session...');
          set({ isLoading: true, error: null });

          const {
            data: { session },
            error,
          } = await supabase.auth.refreshSession();

          if (error) {
            logger.error('[Auth] Session refresh failed:', error);
            throw error;
          }

          set({
            user: session?.user ?? null,
            session,
            isAuthenticated: !!session,
            isLoading: false,
            error: null,
          });

          logger.info('[Auth] Session refreshed');
        } catch (error) {
          logger.error('[Auth] Session refresh error:', error);
          set({
            isLoading: false,
            error: error as AuthError,
          });
          throw error;
        }
      },

      /**
       * Manually set session (for testing or external auth)
       */
      setSession: (session: Session | null) => {
        logger.debug('[Auth] Setting session manually');
        set({
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session,
          error: null,
        });
      },

      /**
       * Clear error state
       */
      clearError: () => {
        logger.debug('[Auth] Clearing error');
        set({ error: null });
      },
    }),
    {
      name: 'auth-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);
