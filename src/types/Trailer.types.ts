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
  safetyInspectionExpiryDate: Date;
  comments?: string;

  // Live snapshot
  status: ETrailerStatus;
  yardId?: EYardId;

  /** Latest IN/OUT movement timestamp (excludes INSPECTION). */
  lastMoveIoTs?: Date;

  loadState: ETrailerLoadState;
  condition: ETrailerCondition;
  totalMovements: number;
};
