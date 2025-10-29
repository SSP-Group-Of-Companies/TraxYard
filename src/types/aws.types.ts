// src/types/aws.types.ts
import { EFileMimeType } from "./shared.types";

/** High-level “bucket namespaces” you can extend any time. */
export enum ES3Namespace {
  MOVEMENTS = "movements",
  // Add more later: USERS = "users", REPORTS = "reports", etc.
}

/**
 * Logical folder fragments (NO namespace or IDs).
 * Reusable across namespaces.
 */
export enum ES3Folder {
  // Movement section 2: Angle Photos
  ANGLES_FRONT = "angles/front",
  ANGLES_LEFT_FRONT = "angles/left-front",
  ANGLES_LEFT_REAR = "angles/left-rear",
  ANGLES_REAR = "angles/rear",
  ANGLES_RIGHT_REAR = "angles/right-rear",
  ANGLES_RIGHT_FRONT = "angles/right-front",
  ANGLES_TRAILER_NUMBER_VIN = "angles/trailer-number-vin",
  ANGLES_LANDING_GEAR_UNDERCARRIAGE = "angles/landing-gear-undercarriage",

  // Movement section 3: Axles - Tires
  TIRES = "tires",

  // Movement section 4: Damages
  DAMAGES = "damages",

  // Movement section 1: Free-form uploads
  DOCUMENTS = "documents",
}

export interface IPresignRequest {
  /** Top-level namespace (e.g., "movements"). */
  namespace: ES3Namespace;

  /** Folder fragment (no namespace/id inside). */
  folder: ES3Folder;

  /** Optional client-suggested filename (server still appends a UUID). */
  filename?: string;

  /** Content-Type (e.g., "image/jpeg"). */
  mimeType: EFileMimeType;

  /**
   * Optional entity id (e.g., movementId).
   * Temp shapes:
   *  - with id:    temp-files/{namespace}/{docId}/{folder}/{file}
   *  - without id: temp-files/{namespace}/{folder}/{file}
   */
  docId?: string;

  /** Optional size guard in bytes (the API will validate). */
  filesize?: number;
}

export interface IPresignResponse {
  key: string;
  url: string;
  publicUrl: string;
  expiresIn: number;
  mimeType: EFileMimeType;
}
