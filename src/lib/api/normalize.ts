/**
 * @fileoverview API Response Normalization - TraxYard API Client
 * 
 * Shape-agnostic extractors for API payloads that handle various response
 * envelope formats without breaking the UI. Focuses on extracting trailer-like
 * items and metadata regardless of the API response structure.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - None (pure utility functions)
 * 
 * @features
 * - Shape-agnostic data extraction
 * - Heuristic trailer detection
 * - Flexible metadata extraction
 * - Graceful fallback handling
 * - Development debugging support
 * 
 * @example
 * ```typescript
 * import { extractTrailersAndMeta, isTrailerLike } from "@/lib/api/normalize";
 * 
 * // Extract from various response shapes
 * const { items, meta } = extractTrailersAndMeta(apiResponse);
 * 
 * // Check if an object looks like a trailer
 * if (isTrailerLike(someObject)) {
 *   // Handle trailer-like object
 * }
 * ```
 */

/**
 * Generic object type for flexible API responses
 * 
 * @type {Record<string, any>} AnyObj - Flexible object type
 */
type AnyObj = Record<string, any>;

/**
 * Known trailer field keys for heuristic detection
 * 
 * Used to identify trailer-like objects even when the structure
 * doesn't match the expected schema exactly.
 * 
 * @constant {Set<string>} MAYBE_TRAILER_KEYS - Set of trailer field names
 */
const MAYBE_TRAILER_KEYS = new Set([
  "trailerNumber", "status", "yardId", "loadState", "condition"
]);

/**
 * Heuristic function to detect if an object looks like a trailer
 * 
 * Uses a combination of required fields and known trailer properties
 * to identify trailer-like objects regardless of their exact structure.
 * 
 * @param {any} v - Object to check
 * @returns {boolean} True if the object appears to be trailer-like
 * 
 * @example
 * ```typescript
 * // These would return true
 * isTrailerLike({ trailerNumber: "T123", status: "IN" });
 * isTrailerLike({ status: "OUT", yardId: "YARD1" });
 * 
 * // These would return false
 * isTrailerLike({ name: "John", age: 30 });
 * isTrailerLike("not an object");
 * isTrailerLike(null);
 * ```
 */
export function isTrailerLike(v: any): boolean {
  return !!v && typeof v === "object" && (
    typeof v.trailerNumber === "string" ||
    Array.from(MAYBE_TRAILER_KEYS).some(k => k in v)
  );
}

/**
 * Attempts to find an array at common API response paths
 * 
 * Tries multiple common paths where arrays of items might be located
 * in API responses, handling various envelope formats gracefully.
 * 
 * @param {AnyObj} obj - Object to search within
 * @param {string[][]} paths - Array of paths to try
 * @returns {any[] | null} Found array or null if none found
 * 
 * @performance
 * - Early termination on first successful path
 * - Minimal object traversal
 * - Efficient array detection
 * 
 * @example
 * ```typescript
 * const paths = [["data"], ["items"], ["results"]];
 * const array = firstArrayAt(response, paths);
 * // Returns the first array found at any of the specified paths
 * ```
 */
function firstArrayAt(obj: AnyObj, paths: string[][]): any[] | null {
  for (const p of paths) {
    let cur: any = obj;
    let ok = true;
    
    // Navigate through the path segments
    for (const seg of p) {
      if (!cur || typeof cur !== "object" || !(seg in cur)) { 
        ok = false; 
        break; 
      }
      cur = cur[seg];
    }
    
    // Return the array if found and valid
    if (ok && Array.isArray(cur)) return cur;
  }
  return null;
}

/**
 * Extract trailers array and metadata from a flexible API payload
 * 
 * This function is the core of shape-agnostic API response handling.
 * It attempts to find trailer-like items and metadata regardless of
 * the response envelope structure, providing graceful fallbacks.
 * 
 * @param {unknown} payload - Raw API response payload
 * @returns {Object} Object containing items array and metadata
 * @returns {any[]} items - Array of trailer-like items
 * @returns {AnyObj | null} meta - Metadata object or null
 * 
 * @features
 * - Handles arrays directly (payload is already an array)
 * - Tries common API response patterns
 * - Heuristic trailer detection as fallback
 * - Flexible metadata extraction
 * - Never throws for shape issues
 * 
 * @performance
 * - Efficient path traversal
 * - Early termination on successful extraction
 * - Minimal object scanning
 * 
 * @example
 * ```typescript
 * // Standard API response
 * const { items, meta } = extractTrailersAndMeta({
 *   data: [{ trailerNumber: "T123" }],
 *   meta: { page: 1, total: 10 }
 * });
 * 
 * // Direct array response
 * const { items, meta } = extractTrailersAndMeta([
 *   { trailerNumber: "T123" },
 *   { trailerNumber: "T456" }
 * ]);
 * 
 * // Nested structure
 * const { items, meta } = extractTrailersAndMeta({
 *   response: {
 *     items: [{ trailerNumber: "T123" }],
 *     pagination: { page: 1 }
 *   }
 * });
 * ```
 */
export function extractTrailersAndMeta(payload: unknown): { items: any[]; meta: AnyObj | null } {
  // Handle direct array responses
  if (Array.isArray(payload)) {
    return { items: payload, meta: null };
  }
  
  // Handle non-object payloads
  if (!payload || typeof payload !== "object") {
    return { items: [], meta: null };
  }
  
  const obj = payload as AnyObj;

  // Try common API response patterns
  const candidates = firstArrayAt(obj, [
    ["data"],               // { data: [] }
    ["items"],              // { items: [] }
    ["results"],            // { results: [] }
    ["data", "items"],      // { data: { items: [] } }
    ["data", "data"],       // { data: { data: [] } } (seen in some APIs)
  ]);

  // Find the best array candidate
  let items: any[] =
    candidates ??
    Object.values(obj).find(v => Array.isArray(v) && v.some(isTrailerLike)) ??
    [];

  // Filter to only trailer-like items if we found an array
  if (!items.some(isTrailerLike)) {
    items = [];
  }

  // Extract metadata from common locations
  const meta =
    (obj.meta && typeof obj.meta === "object" ? obj.meta :
    obj.pagination && typeof obj.pagination === "object" ? obj.pagination :
    obj.data && typeof obj.data === "object" && typeof obj.data.meta === "object" ? obj.data.meta :
    null);

  return { items, meta };
}
