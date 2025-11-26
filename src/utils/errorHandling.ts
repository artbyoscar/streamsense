/**
 * Error Handling Utilities
 * Parse, format, and log errors consistently across the app
 */

import { PostgrestError } from '@supabase/supabase-js';
import { logger } from './logger';

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ParsedError {
  code: string;
  message: string;
  userMessage: string;
  originalError: unknown;
  context?: Record<string, unknown>;
}

export type ErrorCategory =
  | 'network'
  | 'auth'
  | 'validation'
  | 'not_found'
  | 'permission'
  | 'server'
  | 'unknown';

// ============================================================================
// ERROR CODE MAPPINGS
// ============================================================================

const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  FETCH_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  NETWORK_ERROR: 'Network connection lost. Please check your internet connection.',
  TIMEOUT_ERROR: 'The request took too long. Please try again.',

  // Auth errors
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  USER_NOT_FOUND: 'No account found with this email address.',
  EMAIL_EXISTS: 'An account with this email already exists.',
  WEAK_PASSWORD: 'Password is too weak. Please use a stronger password.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',

  // Database errors
  PGRST116: 'The requested data could not be found.',
  PGRST301: 'You do not have permission to access this data.',
  '23505': 'This record already exists.',
  '23503': 'Cannot delete this record as it is being used elsewhere.',

  // Validation errors
  VALIDATION_ERROR: 'Please check your input and try again.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_FORMAT: 'Invalid format. Please check your input.',

  // Generic errors
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
};

// ============================================================================
// PARSE API ERROR
// ============================================================================

/**
 * Parse errors from Supabase/API calls into a consistent format
 *
 * @example
 * try {
 *   const { data, error } = await supabase.from('table').select();
 *   if (error) throw error;
 * } catch (error) {
 *   const parsedError = parseApiError(error);
 *   console.error(parsedError.userMessage);
 * }
 */
export const parseApiError = (
  error: unknown,
  context?: Record<string, unknown>
): ParsedError => {
  // Supabase/PostgreSQL error
  if (isPostgrestError(error)) {
    return {
      code: error.code,
      message: error.message,
      userMessage: ERROR_MESSAGES[error.code] || ERROR_MESSAGES.SERVER_ERROR,
      originalError: error,
      context,
    };
  }

  // Network/Fetch error
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'FETCH_ERROR',
      message: error.message,
      userMessage: ERROR_MESSAGES.FETCH_ERROR,
      originalError: error,
      context,
    };
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for specific error messages
    const message = error.message.toLowerCase();

    if (message.includes('network')) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        userMessage: ERROR_MESSAGES.NETWORK_ERROR,
        originalError: error,
        context,
      };
    }

    if (message.includes('timeout')) {
      return {
        code: 'TIMEOUT_ERROR',
        message: error.message,
        userMessage: ERROR_MESSAGES.TIMEOUT_ERROR,
        originalError: error,
        context,
      };
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return {
        code: 'UNAUTHORIZED',
        message: error.message,
        userMessage: ERROR_MESSAGES.UNAUTHORIZED,
        originalError: error,
        context,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      userMessage: error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
      originalError: error,
      context,
    };
  }

  // String error
  if (typeof error === 'string') {
    return {
      code: 'UNKNOWN_ERROR',
      message: error,
      userMessage: error,
      originalError: error,
      context,
    };
  }

  // Unknown error type
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    userMessage: ERROR_MESSAGES.UNKNOWN_ERROR,
    originalError: error,
    context,
  };
};

// ============================================================================
// GET USER FRIENDLY MESSAGE
// ============================================================================

/**
 * Get a user-friendly error message from any error type
 *
 * @example
 * const message = getUserFriendlyMessage(error);
 * Alert.alert('Error', message);
 */
export const getUserFriendlyMessage = (error: unknown): string => {
  const parsed = parseApiError(error);
  return parsed.userMessage;
};

// ============================================================================
// LOG ERROR
// ============================================================================

