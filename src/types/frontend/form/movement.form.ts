import { ETrailerBound } from "@/types/movement.types";
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
};


