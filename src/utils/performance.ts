/**
 * Performance Optimization Utilities
 * Tools for monitoring and improving app performance
 */

import { useCallback, useRef, useEffect } from 'react';
import { logger } from './logger';

// ============================================================================
// DEBOUNCE
// ============================================================================

/**
 * Debounce a function to limit how often it can be called
 *
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   fetchResults(query);
 * }, 300);
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function debounced(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// ============================================================================
// THROTTLE
// ============================================================================

/**
 * Throttle a function to limit how often it can be called
 *
 * @example
 * const throttledScroll = throttle(() => {
 *   updateScrollPosition();
 * }, 100);
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================================================
// PERFORMANCE MEASUREMENT
// ============================================================================

/**
 * Measure execution time of a function
 *
 * @example
 * const result = await measurePerformance('fetchData', async () => {
 *   return await fetchData();
 * });
 */
export async function measurePerformance<T>(
  label: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    logger.debug(`[Performance] ${label}: ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`[Performance] ${label} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * useDebounce hook for debouncing values
 *
 * @example
 * const debouncedSearchQuery = useDebounce(searchQuery, 300);
 *
 * useEffect(() => {
 *   // This will only run 300ms after user stops typing
 *   fetchResults(debouncedSearchQuery);
 * }, [debouncedSearchQuery]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useThrottle hook for throttling values
 *
 * @example
 * const throttledScrollY = useThrottle(scrollY, 100);
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(
      function () {
        if (Date.now() - lastRan.current >= limit) {
          setThrottledValue(value);
          lastRan.current = Date.now();
        }
      },
      limit - (Date.now() - lastRan.current)
    );

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * useDebouncedCallback hook for debouncing callbacks
 *
 * @example
 * const debouncedSave = useDebouncedCallback((data) => {
 *   saveData(data);
 * }, 500);
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Monitor component render performance
 *
 * @example
 * const PerformanceMonitor = () => {
 *   useRenderPerformance('MyComponent');
 *   return <View />;
 * };
 */
export function useRenderPerformance(componentName: string): void {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  renderCount.current += 1;

  useEffect(() => {
    const renderTime = Date.now() - lastRenderTime.current;

    if (__DEV__) {
      logger.debug(`[Render] ${componentName} rendered ${renderCount.current} times`, {
        renderTime: `${renderTime}ms`,
      });
    }

    lastRenderTime.current = Date.now();
  });
}

/**
 * Track why a component re-rendered
 *
 * @example
 * useWhyDidYouUpdate('MyComponent', { prop1, prop2, state1 });
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, any>): void {
  const previousProps = useRef<Record<string, any>>();

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current?.[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current?.[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0 && __DEV__) {
        logger.debug(`[${name}] Changed props:`, changedProps);
      }
    }

    previousProps.current = props;
  });
}

// ============================================================================
// MEMOIZATION HELPERS
// ============================================================================

/**
 * Deep comparison for React.memo
 *
 * @example
 * export const MyComponent = React.memo(Component, deepEqual);
 */
export function deepEqual(prevProps: any, nextProps: any): boolean {
  return JSON.stringify(prevProps) === JSON.stringify(nextProps);
}

/**
 * Shallow comparison for React.memo (default behavior)
 */
export function shallowEqual(prevProps: any, nextProps: any): boolean {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// STARTUP PERFORMANCE
// ============================================================================

let appStartTime: number | null = null;

/**
 * Mark app startup time
 */
export function markAppStart(): void {
  appStartTime = Date.now();
  logger.info('[Performance] App start marked');
}

/**
 * Measure time to interactive (TTI)
 */
export function measureTimeToInteractive(screenName: string): void {
  if (!appStartTime) {
    logger.warn('[Performance] App start time not marked');
    return;
  }

  const tti = Date.now() - appStartTime;
  logger.info(`[Performance] Time to Interactive (${screenName}): ${tti}ms`);
}

// ============================================================================
// REACT IMPORTS (needed for hooks)
// ============================================================================

import React from 'react';
