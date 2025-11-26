/**
 * Sentry Error Tracking Service
 * Centralized error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { logger } from '@/utils';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn || '';

const isProduction = process.env.NODE_ENV === 'production';
const isEnabled = isProduction && SENTRY_DSN !== '';

/**
 * Initialize Sentry error tracking
 * Call this as early as possible in the app lifecycle
 *
 * @example
 * initializeSentry();
 */
export function initializeSentry(): void {
  if (!isEnabled) {
    logger.info('[Sentry] Disabled (not in production or no DSN)');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,

      // Environment
      environment: isProduction ? 'production' : 'development',

      // Release tracking
      release: Constants.expoConfig?.version,
      dist: Constants.expoConfig?.version,

      // Performance monitoring
      tracesSampleRate: 1.0, // 100% of transactions (adjust in production)
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000, // 30 seconds

      // Error tracking
      enabled: isEnabled,
      enableNative: true,
      enableNativeCrashHandling: true,
      enableNativeNagger: false, // Disable Sentry prompts

      // Debug
      debug: __DEV__,

      // Integrations
      integrations: [
        new Sentry.ReactNativeTracing({
          routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
          tracingOrigins: ['localhost', /^\//],
        }),
      ],

      // Before send hook - sanitize sensitive data
      beforeSend(event, hint) {
        // Remove sensitive data from event
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }

        // Log locally in development
        if (__DEV__) {
          logger.debug('[Sentry] Event captured:', {
            message: event.message,
            level: event.level,
            exception: hint.originalException,
          });
        }

        return event;
      },

      // Before breadcrumb hook - filter breadcrumbs
      beforeBreadcrumb(breadcrumb, hint) {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
          return null;
        }

        return breadcrumb;
      },
    });

    logger.info('[Sentry] Initialized successfully');
  } catch (error) {
    logger.error('[Sentry] Initialization failed:', error);
  }
}

// ============================================================================
// USER CONTEXT
// ============================================================================

/**
 * Set user context for error tracking
 *
 * @example
 * setUserContext({
 *   id: user.id,
 *   email: user.email,
 *   isPremium: user.is_premium,
 * });
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  isPremium?: boolean;
  [key: string]: any;
}): void {
  if (!isEnabled) return;

  try {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      isPremium: user.isPremium,
    });

    // Set additional context
    Sentry.setContext('user_details', {
      isPremium: user.isPremium,
      ...user,
    });

    logger.debug('[Sentry] User context set:', user.id);
  } catch (error) {
    logger.error('[Sentry] Failed to set user context:', error);
  }
}

/**
 * Clear user context (call on logout)
 *
 * @example
 * clearUserContext();
 */
export function clearUserContext(): void {
  if (!isEnabled) return;

  try {
    Sentry.setUser(null);
    logger.debug('[Sentry] User context cleared');
  } catch (error) {
    logger.error('[Sentry] Failed to clear user context:', error);
  }
}

// ============================================================================
// ERROR TRACKING
// ============================================================================

/**
 * Capture an exception
 *
 * @example
 * try {
 *   await fetchData();
 * } catch (error) {
 *   captureException(error, {
 *     component: 'Dashboard',
 *     action: 'fetchData',
 *   });
 * }
 */
export function captureException(
  error: unknown,
  context?: Record<string, any>
): string | undefined {
  if (!isEnabled) {
    logger.error('[Sentry] Error (not sent - disabled):', error, context);
    return undefined;
  }

  try {
    // Set context if provided
    if (context) {
      Sentry.setContext('error_context', context);
    }

    // Capture the exception
    const eventId = Sentry.captureException(error);

    logger.debug('[Sentry] Exception captured:', eventId);

    return eventId;
  } catch (err) {
    logger.error('[Sentry] Failed to capture exception:', err);
    return undefined;
  }
}

/**
 * Capture a message
 *
 * @example
 * captureMessage('User completed onboarding', 'info', {
 *   userId: user.id,
 *   duration: 120,
 * });
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): string | undefined {
  if (!isEnabled) {
    logger.info('[Sentry] Message (not sent - disabled):', message, context);
    return undefined;
  }

  try {
    if (context) {
      Sentry.setContext('message_context', context);
    }

    const eventId = Sentry.captureMessage(message, level);

    logger.debug('[Sentry] Message captured:', eventId);

    return eventId;
  } catch (error) {
    logger.error('[Sentry] Failed to capture message:', error);
    return undefined;
  }
}

// ============================================================================
// BREADCRUMBS
// ============================================================================

/**
 * Add a breadcrumb for tracking user actions
 *
 * @example
 * addBreadcrumb({
 *   category: 'auth',
 *   message: 'User logged in',
 *   level: 'info',
 *   data: { method: 'email' },
 * });
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}): void {
  if (!isEnabled) return;

  try {
    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level || 'info',
      data: breadcrumb.data,
      timestamp: Date.now() / 1000,
    });

    logger.debug('[Sentry] Breadcrumb added:', breadcrumb.message);
  } catch (error) {
    logger.error('[Sentry] Failed to add breadcrumb:', error);
  }
}

/**
 * Add navigation breadcrumb
 *
 * @example
 * addNavigationBreadcrumb('Dashboard', 'DashboardScreen');
 */
