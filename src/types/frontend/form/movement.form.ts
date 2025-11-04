import { ETrailerBound, EAxleType, ETireCondition } from "@/types/movement.types";
import type { IFileAsset } from "@/types/shared.types";

export type TMovementForm = {
  carrier: {
    carrierName: string;
    driverName: string;
    truckNumber?: string;
  };
  trip: {
    safetyInspectionExpiry: string; // YYYY-MM-DD
    customerName: string;
    destination: string;
    orderNumber: string;
    isLoaded?: boolean;
    trailerBound?: ETrailerBound;
  };
  documents: Array<{
    description: string;
    photo?: IFileAsset | null;
  }>;
  angles: {
    FRONT?: { photo?: IFileAsset | null };
    LEFT_FRONT?: { photo?: IFileAsset | null };
    LEFT_REAR?: { photo?: IFileAsset | null };
    REAR?: { photo?: IFileAsset | null };
    RIGHT_REAR?: { photo?: IFileAsset | null };
    RIGHT_FRONT?: { photo?: IFileAsset | null };
    TRAILER_NUMBER_VIN?: { photo?: IFileAsset | null };
    LANDING_GEAR_UNDERCARRIAGE?: { photo?: IFileAsset | null };
  };
  axles?: Array<{
    axleNumber: number; // 1..6
    type: EAxleType; // SINGLE/DUAL (DUAL shows inner tires)
    left: {
      photo?: IFileAsset | null;
      outer: { brand: string; psi: number; condition: ETireCondition };
      inner?: { brand: string; psi: number; condition: ETireCondition } | null;
    };
    right: {
      photo?: IFileAsset | null;
      outer: { brand: string; psi: number; condition: ETireCondition };
      inner?: { brand: string; psi: number; condition: ETireCondition } | null;
    };
  }>;
};


