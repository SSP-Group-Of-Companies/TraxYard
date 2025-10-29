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
  year?: number; // UI model is always number
  vin?: string;
  licensePlate?: string;
  stateOrProvince?: string;
  trailerType?: ETrailerType;
  safetyInspectionExpiryDate?: string | Date | null; // ISO string or Date object
  comments?: string;

  status?: ETrailerStatus;
  yardId?: EYardId;

  lastMoveIoTs?: string | Date | null; // ISO string or Date object
  lastMoveIo?: {
    ts?: string | Date | null; // ISO string or Date object
    carrier?: { truckNumber?: string };
    type?: ETrailerStatus; // API sends IN/OUT, ETrailerStatus contains both
    yardId?: EYardId;
  };

  loadState?: ETrailerLoadState;
  condition?: ETrailerCondition;
  totalMovements?: number;

  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

/** Normalized UI model (Dates, guaranteed nests for rendering) */
export type TTrailerUI = {
  id?: string;
  trailerNumber: string;
  owner?: string;
  make?: string;
  model?: string;
  year?: number; // UI model is always number
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
    type?: ETrailerStatus; // API sends IN/OUT, ETrailerStatus contains both
    yardId?: EYardId;
  };

  loadState?: ETrailerLoadState;
  condition?: ETrailerCondition;
  totalMovements?: number;

  createdAt?: Date;
  updatedAt?: Date;
};
