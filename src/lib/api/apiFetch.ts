/**
 * @fileoverview API Fetch Helper - TraxYard API Client
 * 
 * Enhanced API client with retry logic, safe JSON parsing, and comprehensive
 * error handling. Provides resilience against network issues and server errors
 * with configurable retry strategies and detailed error reporting.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - fetch: Native browser API for HTTP requests
 * - ./ApiError: Custom error class for API failures
 * 
 * @features
 * - Configurable retry logic for transient failures
 * - Safe JSON parsing with fallback handling
 * - Comprehensive error context and debugging
 * - Automatic authentication with credentials
 * - No-cache policy for real-time data
 * - Type-safe response handling
 * - Linear backoff for retry attempts
 * 
 * @example
 * ```typescript
 * import { apiFetch } from "@/lib/api/apiFetch";
 * 
 * // Basic usage with retries
 * const data = await apiFetch<MyResponseType>("/api/v1/endpoint", {
 *   retries: 2,
 *   retryDelayMs: 500
 * });
 * 
 * // With custom options
 * const data = await apiFetch<MyResponseType>("/api/v1/endpoint", {
 *   method: "POST",
 *   body: JSON.stringify(payload),
 *   headers: { "Content-Type": "application/json" },
 *   retries: 3,
 *   retryDelayMs: 250
 * });
 * ```
 */

import { ApiError } from "./ApiError";

/**
 * Extended fetch options with retry configuration
 * 
 * @interface ApiFetchOptions
 * @extends RequestInit
 * 
 * @property {number} [retries=0] - Number of retry attempts for 502/503/504 & network errors
 * @property {number} [retryDelayMs=250] - Base delay for backoff in milliseconds
 */
type ApiFetchOptions = RequestInit & {
  /** Number of retry attempts for 502/503/504 & network errors (default 0 = off) */
  retries?: number;
  /** Base delay for backoff in ms (default 250) */
  retryDelayMs?: number;
};

/**
 * Safely parses JSON response with fallback handling
 * 
 * Handles various response types including empty bodies, non-JSON content,
 * and malformed JSON with graceful degradation.
 * 
 * @param {Response} res - Fetch response object
 * @returns {Promise<unknown>} Parsed data or fallback object
 * 
 * @performance
 * - Checks content-length and content-type before parsing
 * - Avoids unnecessary JSON parsing for empty responses
 * - Provides fallback for non-JSON content
 * 
 * @security
 * - Safe parsing prevents JSON injection attacks
 * - Graceful handling of malformed responses
 * - No sensitive data exposure in error cases
 */
async function parseSafeJson(res: Response): Promise<unknown> {
  // 204/205 or empty bodies: return {}
  if (res.status === 204 || res.status === 205) return {};
  
  const len = res.headers.get("content-length");
  const ctype = res.headers.get("content-type") || "";

  if (len === "0") return {};
  
  if (!ctype.includes("application/json")) {
    // Try best-effort parse; if it fails, return raw text
    const text = await res.text();
    try { 
      return JSON.parse(text); 
    } catch { 
      return { raw: text }; 
    }
  }
  
  return res.json();
}

/**
 * Sleep utility for retry delays
 * 
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after delay
 */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Enhanced API fetch with retry logic and safe JSON parsing
 * 
 * Provides a robust API client with automatic retries for transient failures,
 * safe JSON parsing, and comprehensive error handling with detailed context.
 * 
 * @template T - Expected response type
 * @param {string} url - API endpoint URL
 * @param {ApiFetchOptions} [init={}] - Fetch configuration with retry options
 * @returns {Promise<T>} Promise resolving to typed response data
 * 
 * @throws {ApiError} When request fails with detailed context
 * 
 * @performance
 * - Uses native fetch for optimal performance
 * - Configurable retry delays to prevent server overload
 * - Early termination for non-retriable errors
 * - Efficient JSON parsing with content-type checks
 * 
 * @security
 * - Includes credentials for authenticated requests
 * - Validates response status before parsing
 * - Safe JSON parsing prevents injection attacks
 * - Detailed error context for debugging without data exposure
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const data = await apiFetch<MyResponseType>("/api/v1/endpoint");
 * 
 * // With retries for resilience
 * const data = await apiFetch<MyResponseType>("/api/v1/endpoint", {
 *   retries: 2,
 *   retryDelayMs: 500
 * });
 * 
 * // POST with retries
 * const result = await apiFetch<CreateResponse>("/api/v1/trailers", {
 *   method: "POST",
 *   body: JSON.stringify(trailerData),
 *   headers: { "Content-Type": "application/json" },
 *   retries: 3,
 *   retryDelayMs: 250
 * });
 * ```
 */
export async function apiFetch<T>(url: string, init: ApiFetchOptions = {}): Promise<T> {
  const { retries = 0, retryDelayMs = 250, ...rest } = init;

  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        ...rest,
      });

      const data = await parseSafeJson(res);

      if (!res.ok) {
        // Server sent structured error?
        const message =
          (data as any)?.message ||
          (data as any)?.error ||
          `HTTP ${res.status}`;

        throw new ApiError({
          status: res.status,
          url,
          method: (rest.method as string) || "GET",
          message,
          body: data,
        });
      }

      return data as T;
    } catch (err: any) {
      // Handle AbortError first - let callers detect & ignore cancellations
      if (err?.name === "AbortError") {
        throw err;
      }

      const retriable =
        err?.name === "TypeError" || // network
        (err instanceof ApiError && [502, 503, 504].includes(err.status));

      if (retriable && attempt < retries) {
        attempt++;
        await sleep(retryDelayMs * attempt); // simple linear backoff
        continue;
      }

      // Preserve ApiError; wrap generic errors
      if (err instanceof ApiError) throw err;

      throw new ApiError({
        status: -1,
        url,
        method: (rest.method as string) || "GET",
        message: err?.message || "Network error",
        body: undefined,
      });
    }
  }
}