export function addNavigationBreadcrumb(from: string, to: string): void {
  addBreadcrumb({
    category: 'navigation',
    message: `Navigated from ${from} to ${to}`,
    level: 'info',
    data: { from, to },
  });
}

/**
 * Add API request breadcrumb
 *
 * @example
 * addAPIBreadcrumb('GET', '/subscriptions', 200);
 */
export function addAPIBreadcrumb(
  method: string,
  url: string,
  statusCode?: number
): void {
  addBreadcrumb({
    category: 'api',
    message: `${method} ${url}`,
    level: statusCode && statusCode >= 400 ? 'error' : 'info',
    data: {
      method,
      url,
      statusCode,
    },
  });
}

/**
 * Add user action breadcrumb
 *
 * @example
 * addUserActionBreadcrumb('click', 'Add Subscription Button');
 */
export function addUserActionBreadcrumb(action: string, target: string): void {
  addBreadcrumb({
    category: 'user',
    message: `${action}: ${target}`,
    level: 'info',
    data: { action, target },
  });
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Start a performance transaction
 *
 * @example
 * const transaction = startTransaction('load_subscriptions', 'task');
 * // ... do work
 * transaction.finish();
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Transaction | null {
  if (!isEnabled) return null;

  try {
    const transaction = Sentry.startTransaction({
      name,
      op,
    });

    logger.debug('[Sentry] Transaction started:', name);

    return transaction;
  } catch (error) {
    logger.error('[Sentry] Failed to start transaction:', error);
    return null;
  }
}

/**
 * Measure a specific operation
 *
 * @example
 * await measureOperation('fetchSubscriptions', async () => {
 *   return await fetchData();
 * });
 */
export async function measureOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(operationName, 'task');
  const span = transaction?.startChild({
    op: 'function',
    description: operationName,
  });

  try {
    const result = await operation();
    span?.setStatus('ok');
    return result;
  } catch (error) {
    span?.setStatus('internal_error');
    throw error;
  } finally {
    span?.finish();
    transaction?.finish();
  }
}

// ============================================================================
// TAGS AND CONTEXT
// ============================================================================

/**
 * Set a tag for filtering in Sentry
 *
 * @example
 * setTag('feature', 'premium');
 * setTag('screen', 'Dashboard');
 */
export function setTag(key: string, value: string): void {
  if (!isEnabled) return;

  try {
    Sentry.setTag(key, value);
  } catch (error) {
    logger.error('[Sentry] Failed to set tag:', error);
  }
}

/**
 * Set custom context
 *
 * @example
 * setContext('subscription', {
 *   count: 5,
 *   totalCost: 49.99,
 * });
 */
export function setContext(key: string, context: Record<string, any>): void {
  if (!isEnabled) return;

  try {
    Sentry.setContext(key, context);
  } catch (error) {
    logger.error('[Sentry] Failed to set context:', error);
  }
}

// ============================================================================
// SESSION TRACKING
// ============================================================================

/**
 * Start a new session
 */
export function startSession(): void {
  if (!isEnabled) return;

  try {
    Sentry.startSession();
    logger.debug('[Sentry] Session started');
  } catch (error) {
    logger.error('[Sentry] Failed to start session:', error);
  }
}

/**
 * End the current session
 */
export function endSession(): void {
  if (!isEnabled) return;

  try {
    Sentry.endSession();
    logger.debug('[Sentry] Session ended');
  } catch (error) {
    logger.error('[Sentry] Failed to end session:', error);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return isEnabled;
}

/**
 * Get Sentry client
 */
export function getSentryClient(): typeof Sentry | null {
  return isEnabled ? Sentry : null;
}

/**
 * Flush events to Sentry
 * Useful before app closes or critical errors
 *
 * @example
 * await flushEvents(2000); // Wait up to 2 seconds
 */
export async function flushEvents(timeout = 2000): Promise<boolean> {
  if (!isEnabled) return true;

  try {
    const result = await Sentry.flush(timeout);
    logger.debug('[Sentry] Events flushed');
    return result;
  } catch (error) {
    logger.error('[Sentry] Failed to flush events:', error);
    return false;
  }
}

// ============================================================================
// ERROR BOUNDARY INTEGRATION
// ============================================================================

/**
 * Error boundary fallback component
 * Shows error and allows user to report
 */
export function showReportDialog(eventId?: string): void {
  if (!isEnabled || !eventId) return;

  try {
    // In React Native, we handle this differently than web
    // Could show a modal to collect user feedback
    logger.info('[Sentry] Report dialog requested for:', eventId);
  } catch (error) {
    logger.error('[Sentry] Failed to show report dialog:', error);
  }
}

// Export Sentry for advanced usage
export { Sentry };
