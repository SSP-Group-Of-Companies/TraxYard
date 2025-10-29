/**
 * @fileoverview Guard Dashboard Schema - TraxYard API Validation
 * 
 * Zod schemas for validating guard dashboard API responses.
 * Ensures type safety and data integrity for dashboard data.
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
 * - Runtime validation of API responses
 * - Type-safe data parsing
 * - Comprehensive error reporting
 * - Optional field handling for flexible APIs
 * - Nested object validation
 * 
 * @example
 * ```typescript
 * import { GuardDashboardSchema } from "@/types/schemas/guardDashboard.schema";
 * 
 * const result = GuardDashboardSchema.safeParse(apiResponse);
 * if (result.success) {
 *   // result.data is fully typed and validated
 *   console.log(result.data.data.yard.name);
 * } else {
 *   // Handle validation errors
 *   console.error(result.error.issues);
 * }
 * ```
 */

import { z } from "zod";

/**
 * Guard Dashboard API Response Schema
 * 
 * Validates the complete structure of the guard dashboard API response,
 * including yard information, statistics, and weather data.
 */
export const GuardDashboardSchema = z.object({
  /** Optional success indicator */
  ok: z.boolean().optional(),
  
  /** Main dashboard data payload */
  data: z.object({
    /** Yard information and capacity */
    yard: z.object({
      /** Unique yard identifier */
      id: z.string(),
      /** Human-readable yard name */
      name: z.string(),
      /** Current and maximum capacity */
      capacity: z.object({
        /** Current number of trailers in yard */
        current: z.number(),
        /** Maximum number of trailers yard can hold */
        max: z.number(),
      }),
      /** Optional location information */
      location: z.object({
        /** City name */
        city: z.string().nullable().optional(),
        /** State or province */
        state: z.string().nullable().optional(),
        /** Country name */
        country: z.string().nullable().optional(),
      }).nullable().optional(),
    }),
    
    /** Daily operational statistics */
    stats: z.object({
      /** Number of trailers coming in today */
      inCount: z.number(),
      /** Number of trailers going out today */
      outCount: z.number(),
      /** Number of inspections today */
      inspectionCount: z.number(),
      /** Number of recent damages */
      damageCount: z.number(),
    }).nullable(),
    
    /** Weather information (pre-processed for UI) */
    weather: z.any().nullable(), // Relaxed validation for pre-processed data
  })
});

/**
 * Inferred TypeScript type from the Zod schema
 * 
 * This type is automatically generated from the schema and provides
 * full type safety for validated data.
 */
export type TGuardDashboardResponse = z.infer<typeof GuardDashboardSchema>;
