import { EYardId } from "@/types/yard.types";
import {
  ETrailerStatus,
  ETrailerCondition,
  ETrailerLoadState,
  ETrailerType,
} from "@/types/Trailer.types";

/** Raw shape from API (strings, optional fields, nested lastMoveIo) */
export type TTrailerDto = {
  _id?: string;
  trailerNumber: string;
  owner?: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  licensePlate?: string;
  stateOrProvince?: string;
  trailerType?: ETrailerType;
  safetyInspectionExpiryDate?: string; // ISO string
  comments?: string;

  status?: ETrailerStatus;
  yardId?: EYardId;

  lastMoveIoTs?: string; // ISO string
  lastMoveIo?: {
    ts?: string; // ISO string
    carrier?: { truckNumber?: string };
    type?: string; // "IN" | "OUT" (string on the wire)
    yardId?: EYardId;
  };

  loadState?: ETrailerLoadState;
  condition?: ETrailerCondition;
  totalMovements?: number;

  createdAt?: string;
  updatedAt?: string;
};

/** Normalized UI model (Dates, guaranteed nests for rendering) */
export type TTrailerUI = {
  id?: string;
  trailerNumber: string;
  owner?: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  licensePlate?: string;
  stateOrProvince?: string;
  trailerType?: ETrailerType;
  safetyInspectionExpiryDate?: Date;
  comments?: string;

  status?: ETrailerStatus;
  yardId?: EYardId;

  lastMoveIoTs?: Date;
  lastMoveIo?: {
    ts?: Date;
    carrier: { truckNumber?: string };
    type?: string;
    yardId?: EYardId;
  };

  loadState?: ETrailerLoadState;
  condition?: ETrailerCondition;
  totalMovements?: number;

  createdAt?: Date;
  updatedAt?: Date;
};