/**
 * Log error with context for debugging
 *
 * @example
 * try {
 *   await fetchData();
 * } catch (error) {
 *   logError(error, { component: 'Dashboard', action: 'fetchSubscriptions' });
 * }
 */
export const logError = (
  error: unknown,
  context?: Record<string, unknown>
): void => {
  const parsed = parseApiError(error, context);

  logger.error('[Error]', {
    code: parsed.code,
    message: parsed.message,
    userMessage: parsed.userMessage,
    context: parsed.context,
    stack: parsed.originalError instanceof Error ? parsed.originalError.stack : undefined,
  });
};

// ============================================================================
// CATEGORIZE ERROR
// ============================================================================

/**
 * Categorize error type for different handling strategies
 *
 * @example
 * const category = categorizeError(error);
 * if (category === 'network') {
 *   showOfflineBanner();
 * }
 */
export const categorizeError = (error: unknown): ErrorCategory => {
  const parsed = parseApiError(error);

  if (parsed.code.includes('NETWORK') || parsed.code.includes('FETCH')) {
    return 'network';
  }

  if (
    parsed.code.includes('AUTH') ||
    parsed.code === 'UNAUTHORIZED' ||
    parsed.code === 'SESSION_EXPIRED'
  ) {
    return 'auth';
  }

  if (parsed.code.includes('VALIDATION') || parsed.code.includes('REQUIRED')) {
    return 'validation';
  }

  if (parsed.code === 'PGRST116' || parsed.code.includes('NOT_FOUND')) {
    return 'not_found';
  }

  if (parsed.code === 'PGRST301' || parsed.code.includes('PERMISSION')) {
    return 'permission';
  }

  if (parsed.code.includes('SERVER') || parsed.code.startsWith('5')) {
    return 'server';
  }

  return 'unknown';
};

// ============================================================================
// IS RETRYABLE ERROR
// ============================================================================

/**
 * Determine if an error is retryable (network/timeout errors)
 *
 * @example
 * if (isRetryableError(error)) {
 *   showRetryButton();
 * }
 */
export const isRetryableError = (error: unknown): boolean => {
  const category = categorizeError(error);
  return category === 'network' || category === 'server';
};

// ============================================================================
// HANDLE API CALL WITH ERROR LOGGING
// ============================================================================

/**
 * Wrapper for API calls with automatic error parsing and logging
 *
 * @example
 * const subscriptions = await handleApiCall(
 *   () => supabase.from('subscriptions').select(),
 *   { component: 'Dashboard', action: 'fetchSubscriptions' }
 * );
 */
export const handleApiCall = async <T>(
  apiCall: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  context?: Record<string, unknown>
): Promise<T> => {
  try {
    const { data, error } = await apiCall();

    if (error) {
      logError(error, context);
      throw error;
    }

    if (data === null) {
      const noDataError = new Error('No data returned from API call');
      logError(noDataError, context);
      throw noDataError;
    }

    return data;
  } catch (error) {
    logError(error, context);
    throw error;
  }
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if error is a Supabase PostgrestError
 */
function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

// ============================================================================
// ERROR RECOVERY SUGGESTIONS
// ============================================================================

/**
 * Get suggested actions for error recovery
 *
 * @example
 * const suggestions = getErrorSuggestions(error);
 * // ['Check your internet connection', 'Try again later']
 */
export const getErrorSuggestions = (error: unknown): string[] => {
  const category = categorizeError(error);

  const suggestions: Record<ErrorCategory, string[]> = {
    network: [
      'Check your internet connection',
      'Try again in a few moments',
      'Make sure you are connected to Wi-Fi or cellular data',
    ],
    auth: [
      'Log out and log back in',
      'Check your credentials',
      'Reset your password if needed',
    ],
    validation: ['Check your input', 'Make sure all required fields are filled'],
    not_found: ['The item may have been deleted', 'Try refreshing the page'],
    permission: ['You may not have access to this feature', 'Contact support if needed'],
    server: ['Try again later', 'The issue is on our end', 'Contact support if it persists'],
    unknown: ['Try again', 'Contact support if the problem persists'],
  };

  return suggestions[category];
};
