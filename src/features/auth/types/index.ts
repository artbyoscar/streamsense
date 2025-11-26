import type { User, Session, AuthError } from '@supabase/supabase-js';

/**
 * Authentication feature types
 */

export type { User, Session, AuthError };

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration credentials
 */
export interface RegisterCredentials {
  email: string;
  password: string;
  metadata?: {
    full_name?: string;
    [key: string]: any;
  };
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Update password request
 */
export interface UpdatePasswordRequest {
  newPassword: string;
}

/**
 * Authentication state
 */
export interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  error: AuthError | null;

  // Actions
  initialize: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (request: PasswordResetRequest) => Promise<void>;
  updatePassword: (request: UpdatePasswordRequest) => Promise<void>;
  setSession: (session: Session | null) => void;
  clearError: () => void;
  refreshSession: () => Promise<void>;
}

/**
 * Auth error codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'invalid_credentials',
  USER_NOT_FOUND = 'user_not_found',
  EMAIL_ALREADY_EXISTS = 'email_already_exists',
  WEAK_PASSWORD = 'weak_password',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Auth action types for logging
 */
export enum AuthActionType {
  INITIALIZE = 'INITIALIZE',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  LOGOUT = 'LOGOUT',
  RESET_PASSWORD = 'RESET_PASSWORD',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  REFRESH_SESSION = 'REFRESH_SESSION',
  SET_SESSION = 'SET_SESSION',
}
