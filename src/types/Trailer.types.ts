// src/types/Trailer.types.ts
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

/**
 * Domain shape for a Trailer.
 * framework-agnostic (no Mongoose Document types).
 *
 * Note: `id` is optional here, because domain objects may be constructed
 */
export type TTrailer = {
  // Core identity/spec
  id?: string; // expose as a convenience for API/DTOs; optional in domain
  trailerNumber: string;
  owner: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate: string;
  stateOrProvince: string;
  trailerType: string;
  safetyInspectionExpiryDate: Date;
  comments?: string;

  // Live snapshot
  status: ETrailerStatus;
  yardId?: EYardId;
  lastMovementTs: Date;
  loadState: ETrailerLoadState;
  condition: ETrailerCondition;
  totalMovements: number;
};
