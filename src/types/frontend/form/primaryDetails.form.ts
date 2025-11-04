import { ETrailerBound } from "@/types/movement.types";
import type { IFileAsset } from "@/types/shared.types";

export type TPrimaryDetailsForm = {
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
    photo?: IFileAsset | null; // optional in-form, server requires on submit
  }>;
};
