import { EYardId } from "./yard.types";

export enum ETrailerStatus {
  IN = "IN",
  OUT = "OUT",
}

export enum ETrailerCondition {
  ACTIVE = "ACTIVE",
  OUT_OF_SERVICE = "OUT_OF_SERVICE",
  DAMAGED = "DAMAGED",
}

export enum ETrailerLoadState {
  EMPTY = "EMPTY",
  LOADED = "LOADED",
  UNKNOWN = "UNKNOWN",
}

/** Common North American trailer classes */
export enum ETrailerType {
  DRY_VAN = "DRY_VAN",
  FLATBED = "FLATBED",
  FLATBED_ROLL_TITE = "FLATBED_ROLL_TITE",
  STEP_DECK = "STEP_DECK",
  STEP_DECK_ROLL_TITE = "STEP_DECK_ROLL_TITE",
}

/**
 * DTO (Data Transfer Object) - Raw API response structure
 * Contains string timestamps and optional nested data as returned by backend
 */
export type TTrailerDto = {
  // Core identity/spec
  _id?: string;
  trailerNumber: string;
  owner?: string; // API may omit in some contexts
  make?: string; // API may omit in some contexts
  model?: string; // API may omit in some contexts
  year?: number; // API may omit in some contexts
  vin?: string;
  licensePlate?: string; // API may omit in some contexts
  stateOrProvince?: string; // API may omit in some contexts
  trailerType?: ETrailerType; // API may omit in some contexts
  safetyInspectionExpiryDate?: string; // ISO string from API - may be omitted
  comments?: string;

  // Live snapshot
  status?: ETrailerStatus; // API may omit in some contexts
  yardId?: EYardId;

  /** Latest IN/OUT movement timestamp (excludes INSPECTION) - string from API */
  lastMoveIoTs?: string;

  /** Latest IN/OUT movement details (virtual field from Movement collection) - optional */
  lastMoveIo?: {
    ts?: string; // ISO string from API - may be omitted
    carrier?: {
      truckNumber?: string;
    };
    type?: string;
    yardId?: EYardId;
  };

  loadState?: ETrailerLoadState; // API may omit in some contexts
  condition?: ETrailerCondition; // API may omit in some contexts
  totalMovements?: number; // API may omit in some contexts
  
  // Mongoose timestamps
  createdAt?: string;
  updatedAt?: string;
};

/**
 * UI Model - Normalized data structure for frontend consumption
 * Contains Date objects and guaranteed nested structure for easy rendering
 */
export type TTrailer = {
  // Core identity/spec
  id?: string;
  trailerNumber: string;
  owner: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate: string;
  stateOrProvince: string;
  trailerType: ETrailerType;
  safetyInspectionExpiryDate?: Date;
  comments?: string;

  // Live snapshot
  status?: ETrailerStatus;
  yardId?: EYardId;

  /** Latest IN/OUT movement timestamp (excludes INSPECTION) - normalized to Date */
  lastMoveIoTs?: Date;

  /** Latest IN/OUT movement details - normalized with Date timestamp */
  lastMoveIo?: {
    ts?: Date;
    carrier: {
      truckNumber?: string;
    };
    type: string;
    yardId?: EYardId;
  };

  loadState?: ETrailerLoadState;
  condition?: ETrailerCondition;
  totalMovements?: number;
  
  // Mongoose timestamps
  createdAt?: Date;
  updatedAt?: Date;
};
