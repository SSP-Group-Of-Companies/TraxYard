/**
 * @fileoverview Trailer Search Hook - TraxYard Global Trailer Search
 * 
 * Provides global trailer search functionality across all yards with debounced
 * search, pagination, and robust error handling. Uses the same shape-agnostic
 * parsing and per-item validation as the yard-specific trailer hooks.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - @/lib/api/apiFetch - Robust API client with retry logic
 * - @/lib/api/normalize - Shape-agnostic payload extraction
 * - @/types/schemas/trailers.schema - Zod validation schemas
 * - @/types/frontend/trailer.dto - Type definitions
 * - @/lib/mappers/mapTrailerDto - DTO to UI model conversion
 * 
 * @features
 * - Global trailer search via guard API (not yard-scoped)
 * - Debounced search input (250ms delay)
 * - Pagination with configurable page size
 * - Shape-agnostic API response parsing
 * - Per-item validation with graceful error handling
 * - Cancelable requests with AbortController
 * - SSR-safe URL construction
 * - Comprehensive error handling and retry logic
 * 
 * @example
 * ```typescript
 * import { useTrailerSearch } from "@/app/(guard)/guard/(home)/hooks/useTrailerSearch";
 * 
 * function TrailerSearchComponent() {
 *   const { 
 *     rows, 
 *     meta, 
 *     loading, 
 *     error, 
 *     page, 
 *     setPage, 
 *     setQuery, 
 *     query, 
 *     refetch 
 *   } = useTrailerSearch({
 *     pageSize: 20,
 *     enabled: true,
 *     query: ""
 *   });
 * 
 *   return (
 *     <div>
 *       <input 
 *         value={query}
 *         onChange={(e) => setQuery(e.target.value)}
 *         placeholder="Search trailers..."
 *       />
 *       {loading && <div>Loading...</div>}
 *       {error && <div>Error: {error.message}</div>}
 *       {rows.map(trailer => (
 *         <div key={trailer.id}>{trailer.trailerNumber}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/apiFetch";
import { extractTrailersAndMeta } from "@/lib/api/normalize";
import { TrailerDtoSchema } from "@/types/schemas/trailers.schema";
import type { TTrailerDto, TTrailerUI } from "@/types/frontend/trailer.dto";
import { mapTrailerDto } from "@/lib/mappers/mapTrailerDto";

/**
 * Pagination metadata for search results
 * 
 * @interface Meta
 * @property {number} page - Current page number (1-based)
 * @property {number} pageSize - Number of items per page
 * @property {number} total - Total number of items across all pages
 * @property {number} totalPages - Total number of pages
 * @property {boolean} [hasPrev] - Whether previous page exists
 * @property {boolean} [hasNext] - Whether next page exists
 */
type Meta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev?: boolean;
  hasNext?: boolean;
};

/**
 * Hook options for trailer search configuration
 * 
 * @interface UseTrailerSearchOptions
 * @property {number} [pageSize] - Number of items per page (default: 20)
 * @property {boolean} [enabled] - Whether search is enabled (default: true)
 * @property {string} [query] - Initial search query (default: "")
 */
type UseTrailerSearchOptions = {
  pageSize?: number;
  enabled?: boolean;
  query?: string;
};

/**
 * Return type for the useTrailerSearch hook
 * 
 * @interface UseTrailerSearchReturn
 * @property {TTrailerUI[]} rows - Array of trailer UI models
 * @property {Meta | null} meta - Pagination metadata
 * @property {boolean} loading - Whether search is currently loading
 * @property {Error | null} error - Current error state
 * @property {number} page - Current page number
 * @property {(page: number) => void} setPage - Function to change page
 * @property {(query: string) => void} setQuery - Function to update search query
 * @property {string} query - Current raw search query
 * @property {() => void} refetch - Function to manually refetch data
 */
type UseTrailerSearchReturn = {
  rows: TTrailerUI[];
  meta: Meta | null;
  loading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  setQuery: (query: string) => void;
  query: string;
  refetch: () => void;
};

/**
 * Global trailer search hook with debounced search and pagination
 * 
 * Provides comprehensive trailer search functionality across all yards with
 * robust error handling, shape-agnostic API parsing, and per-item validation.
 * 
 * @param {UseTrailerSearchOptions} [opts] - Configuration options
 * @returns {UseTrailerSearchReturn} Search state and control functions
 * 
 * @performance
 * - Debounced search input (250ms delay) prevents excessive API calls
 * - Cancelable requests prevent race conditions
 * - Per-item validation with graceful error handling
 * - SSR-safe URL construction
 * 
 * @error_handling
 * - Network errors are caught and surfaced
 * - Invalid items are logged in development and skipped
 * - AbortError is ignored (expected during cancellation)
 * - API errors are preserved with original message
 * 
 * @example
 * ```typescript
 * const { rows, loading, setQuery } = useTrailerSearch({
 *   pageSize: 20,
 *   enabled: true,
 *   query: "ABC123"
 * });
 * ```
 */
