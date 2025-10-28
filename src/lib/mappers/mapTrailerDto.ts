/**
 * @fileoverview Trailer DTO Mapper - TraxYard Data Layer
 * 
 * Maps raw API response data (DTO) to normalized UI model.
 * Handles timestamp conversion, optional field normalization, and type safety.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - TTrailerDto: Raw API response type
 * - TTrailer: Normalized UI model type
 * 
 * @features
 * - Converts string timestamps to Date objects
 * - Normalizes optional nested structures
 * - Handles both lastMoveIoTs and lastMoveIo fields
 * - Provides type-safe mapping with fallbacks
 * - Preserves all original data while ensuring UI consistency
 */

import type { TTrailerDto, TTrailer } from "@/types/Trailer.types";
import { ETrailerType } from "@/types/Trailer.types";

/**
 * Maps a raw API trailer DTO to a normalized UI model
 * 
 * @param dto - Raw trailer data from API
 * @returns Normalized trailer model for UI consumption
 * 
 * @performance
 * - Single-pass conversion with minimal object creation
 * - Efficient timestamp parsing with fallback handling
 * - Preserves referential stability for unchanged fields
 * 
 * @example
 * const dto: TTrailerDto = { trailerNumber: "TRL-001", ... };
 * const trailer: TTrailer = mapTrailerDto(dto);
 * console.log(trailer.lastMoveIo?.ts); // Date object, not string
 */
export function mapTrailerDto(dto: TTrailerDto): TTrailer {
  // Helper function to safely parse ISO timestamps
  const parseDate = (dateString: string | undefined): Date | undefined => {
    if (!dateString) return undefined;
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  // Map the DTO to UI model
  const trailer: TTrailer = {
    // Core identity - map _id to id for consistency
    id: dto._id,
    trailerNumber: dto.trailerNumber,
    owner: dto.owner ?? "",
    make: dto.make ?? "",
    model: dto.model ?? "",
    year: dto.year ?? 0,
    vin: dto.vin,
    licensePlate: dto.licensePlate ?? "",
    stateOrProvince: dto.stateOrProvince ?? "",
    trailerType: dto.trailerType ?? ETrailerType.DRY_VAN,
    safetyInspectionExpiryDate: parseDate(dto.safetyInspectionExpiryDate),
    comments: dto.comments,

    // Live snapshot
    status: dto.status,
    yardId: dto.yardId,

    // Timestamp normalization
    lastMoveIoTs: parseDate(dto.lastMoveIoTs),

    // Normalize lastMoveIo structure with Date conversion
    lastMoveIo: dto.lastMoveIo ? {
      ts: parseDate(dto.lastMoveIo.ts),
      carrier: {
        truckNumber: dto.lastMoveIo.carrier?.truckNumber,
      },
      type: dto.lastMoveIo.type ?? "",
      yardId: dto.lastMoveIo.yardId,
    } : undefined,

    loadState: dto.loadState,
    condition: dto.condition,
    totalMovements: dto.totalMovements ?? 0,
    
    // Mongoose timestamps
    createdAt: parseDate(dto.createdAt),
    updatedAt: parseDate(dto.updatedAt),
  };

  return trailer;
}

/**
 * Maps an array of trailer DTOs to UI models
 * 
 * @param dtos - Array of raw API trailer data
 * @returns Array of normalized trailer models
 * 
 * @performance
 * - Batch processing with single-pass mapping
 * - Preserves array order and structure
 * - Efficient memory usage with direct mapping
 */
export function mapTrailerDtos(dtos: TTrailerDto[]): TTrailer[] {
  return dtos.map(mapTrailerDto);
}
