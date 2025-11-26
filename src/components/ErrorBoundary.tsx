/**
 * ErrorBoundary Component
 * Catches JavaScript errors in the component tree and displays fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button as PaperButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from './theme';
import { logError } from '@/utils';
import { captureException } from '@/services/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: any[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error locally
    logError(error, {
      component: 'ErrorBoundary',
      errorInfo: errorInfo.componentStack,
    });

    // Send to Sentry
    captureException(error, {
      component: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.props.resetOnPropsChange && this.state.hasError) {
      const hasPropsChanged = this.props.resetOnPropsChange.some(
        (prop, index) => prop !== prevProps.resetOnPropsChange?.[index]
      );

      if (hasPropsChanged) {
        this.resetError();
      }
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="alert-octagon"
                size={80}
                color={COLORS.error}
              />
            </View>

            <Text style={styles.title}>Something went wrong</Text>

            <Text style={styles.message}>
              We're sorry, but something unexpected happened. The error has been logged and
              we'll look into it.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Mode):</Text>
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                  {this.state.error.stack && (
                    <Text style={styles.stackText}>{this.state.error.stack}</Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.actions}>
              <PaperButton
                mode="contained"
                onPress={this.resetError}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Try Again
              </PaperButton>

              <PaperButton
                mode="outlined"
                onPress={() => {
                  console.log('Navigate to support');
                }}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Contact Support
              </PaperButton>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${COLORS.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 360,
  },
  errorDetails: {
    width: '100%',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  errorBox: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  stackText: {
    fontSize: 10,
    color: COLORS.gray,
    fontFamily: 'monospace',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
