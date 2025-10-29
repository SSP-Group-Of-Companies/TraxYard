/**
 * @fileoverview Trailer Search Schema - TraxYard Search Row Validation
 * 
 * Minimal Zod schema for trailer search table rows, optimized for performance
 * when parsing large datasets. Provides essential fields for search results
 * with relaxed validation to handle various API response formats.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - zod - Runtime validation library
 * - @/types/yard.types - Yard ID enumeration
 * - @/types/Trailer.types - Trailer status enumeration
 * 
 * @features
 * - Minimal field set for search table performance
 * - Relaxed validation for API compatibility
 * - Optional and nullable fields for flexibility
 * - Type-safe enum validation
 * - Optimized for large dataset parsing
 * 
 * @usage
 * This schema is designed for scenarios where you need to parse many trailer
 * records quickly without the overhead of full DTO validation. Use this for
 * search results, table displays, and other performance-critical operations.
 * 
 * @example
 * ```typescript
 * import { TrailerSearchRow, TTrailerSearchRow } from "@/types/schemas/trailerSearch.schema";
 * 
 * // Validate a single search row
 * const result = TrailerSearchRow.safeParse(trailerData);
 * if (result.success) {
 *   const trailer: TTrailerSearchRow = result.data;
 *   console.log(trailer.trailerNumber);
 * }
 * 
 * // Validate multiple rows efficiently
 * const validRows = trailerData
 *   .map(data => TrailerSearchRow.safeParse(data))
 *   .filter(result => result.success)
 *   .map(result => result.data);
 * ```
 */

import { z } from "zod";
import { EYardId } from "@/types/yard.types";
import { ETrailerStatus } from "@/types/Trailer.types";

/**
 * Minimal trailer search row schema for optimized parsing
 * 
 * Contains only the essential fields needed for search table display
 * and basic trailer identification. Uses relaxed validation to handle
 * various API response formats and missing fields gracefully.
 * 
 * @schema TrailerSearchRow
 * @property {string} trailerNumber - Trailer identification number (required)
 * @property {string} [owner] - Trailer owner name (optional, nullable)
 * @property {ETrailerStatus} [status] - Current trailer status (optional)
 * @property {EYardId} [yardId] - Current yard location (optional)
 * @property {string | Date} [safetyInspectionExpiryDate] - Inspection expiry (optional, nullable)
 * @property {string} [condition] - Trailer condition status (optional)
 * 
 * @performance
 * - Minimal field set reduces parsing overhead
 * - Optional fields prevent validation failures
 * - Nullable fields handle API null responses
 * - Enum validation provides type safety without overhead
 * 
 * @compatibility
 * - Handles string and Date objects for dates
 * - Accepts missing optional fields
 * - Gracefully handles null values
 * - Compatible with various API response formats
 */
export const TrailerSearchRow = z.object({
  /** Trailer identification number - required for all search results */
  trailerNumber: z.string(),
  
  /** Trailer owner name - optional as some trailers may not have assigned owners */
  owner: z.string().optional().nullable(),
  
  /** Current trailer status - optional as status may not be available in all contexts */
  status: z.nativeEnum(ETrailerStatus).optional(),
  
  /** Current yard location - optional as trailer may be in transit */
  yardId: z.nativeEnum(EYardId).optional(),
  
  /** Safety inspection expiry date - optional and nullable for various reasons */
  safetyInspectionExpiryDate: z.union([z.string(), z.date()]).optional().nullable(),
  
  /** Trailer condition status - optional as condition may not be tracked */
  condition: z.enum(["ACTIVE", "OUT_OF_SERVICE", "DAMAGED"]).optional(),
});

/**
 * TypeScript type inferred from TrailerSearchRow schema
 * 
 * Provides compile-time type safety for trailer search row data
 * with all the flexibility of the Zod schema validation.
 * 
 * @type TTrailerSearchRow
 * @property {string} trailerNumber - Trailer identification number
 * @property {string | null | undefined} owner - Trailer owner name
 * @property {ETrailerStatus | undefined} status - Current trailer status
 * @property {EYardId | undefined} yardId - Current yard location
 * @property {string | Date | null | undefined} safetyInspectionExpiryDate - Inspection expiry
 * @property {"ACTIVE" | "OUT_OF_SERVICE" | "DAMAGED" | undefined} condition - Trailer condition
 * 
 * @example
 * ```typescript
 * import type { TTrailerSearchRow } from "@/types/schemas/trailerSearch.schema";
 * 
 * function displayTrailer(trailer: TTrailerSearchRow) {
 *   console.log(`Trailer: ${trailer.trailerNumber}`);
 *   if (trailer.owner) {
 *     console.log(`Owner: ${trailer.owner}`);
 *   }
 *   if (trailer.status) {
 *     console.log(`Status: ${trailer.status}`);
 *   }
 * }
 * ```
 */
export type TTrailerSearchRow = z.infer<typeof TrailerSearchRow>;
