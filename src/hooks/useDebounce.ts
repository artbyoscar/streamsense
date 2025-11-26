/**
 * useDebounce Hook
 * Debounces a value with a specified delay
 */

import { useState, useEffect } from 'react';

/**
 * Debounce a value with a delay
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout on value change or unmount
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
