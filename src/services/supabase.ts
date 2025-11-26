import { supabase } from '@/config/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Supabase service layer
 * Provides helper functions for common Supabase operations
 */

/**
 * Check if a user is currently authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get the current session
 */
export async function getCurrentSession() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
}

/**
 * Refresh the current session
 */
export async function refreshSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession();

    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return null;
  }
}

/**
 * Check if the current session is expired
 */
export async function isSessionExpired(): Promise<boolean> {
  try {
    const session = await getCurrentSession();
    if (!session) return true;

    const expiresAt = session.expires_at;
    if (!expiresAt) return true;

    const now = Math.floor(Date.now() / 1000);
    return now >= expiresAt;
  } catch (error) {
    console.error('Error checking session expiry:', error);
    return true;
  }
}

/**
 * Get user metadata
 */
export async function getUserMetadata<T = Record<string, any>>(): Promise<T | null> {
  try {
    const user = await getCurrentUser();
    return (user?.user_metadata as T) || null;
  } catch (error) {
    console.error('Error getting user metadata:', error);
    return null;
  }
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(metadata: Record<string, any>) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Error updating user metadata:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Re-export the Supabase client for direct access if needed
 */
export { supabase };