export function useTrailerSearch(opts?: UseTrailerSearchOptions): UseTrailerSearchReturn {
  const pageSize = opts?.pageSize ?? 20;
  const enabled = opts?.enabled ?? true;

  // State management
  const [page, setPage] = useState(1);
  const [rawQuery, setRawQuery] = useState(opts?.query ?? "");
  const rawQueryRef = useRef<string>(opts?.query ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(opts?.query ?? "");

  const [rows, setRows] = useState<TTrailerUI[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Request cancellation
  const abortRef = useRef<AbortController | null>(null);
  const inflightUrlRef = useRef<string | null>(null);

  // Debounced search input (250ms delay)
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(rawQuery.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [rawQuery]);

  // SSR-safe URL construction
  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    
    const url = new URL("/api/v1/guard/trailers", window.location.origin);
    
    // Add search query if provided
    if (debouncedQuery) {
      url.searchParams.set("q", debouncedQuery);
    }
    
    // Add pagination parameters
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(pageSize));
    
    return url.toString();
  }, [debouncedQuery, page, pageSize]);

  /**
   * Fetches and processes trailer data from the API
   * 
   * Uses shape-agnostic parsing to extract trailer items and metadata from
   * various API response formats, then validates each item individually
   * using Zod schemas for type safety.
   * 
   * @param {string} endpoint - API endpoint URL
   * @param {AbortSignal} signal - Abort signal for request cancellation
   * @returns {Promise<{data: TTrailerUI[], meta: Meta}>} Processed trailer data
   * 
   * @throws {Error} Network or API errors
   * @throws {ApiError} Structured API errors with status and message
   */
  const doFetch = useCallback(async (endpoint: string, signal: AbortSignal) => {
    // Fetch data with retry logic and error handling
    const json = await apiFetch<any>(endpoint, { signal, retries: 2 });
    
    // Extract items and metadata using shape-agnostic parser
    const { items, meta } = extractTrailersAndMeta(json);

    // Validate each item individually and collect valid ones
    const valid: TTrailerDto[] = [];
    for (const item of items ?? []) {
      const parsed = TrailerDtoSchema.safeParse(item);
      if (parsed.success) {
        valid.push(parsed.data);
      } else if (process.env.NODE_ENV === "development") {
        // Log invalid items in development for debugging
        console.debug(
          "[TRAILER-SEARCH] Skipping invalid trailer item:",
          parsed.error.issues.map(i => i.path.join(".")).join(", ")
        );
      }
    }

    // Convert DTOs to UI models
    const data = valid.map(mapTrailerDto);

    // Normalize metadata with safe defaults
    const m = meta ?? {} as any;
    const mPage = m.page ?? page;
    const mPageSize = m.pageSize ?? pageSize;
    const mTotal = m.total ?? valid.length;
    const mTotalPages = m.totalPages ?? Math.max(1, Math.ceil(mTotal / mPageSize));

    const normalizedMeta: Meta = {
      page: mPage,
      pageSize: mPageSize,
      total: mTotal,
      totalPages: mTotalPages,
      hasPrev: m.hasPrev ?? mPage > 1,
      hasNext: m.hasNext ?? mPage < mTotalPages,
    };

    return { data, meta: normalizedMeta };
  }, [pageSize, page]);

  /**
   * Loads trailer data from the API
   * 
   * Handles request cancellation, error states, and loading states.
   * Automatically cancels previous requests when new ones are initiated.
   */
  const load = useCallback(() => {
    if (!url || !enabled) {
      setLoading(false);
      return;
    }

    // Cancel any existing request
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setLoading(true);
    setError(null);

    inflightUrlRef.current = url;
    // Execute fetch with proper error handling
    (async () => {
      try {
        const { data, meta } = await doFetch(url, abortController.signal);
        if (inflightUrlRef.current === url) {
          setRows(data);
          setMeta(meta);
        }
      } catch (err: any) {
        // Only set error if it's not an abort error (expected during cancellation)
        if (err?.name !== "AbortError") {
          setError(err);
        }
      } finally {
        // Only update loading state if this is still the current request
        if (abortRef.current === abortController) {
          setLoading(false);
        }
      }
    })();
  }, [url, enabled, doFetch]);

  // Initial load and reactive updates
  useEffect(() => {
    load();
    
    // Cleanup: cancel any pending requests on unmount
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  /**
   * Updates the search query and resets to first page
   * 
   * @param {string} query - New search query
   */
  const setQuery = (query: string) => {
    const next = query ?? "";
    setRawQuery(next);
    if (next.trim() !== rawQueryRef.current.trim()) {
      setPage(1);
      rawQueryRef.current = next;
    }
  };

  return {
    rows,
    meta,
    loading,
    error,
    page,
    setPage,
    setQuery,
    query: rawQuery,
    refetch: load,
  };
}
