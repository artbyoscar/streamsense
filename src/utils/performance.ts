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
// RECOMMENDATION PERFORMANCE TRACKING
// ============================================================================

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  details?: Record<string, any>;
}

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 100; // Keep only last 100 metrics

/**
 * Performance timer for recommendation operations
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private details?: Record<string, any>;

  constructor(operation: string, details?: Record<string, any>) {
    this.operation = operation;
    this.details = details;
    this.startTime = Date.now();
  }

  end(): number {
    const duration = Date.now() - this.startTime;
    this.logPerformance(duration);
    return duration;
  }

  private logPerformance(duration: number): void {
    const metric: PerformanceMetric = {
      operation: this.operation,
      duration,
      timestamp: Date.now(),
      details: this.details,
    };

    // Add to metrics array
    metrics.push(metric);

    // Keep only last MAX_METRICS
    if (metrics.length > MAX_METRICS) {
      metrics.shift();
    }

    // Log to console with color coding
    const indicator = duration < 100 ? '✓' : duration < 500 ? '⚠' : '✗';
    const detailsStr = this.details ? ` ${JSON.stringify(this.details)}` : '';
    console.log(`[Perf] ${indicator} ${this.operation}: ${duration}ms${detailsStr}`);
  }
}

/**
 * Batch timer for measuring multiple operations
 */
export class BatchTimer {
  private operation: string;
  private batchSize: number;
  private startTime: number;

  constructor(operation: string, batchSize: number) {
    this.operation = operation;
    this.batchSize = batchSize;
    this.startTime = Date.now();
  }

  end(): void {
    const duration = Date.now() - this.startTime;
    const avgPerItem = duration / this.batchSize;

    const metric: PerformanceMetric = {
      operation: this.operation,
      duration,
      timestamp: Date.now(),
      details: {
        batchSize: this.batchSize,
        avgPerItem: Math.round(avgPerItem),
      },
    };

    metrics.push(metric);
    if (metrics.length > MAX_METRICS) {
      metrics.shift();
    }

    console.log(`[Perf] ${this.operation}: ${duration}ms (${this.batchSize} items, ${Math.round(avgPerItem)}ms/item)`);
  }
}

/**
 * Get all performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetric[] {
  return [...metrics];
}

/**
 * Get metrics summary
 */
export function getPerformanceSummary(): Record<string, {
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
}> {
  const summary: Record<string, any> = {};

  metrics.forEach((metric) => {
    if (!summary[metric.operation]) {
      summary[metric.operation] = {
        count: 0,
        total: 0,
        min: Infinity,
        max: 0,
      };
    }

    const s = summary[metric.operation];
    s.count++;
    s.total += metric.duration;
    s.min = Math.min(s.min, metric.duration);
    s.max = Math.max(s.max, metric.duration);
  });

  // Convert to final format
  Object.keys(summary).forEach((key) => {
    const s = summary[key];
    summary[key] = {
      count: s.count,
      avgDuration: Math.round(s.total / s.count),
      minDuration: s.min,
      maxDuration: s.max,
    };
  });

  return summary;
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics(): void {
  metrics.length = 0;
  console.log('[Perf] Metrics cleared');
}

// ============================================================================
// REACT IMPORTS (needed for hooks)
// ============================================================================

import React from 'react';
