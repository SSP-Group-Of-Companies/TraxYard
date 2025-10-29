/**
 * @fileoverview useOptimizedLoading Hook - TraxYard Hooks Library
 * 
 * Custom React hook for optimized loading state management with debouncing
 * and minimum loading time to prevent flickering and improve user experience.
 * Features configurable debounce and minimum loading durations.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - React: Core framework functionality with hooks
 * 
 * @features
 * - Debounced loading state to prevent flickering
 * - Minimum loading time for better perceived performance
 * - Configurable debounce and minimum loading durations
 * - Callback support for loading start/end events
 * - Automatic cleanup on unmount
 * - TypeScript support with full type safety
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook configuration options interface
 * @interface UseOptimizedLoadingOptions
 * @property {number} [debounceMs=100] - Debounce delay in milliseconds
 * @property {number} [minLoadingTime=200] - Minimum loading time in milliseconds
 * @property {function} [onLoadingStart] - Callback when loading starts
 * @property {function} [onLoadingEnd] - Callback when loading ends
 */
interface UseOptimizedLoadingOptions {
  debounceMs?: number;
  minLoadingTime?: number;
  onLoadingStart?: () => void;
  onLoadingEnd?: () => void;
}

/**
 * useOptimizedLoading Hook
 * 
 * Custom hook for optimized loading state management with debouncing and minimum loading time.
 * Prevents flickering and improves perceived performance.
 * 
 * @param {UseOptimizedLoadingOptions} [options] - Configuration options
 * @returns {Object} Hook return object
 * @returns {boolean} isLoading - Current loading state
 * @returns {function} startLoading - Function to start loading
 * @returns {function} stopLoading - Function to stop loading
 * @returns {function} setLoading - Function to set loading state directly
 * 
 * @performance
 * - Debounced loading state prevents flickering
 * - Minimum loading time improves perceived performance
 * - Automatic cleanup prevents memory leaks
 * - Optimized re-renders with proper dependency arrays
 * 
 * @example
 * const { isLoading, startLoading, stopLoading } = useOptimizedLoading({
 *   debounceMs: 150,
 *   minLoadingTime: 300,
 *   onLoadingStart: () => console.log('Loading started'),
 *   onLoadingEnd: () => console.log('Loading ended')
 * });
 */
export function useOptimizedLoading(options: UseOptimizedLoadingOptions = {}) {
  const {
    debounceMs = 100,
    minLoadingTime = 200,
    onLoadingStart,
    onLoadingEnd
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const minTimeRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useCallback(() => {
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setIsLoading(true);
      setLoadingStartTime(Date.now());
      onLoadingStart?.();
    }, debounceMs);
  }, [debounceMs, onLoadingStart]);

  const stopLoading = useCallback(() => {
    // Clear debounce if still pending
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!isLoading) return;

    const elapsed = loadingStartTime ? Date.now() - loadingStartTime : 0;
    const remaining = Math.max(0, minLoadingTime - elapsed);

    if (remaining > 0) {
      minTimeRef.current = setTimeout(() => {
        setIsLoading(false);
        setLoadingStartTime(null);
        onLoadingEnd?.();
      }, remaining);
    } else {
      setIsLoading(false);
      setLoadingStartTime(null);
      onLoadingEnd?.();
    }
  }, [isLoading, loadingStartTime, minLoadingTime, onLoadingEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (minTimeRef.current) clearTimeout(minTimeRef.current);
    };
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    setLoading: (loading: boolean) => {
      if (loading) startLoading();
      else stopLoading();
    }
  };
}

