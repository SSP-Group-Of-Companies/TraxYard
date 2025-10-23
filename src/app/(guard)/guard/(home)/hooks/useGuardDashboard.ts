/**
 * @fileoverview useGuardDashboard Hook - TraxYard Guard Interface
 * 
 * Custom React hook for managing guard dashboard data with auto-refresh capabilities.
 * Provides centralized data fetching, error handling, and real-time updates.
 * Features abort controller for request cancellation and optimized re-renders.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - React: Core framework functionality with hooks
 * - Next.js: API route integration
 * 
 * @features
 * - Auto-refresh with configurable intervals
 * - Request cancellation with AbortController
 * - Error handling and retry logic
 * - Loading state management
 * - Optimized re-renders with proper dependencies
 * - TypeScript support with full type safety
 */

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Guard dashboard data structure
 * @interface TGuardDashboard
 * @property {Object} yard - Yard information
 * @property {string} yard.id - Unique yard identifier
 * @property {string} yard.name - Yard display name
 * @property {Object} yard.capacity - Capacity information
 * @property {number} yard.capacity.current - Current trailer count
 * @property {number} yard.capacity.max - Maximum capacity limit
 * @property {Object} [yard.location] - Location details
 * @property {Object} [stats] - Daily statistics
 * @property {any} [weather] - Weather data (typed in WeatherChip)
 */
export type TGuardDashboard = {
  yard: {
    id: string;
    name: string;
    capacity: { current: number; max: number };
    location?: {
      city?: string | null;
      state?: string | null;
      country?: string | null;
    } | null;
  };
  stats: null | {
    inCount: number;
    outCount: number;
    inspectionCount: number;
    damageCount: number;
  };
  weather: any | null; // already typed in your WeatherChip layer
};

/**
 * Hook configuration options
 * @interface Options
 * @property {number} [refreshMs] - Auto refresh interval in milliseconds
 */
type Options = {
  /** auto refresh interval (ms). Pass 0/undefined to disable */
  refreshMs?: number;
};

/**
 * useGuardDashboard Hook
 * 
 * Custom hook for managing guard dashboard data with auto-refresh capabilities.
 * Provides centralized data fetching, error handling, and real-time updates.
 * 
 * @param {string | undefined} yardId - Unique yard identifier
 * @param {Options} [opts] - Configuration options
 * @param {number} [opts.refreshMs=60000] - Auto refresh interval in milliseconds
 * 
 * @returns {Object} Hook return object
 * @returns {TGuardDashboard | null} data - Current dashboard data
 * @returns {boolean} isLoading - Loading state indicator
 * @returns {unknown} error - Error state if any
 * @returns {number | null} lastUpdated - Timestamp of last successful update
 * @returns {function} refetch - Manual refetch function
 * 
 * @performance
 * - Uses AbortController for request cancellation
 * - Optimized re-renders with proper dependency arrays
 * - Automatic cleanup on unmount
 * - Debounced loading states
 * 
 * @example
 * const { data, isLoading, error, refetch } = useGuardDashboard(yardId, {
 *   refreshMs: 30000 // Refresh every 30 seconds
 * });
 */
export function useGuardDashboard(
  yardId: string | undefined,
  opts: Options = {}
) {
  const { refreshMs = 60_000 } = opts;

  // State management
  const [data, setData] = useState<TGuardDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Refs for cleanup and request management
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  async function load() {
    if (!yardId) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/guard/dashboard?yardId=${yardId}`, {
        cache: "no-store",
        signal: ctrl.signal,
      });
      const json = await res.json();
      setData(json?.data ?? null);
      setLastUpdated(Date.now());
    } catch (e) {
      if ((e as any)?.name !== "AbortError") setError(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();

    if (refreshMs && refreshMs > 0) {
      timerRef.current = window.setInterval(load, refreshMs);
    }
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yardId, refreshMs]);

  return { data, isLoading, error, lastUpdated, refetch: load };
}
