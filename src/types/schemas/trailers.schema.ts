/**
 * @fileoverview Trailers Schema - TraxYard API Validation
 * 
 * Relaxed Zod schemas for validating trailer-related API responses.
 * Handles mixed date types, optional fields, and flexible API responses
 * to prevent validation failures with real-world data variations.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - zod: Runtime type validation and parsing
 * 
 * @features
 * - Flexible date handling (string | Date | null | undefined)
 * - Optional field validation for partial responses
 * - Enum validation for known values
 * - Comprehensive error reporting with field paths
 * - Backward compatibility with existing API responses
 * 
 * @example
 * ```typescript
 * import { TrailersListSchema } from "@/types/schemas/trailers.schema";
 * 
 * const result = TrailersListSchema.safeParse(apiResponse);
 * if (result.success) {
 *   // result.data is fully typed and validated
 *   console.log(result.data.data[0].trailerNumber);
 * } else {
 *   // Handle validation errors with field paths
 *   console.error(result.error.issues.map(i => i.path.join(".")));
 * }
 * ```
 */

import { z } from "zod";
import { ETrailerType, ETrailerStatus, ETrailerLoadState, ETrailerCondition } from "@/types/Trailer.types";
import { EYardId } from "@/types/yard.types";

/**
 * Flexible date-like field validator
 * 
 * Accepts string | Date | null | undefined to handle various
 * API serialization formats and optional fields gracefully.
 * 
 * @constant {z.ZodType} zDateLike - Union type for date fields
 */
const zDateLike = z.union([z.string(), z.date()]).optional().nullable();

/**
 * Trailer DTO Schema (Relaxed)
 * 
 * Validates individual trailer data as returned by the API with
 * flexible handling of date fields and optional properties to
 * accommodate real-world API response variations.
 * 
 * @constant {z.ZodObject} TrailerDtoSchema - Trailer validation schema
 */
export const TrailerDtoSchema = z.object({
  /** Unique trailer identifier */
  _id: z.string().optional(),
  
  /** Trailer number (required) */
  trailerNumber: z.string(),
  
  /** Trailer owner information */
  owner: z.string().optional(),
  
  /** Vehicle make */
  make: z.string().optional(),
  
  /** Vehicle model */
  model: z.string().optional(),
  
  /** Manufacturing year */
  year: z.coerce.number().int().optional(),
  
  /** Vehicle identification number */
  vin: z.string().optional(),
  
  /** License plate number */
  licensePlate: z.string().optional(),
  
  /** State or province */
  stateOrProvince: z.string().optional(),
  
  /** Type of trailer with enum validation */
  trailerType: z.nativeEnum(ETrailerType).optional(),

  /** Safety inspection expiry date (flexible date handling) */
  safetyInspectionExpiryDate: zDateLike,
  
  /** Additional comments */
  comments: z.string().optional(),

  /** Current status with enum validation */
  status: z.nativeEnum(ETrailerStatus).optional(),
  
  /** Associated yard ID with enum validation */
  yardId: z.nativeEnum(EYardId).optional(),

  /** Last move timestamp (flexible date handling) */
  lastMoveIoTs: zDateLike,
  
  /** Last move details with flexible structure */
  lastMoveIo: z.object({
    /** Movement timestamp (flexible date handling) */
    ts: zDateLike,
    
    /** Carrier information (partial object) */
    carrier: z.object({
      /** Truck number */
      truckNumber: z.string().optional(),
    }).partial().optional(),
    
    /** Movement type with enum validation */
    type: z.nativeEnum(ETrailerStatus).optional(),
    
    /** Yard ID for movement with enum validation */
    yardId: z.nativeEnum(EYardId).optional(),
  }).optional(),

  /** Current load state with enum validation */
  loadState: z.nativeEnum(ETrailerLoadState).optional(),
  
  /** Trailer condition with enum validation */
  condition: z.nativeEnum(ETrailerCondition).optional(),
  
  /** Total number of movements */
  totalMovements: z.number().optional(),

  /** Creation timestamp (flexible date handling) */
  createdAt: zDateLike,
  
  /** Last update timestamp (flexible date handling) */
  updatedAt: zDateLike,
});

/**
 * Inferred TypeScript types from the Zod schemas
 * 
 * These types are automatically generated from the schemas and provide
 * full type safety for validated data while accommodating the flexible
 * nature of the API responses.
 * 
 * @type {z.infer<typeof TrailerDtoSchema>} TTrailerDto - Trailer DTO type
 */
// Note: TTrailerDto is exported from src/types/frontend/trailer.dto.ts
// to avoid name collision with Zod-inferred type