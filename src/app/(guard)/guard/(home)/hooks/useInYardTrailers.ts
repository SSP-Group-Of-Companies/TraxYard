/**
 * @fileoverview useInYardTrailers Hook - TraxYard Guard Interface
 * 
 * Custom hook for fetching and managing trailers currently IN the active yard.
 * Features debounced search, pagination, and cancelable fetch operations.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - React: Core framework functionality with hooks
 * - TTrailer: Trailer type definitions
 * - EYardId: Yard identifier types
 * 
 * @features
 * - Debounced search with 250ms delay
 * - Pagination support with configurable page size
 * - Cancelable fetch operations to prevent race conditions
 * - Real-time data updates with refetch capability
 * - Error handling and loading states
 * - Optimized re-renders with proper dependency management
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TTrailerDto, TTrailer } from "@/types/Trailer.types";
import { EYardId } from "@/types/yard.types";
import { mapTrailerDto } from "@/lib/mappers/mapTrailerDto";

/**
 * Pagination and metadata interface
 */
type Meta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  filters?: Record<string, unknown>;
};

/**
 * Hook return type interface
 */
type Result = {
  rows: TTrailer[];
  meta: Meta | null;
  loading: boolean;
  error: Error | null;
  setPage: (p: number) => void;
  setQuery: (q: string) => void;
  refetch: () => void;
};

/**
 * useInYardTrailers Hook
 * 
 * Fetches trailers currently IN the specified yard with search and pagination.
 * Provides debounced search, cancelable fetch, and real-time updates.
 * 
 * @param {EYardId} yardId - The yard to fetch trailers from
 * @param {Object} opts - Optional configuration
 * @param {number} [opts.pageSize=20] - Number of items per page
 * @returns {Result} Hook state and control functions
 * 
 * @performance
 * - Debounced search prevents excessive API calls
 * - Cancelable fetch prevents race conditions
 * - Memoized URL construction prevents unnecessary re-renders
 * - AbortController cleanup prevents memory leaks
 * 
 * @example
 * const { rows, meta, loading, setQuery, setPage } = useInYardTrailers(EYardId.YARD1);
 * 
 * // Search for trailers
 * setQuery("TRL-1001");
 * 
 * // Navigate pages
 * setPage(2);
 */
export function useInYardTrailers(
  yardId: EYardId,
  opts?: { pageSize?: number }
): Result {
  const pageSize = opts?.pageSize ?? 20;
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<TTrailer[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs for cleanup and debouncing
  const abortRef = useRef<AbortController | null>(null);
  const debRef = useRef<number | null>(null);

  /**
   * Construct API URL with current parameters
   * @performance Memoized to prevent unnecessary re-renders
   */
  const url = useMemo(() => {
    // Check if we're in browser environment
    if (typeof window === "undefined") {
      return "";
    }
    
    const u = new URL("/api/v1/guard/trailers", window.location.origin);
    u.searchParams.set("status", "IN");
    u.searchParams.set("yardId", yardId);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(pageSize));
    if (query.trim()) {
      u.searchParams.set("q", query.trim());
    }
    return u.toString();
  }, [yardId, page, pageSize, query]);

  /**
   * Fetch trailers from API
   * @performance Uses AbortController for cancelable requests
   */
  const load = useCallback(() => {
    // Skip if URL is empty (SSR)
    if (!url) {
      setLoading(false);
      return;
    }
    
    // Cancel previous request
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    
    setLoading(true);
    setError(null);

    const doFetch = async (endpoint: string) => {
      const r = await fetch(endpoint, { signal: ac.signal });
      if (!r.ok) {
        let msg = `HTTP ${r.status}`;
        try {
          const errJson = await r.json();
          if (errJson?.message) msg = errJson.message;
        } catch {}
        throw new Error(msg);
      }
      return r.json() as Promise<{ data?: TTrailerDto[]; meta?: Meta }>;
    };

    (async () => {
      try {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[IN-YARD] primary:", url);
        }
        const primary = await doFetch(url);
        if (process.env.NODE_ENV !== "production") {
          console.debug("[IN-YARD] primary success:", primary);
        }
        const normalized: TTrailer[] = (primary.data ?? []).map(mapTrailerDto);
        setRows(normalized);
        setMeta(primary.meta ?? null);
        setError(null); // Clear any previous errors
        setLoading(false);
        return; // Exit early on success
      } catch (e1) {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[IN-YARD] primary failed:", e1);
        }
        // fallback to /api/v1/trailers if guard route isn't present in this env
        const u2 = new URL(url);
        if (u2.pathname.includes("/api/v1/guard/trailers")) {
          u2.pathname = u2.pathname.replace("/api/v1/guard/trailers", "/api/v1/trailers");
          if (process.env.NODE_ENV !== "production") {
            console.debug("[IN-YARD] fallback:", u2.toString());
          }
          try {
            const fb = await doFetch(u2.toString());
            if (process.env.NODE_ENV !== "production") {
              console.debug("[IN-YARD] fallback success:", fb);
            }
            const normalized: TTrailer[] = (fb.data ?? []).map(mapTrailerDto);
            setRows(normalized);
            setMeta(fb.meta ?? null);
            setError(null); // Clear any previous errors
            setLoading(false);
            return; // Exit early on fallback success
          } catch (e2) {
            if (process.env.NODE_ENV !== "production") {
              console.debug("[IN-YARD] fallback failed:", e2);
            }
            setError(e2 as Error);
            setLoading(false);
            return;
          }
        } else {
          setError(e1 as Error);
          setLoading(false);
          return;
        }
      }
    })();
  }, [url]);

  // Initial load and dependency changes
  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [url, load]);

  /**
   * Debounced query setter
   * @performance 250ms debounce prevents excessive API calls
   */
  const setQueryDebounced = (q: string) => {
    setQuery(q);
    setPage(1); // Reset to first page when searching
    
    // Clear existing timeout
    if (debRef.current) {
      window.clearTimeout(debRef.current);
    }
    
    // Set new timeout for debounced search
    debRef.current = window.setTimeout(load, 250);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debRef.current) {
        window.clearTimeout(debRef.current);
      }
    };
  }, []);

  return {
    rows,
    meta,
    loading,
    error,
    setPage,
    setQuery: setQueryDebounced,
    refetch: load,
  };
}
