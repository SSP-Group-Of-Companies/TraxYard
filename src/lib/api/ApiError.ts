/**
 * @fileoverview API Error Class - TraxYard API Client
 * 
 * First-class error handling for API operations with comprehensive context
 * and debugging information. Provides structured error reporting with
 * HTTP status codes, request details, and response body information.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - None (pure TypeScript class)
 * 
 * @features
 * - Structured error information with HTTP context
 * - Request/response debugging details
 * - Customizable error messages
 * - String representation for logging
 * - Type-safe error handling
 * 
 * @example
 * ```typescript
 * import { ApiError } from "@/lib/api/ApiError";
 * 
 * // Create error with context
 * const error = new ApiError({
 *   status: 404,
 *   url: "/api/v1/trailers",
 *   method: "GET",
 *   message: "Trailer not found",
 *   body: { error: "Invalid trailer ID" }
 * });
 * 
 * // Log error details
 * console.error(error.toString()); // [GET 404] /api/v1/trailers — Trailer not found
 * ```
 */

/**
 * API Error Class
 * 
 * Represents errors that occur during API operations with comprehensive
 * context including HTTP status, request details, and response information.
 * 
 * @class ApiError
 * @extends Error
 * 
 * @property {string} name - Error type identifier ("ApiError")
 * @property {number} status - HTTP status code
 * @property {string} url - Request URL that failed
 * @property {string} method - HTTP method used
 * @property {unknown} [body] - Response body (if available)
 * 
 * @example
 * ```typescript
 * try {
 *   await apiFetch("/api/v1/trailers");
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.log(`Request failed: ${error.status} ${error.method} ${error.url}`);
 *     console.log(`Response:`, error.body);
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /** Error type identifier for instanceof checks */
  name = "ApiError";
  
  /** HTTP status code from the failed request */
  status: number;
  
  /** URL that was requested when the error occurred */
  url: string;
  
  /** HTTP method used for the request */
  method: string;
  
  /** Response body from the failed request (if available) */
  body?: unknown;

  /**
   * Creates a new ApiError instance
   * 
   * @param {Object} opts - Error configuration options
   * @param {number} opts.status - HTTP status code
   * @param {string} opts.url - Request URL
   * @param {string} [opts.method="GET"] - HTTP method
   * @param {string} [opts.message] - Custom error message
   * @param {unknown} [opts.body] - Response body
   * 
   * @example
   * ```typescript
   * const error = new ApiError({
   *   status: 400,
   *   url: "/api/v1/trailers",
   *   method: "POST",
   *   message: "Validation failed",
   *   body: { errors: ["trailerNumber is required"] }
   * });
   * ```
   */
  constructor(opts: { 
    status: number; 
    url: string; 
    method?: string; 
    message?: string; 
    body?: unknown 
  }) {
    super(opts.message || `HTTP ${opts.status}`);
    this.status = opts.status;
    this.url = opts.url;
    this.method = opts.method || "GET";
    this.body = opts.body;
  }

  /**
   * String representation of the error for logging
   * 
   * @returns {string} Formatted error string with context
   * 
   * @example
   * ```typescript
   * const error = new ApiError({
   *   status: 404,
   *   url: "/api/v1/trailers/123",
   *   method: "GET",
   *   message: "Not found"
   * });
   * 
   * console.log(error.toString()); // [GET 404] /api/v1/trailers/123 — Not found
   * ```
   */
  toString() {
    return `[${this.method} ${this.status}] ${this.url} — ${this.message}`;
  }
}
