/**
 * @fileoverview useGuardDashboard Hook
 * 
 * A custom React hook for managing guard dashboard data with automatic refresh capabilities.
 * Provides real-time yard capacity, statistics, and weather information for guard operations.
 * 
 * @author TraxYard Development Team
 * @version 1.0.0
 * @since 2024
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { refreshBus } from "@/lib/refresh/refreshBus";
import { apiFetch } from "@/lib/api/apiFetch";
import { GuardDashboardSchema, TGuardDashboardResponse } from "@/types/schemas/guardDashboard.schema";

/**
 * Type definition for guard dashboard data structure
 * 
 * @interface TGuardDashboard
 * @description Represents the complete dashboard data model for guard operations
 */
export type TGuardDashboard = {
  /** Yard information including capacity and location details */
  yard: {
    /** Unique identifier for the yard */
    id: string;
    /** Human-readable name of the yard */
    name: string;
    /** Current and maximum capacity information */
    capacity: { 
      /** Current number of trailers in the yard */
      current: number; 
      /** Maximum number of trailers the yard can accommodate */
      max: number 
    };
    /** Optional location information for the yard */
    location?: {
      /** City where the yard is located */
      city?: string | null;
      /** State or province where the yard is located */
      state?: string | null;
      /** Country where the yard is located */
      country?: string | null;
    } | null;
  };
  /** Statistical data for yard operations */
  stats: null | {
    /** Number of trailers currently in the yard */
    inCount: number;
    /** Number of trailers that have left the yard */
    outCount: number;
    /** Number of trailers currently under inspection */
    inspectionCount: number;
    /** Number of trailers with reported damage */
    damageCount: number;
  };
  /** Weather information for the yard location */
  weather: any | null;
};

/**
 * Configuration options for the useGuardDashboard hook
 * 
 * @interface Options
 */
// Options interface removed - refreshMs moved to guard layout for global control

/**
 * Custom hook for managing guard dashboard data with automatic refresh
 * 
 * This hook provides a comprehensive solution for fetching and managing guard dashboard
 * data including yard capacity, operational statistics, and weather information. It
 * features automatic refresh capabilities, request cancellation, and error handling.
 * 
 * @param {string | undefined} yardId - The unique identifier for the yard to fetch data for
 * @param {Options} opts - Configuration options for the hook
 * @param {number} [opts.refreshMs=60000] - Refresh interval in milliseconds (default: 1 minute)
 * 
 * @returns {Object} Hook state and control functions
 * @returns {TGuardDashboard | null} data - Current dashboard data or null if not loaded
 * @returns {boolean} isLoading - Loading state indicator
 * @returns {unknown | null} error - Error state if request failed
 * @returns {number | null} lastUpdated - Timestamp of last successful data update
 * @returns {Function} refetch - Manual data refresh function
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const { data, isLoading, error } = useGuardDashboard("YARD1");
 * 
 * // With custom refresh interval (30 seconds)
 * const { data, isLoading, error, refetch } = useGuardDashboard("YARD1", { 
 *   refreshMs: 30000 
 * });
 * 
 * // Conditional rendering based on state
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 * if (!data) return <NoDataMessage />;
 * 
 * return <Dashboard data={data} />;
 * ```
 * 
 * @performance
 * - Automatic request cancellation prevents race conditions
 * - Global refresh bus ensures consistent data across components
 * - Memoized refresh interval prevents unnecessary re-subscriptions
 * - AbortController cleanup prevents memory leaks
 * 
 * @security
 * - Includes credentials for authenticated requests
 * - Uses no-store cache policy for real-time data
 * - Proper error handling prevents sensitive data exposure
 * 
 * @accessibility
 * - Provides loading states for screen readers
 * - Error states for user feedback
 * - Manual refresh capability for user control
 */
export function useGuardDashboard(
  yardId: string | undefined
) {
  // Extract refresh interval with default fallback
  // refreshMs is now controlled globally by guard layout

  // State management for dashboard data and UI states
  const [data, setData] = useState<TGuardDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Ref for managing request cancellation
  const abortRef = useRef<AbortController | null>(null);

  /**
   * Fetches dashboard data from the API
   * 
   * This function handles the complete data fetching lifecycle including:
   * - Request cancellation of previous requests
   * - Loading state management
   * - Error handling and recovery
   * - Data transformation and storage
   * 
   * @async
   * @function load
   * @returns {Promise<void>}
   * 
   * @throws {Error} When API request fails (excluding AbortError)
   * 
   * @performance
   * - Cancels previous requests to prevent race conditions
   * - Uses AbortController for proper request lifecycle management
   * - Implements proper error boundaries
   */
  async function load() {
    // Early return if no yard ID provided
    if (!yardId) return;
    
    // Cancel any existing request to prevent race conditions
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Update loading state and clear previous errors
    setIsLoading(true);
    setError(null);

    try {
      // Fetch and validate dashboard data
      const json = await apiFetch<TGuardDashboardResponse>(`/api/v1/guard/dashboard?yardId=${yardId}`, { 
        signal: ctrl.signal 
      });
      
      // Validate response structure
      const parsed = GuardDashboardSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("Invalid dashboard payload");
      }
      
      // Update state with validated data
      setData(parsed.data.data);
      setLastUpdated(Date.now());
    } catch (e) {
      // Handle errors (excluding intentional request cancellations)
      if ((e as any)?.name !== "AbortError") setError(e);
    } finally {
      // Always update loading state regardless of success/failure
      setIsLoading(false);
    }
  }

  /**
   * Effect hook for managing data fetching lifecycle
   * 
   * This effect handles:
   * - Initial data load on mount
   * - Global refresh bus subscription
   * - Cleanup on unmount or dependency changes
   * - Refresh interval configuration
   * 
   * @effect
   * @dependencies [yardId, refreshMs]
   * 
   * @performance
   * - Subscribes to global refresh bus for consistent data updates
   * - Properly cleans up subscriptions to prevent memory leaks
   * - Cancels pending requests on cleanup
   */
  useEffect(() => {
    // Perform initial data fetch
    load();
    
    // Subscribe to global refresh events
    const unsubscribe = refreshBus.subscribe(load);

    // Cleanup function for effect teardown
    return () => {
      // Cancel any pending requests
      abortRef.current?.abort();
      // Unsubscribe from refresh bus
      unsubscribe();
    };
    // Note: load function is intentionally excluded from dependencies
    // to prevent infinite re-renders while maintaining proper functionality
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yardId]);

  // Return hook state and control functions
  return { 
    data,           // Current dashboard data
    isLoading,      // Loading state indicator
    error,          // Error state if request failed
    lastUpdated,    // Timestamp of last successful update
    refetch: load   // Manual refresh function
  };
}
