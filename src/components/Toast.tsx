/**
 * Toast Notification System
 * Global toast notifications using React Native Paper Snackbar
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from './theme';

// ============================================================================
// TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  hideToast: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ============================================================================
// TOAST PROVIDER
// ============================================================================

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const [duration, setDuration] = useState(3000);
  const [action, setAction] = useState<ToastOptions['action']>(undefined);

  const showToast = useCallback((options: ToastOptions) => {
    setMessage(options.message);
    setType(options.type || 'info');
    setDuration(options.duration || 3000);
    setAction(options.action);
    setVisible(true);
  }, []);

  const showSuccess = useCallback(
    (message: string) => {
      showToast({ message, type: 'success' });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string) => {
      showToast({ message, type: 'error', duration: 5000 });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string) => {
      showToast({ message, type: 'warning', duration: 4000 });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string) => {
      showToast({ message, type: 'info' });
    },
    [showToast]
  );

  const hideToast = useCallback(() => {
    setVisible(false);
  }, []);

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#10B981',
          icon: 'check-circle' as const,
        };
      case 'error':
        return {
          backgroundColor: COLORS.error,
          icon: 'alert-circle' as const,
        };
      case 'warning':
        return {
          backgroundColor: '#F59E0B',
          icon: 'alert' as const,
        };
      case 'info':
      default:
        return {
          backgroundColor: COLORS.primary,
          icon: 'information' as const,
        };
    }
  };

  const toastStyle = getToastStyle();

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        hideToast,
      }}
    >
      {children}

      <Snackbar
        visible={visible}
        onDismiss={hideToast}
        duration={duration}
        action={
          action
            ? {
                label: action.label,
                onPress: () => {
                  action.onPress();
                  hideToast();
                },
              }
            : undefined
        }
        style={[styles.snackbar, { backgroundColor: toastStyle.backgroundColor }]}
        wrapperStyle={styles.wrapper}
      >
        {message}
      </Snackbar>
    </ToastContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access toast notifications
 *
 * @example
 * const toast = useToast();
 *
 * // Show success message
 * toast.showSuccess('Subscription added successfully!');
 *
 * // Show error message
 * toast.showError('Failed to save changes');
 *
 * // Show warning
 * toast.showWarning('This action cannot be undone');
 *
 * // Show info
 * toast.showInfo('New update available');
 *
 * // Custom toast with action
 * toast.showToast({
 *   message: 'Subscription deleted',
 *   type: 'success',
 *   duration: 5000,
 *   action: {
 *     label: 'Undo',
 *     onPress: () => restoreSubscription(),
 *   },
 * });
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    bottom: 80, // Position above bottom tab bar
  },
  snackbar: {
    borderRadius: 12,
  },
});
