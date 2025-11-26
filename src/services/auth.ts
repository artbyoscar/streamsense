import { supabase } from '@/config/supabase';
import type { AuthError, Session, User } from '@supabase/supabase-js';

/**
 * Authentication service
 * Handles all authentication-related operations
 */

export interface SignUpCredentials {
  email: string;
  password: string;
  metadata?: Record<string, any>;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

/**
 * Sign up a new user with email and password
 */
export async function signUpWithEmail({
  email,
  password,
  metadata,
}: SignUpCredentials): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    return {
      user: data.user,
      session: data.session,
      error,
    };
  } catch (error) {
    console.error('Error signing up:', error);
    return {
      user: null,
      session: null,
      error: error as AuthError,
    };
  }
}

/**
 * Sign in an existing user with email and password
 */
export async function signInWithEmail({
  email,
  password,
}: SignInCredentials): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error,
    };
  } catch (error) {
    console.error('Error signing in:', error);
    return {
      user: null,
      session: null,
      error: error as AuthError,
    };
  }
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'streamsense://reset-password',
    });

    return { error };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { error: error as AuthError };
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error };
  } catch (error) {
    console.error('Error updating password:', error);
    return { error: error as AuthError };
  }
}

/**
 * Update user email
 */
export async function updateEmail(newEmail: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    return { error };
  } catch (error) {
    console.error('Error updating email:', error);
    return { error: error as AuthError };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error: error as AuthError };
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return subscription;
}

/**
 * Verify if an email is available (not already registered)
 */
export async function isEmailAvailable(email: string): Promise<boolean> {
  try {
    // Attempt to sign in with a random password
    // If the email doesn't exist, we'll get a specific error
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: 'random-check-password-' + Math.random(),
    });

    // If error message indicates invalid credentials, email exists
    // If error indicates user not found, email is available
    if (error?.message.includes('Invalid login credentials')) {
      return false; // Email exists
    }

    return true; // Email available
  } catch (error) {
    console.error('Error checking email availability:', error);
    return false; // Default to email not available on error
  }
}
