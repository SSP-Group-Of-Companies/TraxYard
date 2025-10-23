/**
 * @fileoverview useRetryableFetch Hook - TraxYard Hooks Library
 * 
 * Custom React hook for robust data fetching with automatic retry logic,
 * exponential backoff, and request cancellation. Features configurable
 * retry strategies and error handling.
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
 * - Automatic retry with exponential backoff
 * - Request cancellation with AbortController
 * - Configurable retry strategies
 * - Error handling and recovery
 * - Loading state management
 * - TypeScript support with full type safety
 */

import { useState, useCallback, useRef } from 'react';

/**
 * Retry configuration options interface
 * @interface RetryOptions
 * @property {number} [maxRetries=3] - Maximum number of retry attempts
 * @property {number} [baseDelay=1000] - Base delay in milliseconds
 * @property {number} [maxDelay=10000] - Maximum delay in milliseconds
 * @property {number} [backoffMultiplier=2] - Exponential backoff multiplier
 */
interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Hook return object interface
 * @interface RetryableFetchResult
 * @property {T | null} data - Fetched data
 * @property {boolean} isLoading - Loading state
 * @property {Error | null} error - Error state
 * @property {function} retry - Manual retry function
 * @property {number} retryCount - Current retry count
 */
interface RetryableFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => Promise<void>;
  retryCount: number;
}

/**
 * useRetryableFetch Hook
 * 
 * Custom hook for robust data fetching with automatic retry logic and exponential backoff.
 * Provides request cancellation and configurable retry strategies.
 * 
 * @param {string} url - URL to fetch data from
 * @param {RetryOptions} [options] - Retry configuration options
 * @returns {RetryableFetchResult<T>} Hook return object
 * 
 * @performance
 * - Automatic retry with exponential backoff
 * - Request cancellation prevents memory leaks
 * - Optimized re-renders with proper state management
 * - Efficient error handling and recovery
 * 
 * @example
 * const { data, isLoading, error, retry } = useRetryableFetch<ApiResponse>('/api/data', {
 *   maxRetries: 5,
 *   baseDelay: 1000,
 *   maxDelay: 10000,
 *   backoffMultiplier: 2
 * });
 */
export function useRetryableFetch<T>(
  url: string,
  options: RetryOptions = {}
): RetryableFetchResult<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = baseDelay * Math.pow(backoffMultiplier, attempt);
    return Math.min(delay, maxDelay);
  }, [baseDelay, backoffMultiplier, maxDelay]);

  const fetchWithRetry = useCallback(async (attempt: number = 0): Promise<void> => {
    if (attempt >= maxRetries) {
      setError(new Error(`Failed after ${maxRetries} attempts`));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(url, {
        signal: abortController.signal,
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result.data || result);
      setRetryCount(0);
      setIsLoading(false);
    } catch (err) {
      if (abortController.signal.aborted) {
        return; // Request was cancelled
      }

      if (attempt < maxRetries - 1) {
        const delay = calculateDelay(attempt);
        setRetryCount(attempt + 1);
        
        setTimeout(() => {
          fetchWithRetry(attempt + 1);
        }, delay);
      } else {
        setError(err as Error);
        setIsLoading(false);
      }
    }
  }, [url, maxRetries, calculateDelay]);

  const retry = useCallback(async () => {
    setRetryCount(0);
    await fetchWithRetry();
  }, [fetchWithRetry]);

  return {
    data,
    isLoading,
    error,
    retry,
    retryCount
  };
}
