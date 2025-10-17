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

/** Common North American trailer classes */
export enum ETrailerType {
  DRY_VAN = "DRY_VAN",
  REEFER = "REEFER",
  FLATBED = "FLATBED",
  STEP_DECK = "STEP_DECK",
  DOUBLE_DROP = "DOUBLE_DROP", // aka Lowboy RGN
  LOWBOY = "LOWBOY",
  CONESTOGA = "CONESTOGA",
  CURTAINSIDE = "CURTAINSIDE",
  INTERMODAL_CHASSIS = "INTERMODAL_CHASSIS",
  TANKER = "TANKER",
  DUMP = "DUMP",
  CAR_CARRIER = "CAR_CARRIER",
  LIVESTOCK = "LIVESTOCK",
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
  lastMovementTs: Date;
  loadState: ETrailerLoadState;
  condition: ETrailerCondition;
  totalMovements: number;
};
