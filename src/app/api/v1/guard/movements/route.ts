// src/app/api/v1/guard/movements/route.ts
/**
 * POST /api/v1/guard/movements
 *
 * Purpose
 * -------
 * Create a new trailer movement (IN, OUT, or INSPECTION) with photos/docs.
 * Frontend submits a fully-validated payload including sectioned data and
 * TEMP S3 file keys. The API finalizes files and returns the saved movement
 * plus the updated trailer snapshot.
 *
 * Auth
 * ----
 * - Requires a signed-in user (unless auth is globally disabled).
 *
 * Idempotency
 * -----------
 * - Pass a unique `requestId` (string). Re-sending the same `requestId`
 *   returns the already-created movement (`idempotent: true`).
 *
 * Content-Type
 * ------------
 * - application/json
 *
 * Required Fields (by movement type)
 * ----------------------------------
 * Common:
 *   - requestId: string (unique per submission)
 *   - type: "IN" | "OUT" | "INSPECTION"
 *   - carrier: { carrierName: string, driverName: string, truckNumber?: string }
 *   - trip: {
 *       safetyInspectionExpiry: string|Date,
 *       customerName: string,
 *       destination: string,
 *       orderNumber: string,
 *       isLoaded: boolean,
 *       trailerBound: "SOUTH_BOUND" | "NORTH_BOUND" | "LOCAL"
 *     }
 *   - documents: Array<{ description: string, photo: FileAsset (TEMP key ok) }>
 *   - angles:    all 8 required angle photos present as FileAsset (TEMP keys ok)
 *   - axles:     array length 2..6; each with axleNumber (1..6), type ("SINGLE"|"DUAL"),
 *                left/right are required and each side has:
 *                {
 *                  photo: FileAsset (TEMP key ok),  // one photo per side
 *                  outer: { brand, psi 0..200, condition "ORI"|"RE" },
 *                  inner?: { brand, psi 0..200, condition "ORI"|"RE" } // required if type=DUAL
 *                }
 *   - damageChecklist: object (shape defined client-side; presence required)
 *   - damages?: array of { location: string, type: string, newDamage: boolean,
 *                photo: FileAsset (TEMP key ok), comment?: string }
 *   - ctpat:    object (presence required)
 *
 * For type = "IN" or "OUT":
 *   - yardId: "YARD1" | "YARD2" | "YARD3" (required)
 *
 * Trailer Reference
 * -----------------
 * - Either:
 *     - trailerId: string (existing trailer), OR
 *     - trailer: {
 *         trailerNumber,          // REQUIRED (unique)
 *         owner,                  // REQUIRED
 *         make,                   // REQUIRED
 *         model,                  // REQUIRED
 *         year,                   // REQUIRED (1900..9999)
 *         vin?,                   // OPTIONAL (unique, sparse)
 *         licensePlate,           // REQUIRED
 *         stateOrProvince,        // REQUIRED
 *         trailerType,            // REQUIRED (one of ETrailerType)
 *         safetyInspectionExpiryDate, // REQUIRED (Date)
 *         comments?               // OPTIONAL
 *       } to create a new trailer on the fly.
 *   Notes:
 *     - New trailers start with status OUT by default; they are still allowed to perform the first IN/OUT.
 *     - yardId is only required when status is IN (model enforces this). We set OUT on creation.
 *
 * File Handling
 * -------------
 * - Frontend may upload to TEMP S3 keys before calling this route.
 * - Send TEMP keys in FileAsset.s3Key fields.
 * - The API finalizes all files to: submissions/movements/{movementId}/...
 * - If the request fails, any finalized files are deleted by the API.
 *
 * Business Rules (high level)
 * ---------------------------
 * - IN: prevented only if an existing trailer is already IN. Enforces yard capacity.
 * - OUT: prevented only if an existing trailer is already OUT.
 * - INSPECTION: always allowed; does not change IN/OUT status.
 * - Trailer snapshot is updated from this movement (status, yardId, loadState, counters).
 * - Daily yard stats increment (IN/OUT/INSPECTION), and +1 damageCount if any `damages[].newDamage === true`.
 *
 * Success Response (200)
 * ----------------------
 * {
 *   ok: true,
 *   message: "Movement created successfully",
 *   data: {
 *     movement: <MovementDocument with FINALIZED file keys>,
 *     trailer:  <Updated trailer snapshot>,
 *     referencedTempKeys: string[] // FYI/debugging only
 *   }
 * }
 *
 * Idempotent Replay (200)
 * -----------------------
 * If `requestId` already used:
 * {
 *   ok: true,
 *   message: "Idempotent replay: movement already exists.",
 *   data: { movement: <existing>, idempotent: true }
 * }
 *
 * Common Error Responses
 * ----------------------
 * 400  Validation error (missing/invalid fields, malformed file assets, etc.)
 * 404  Trailer not found (when trailerId provided but missing)
 * 409  Business rule violation:
 *       - "Trailer is already IN. Next movement must be OUT."
 *       - "Trailer is already OUT. Next movement must be IN."
 *       - "Yard capacity reached. Cannot move IN another trailer."
 * 500  Unexpected server error
 *
 * Example Minimal Payloads
 * ------------------------
 * // IN (existing trailer)
 * {
 *   "requestId": "req_12345",
 *   "type": "IN",
 *   "yardId": "YARD2",
 *   "trailerId": "<existing-id>",
 *   "carrier": { "carrierName": "Acme", "driverName": "Jane Doe", "truckNumber": "T-778" },
 *   "trip": {
 *     "safetyInspectionExpiry": "2026-01-15",
 *     "customerName": "Shipper A",
 *     "destination": "Toronto",
 *     "orderNumber": "SO-8891",
 *     "isLoaded": true,
 *     "trailerBound": "NORTH_BOUND"
 *   },
 *   "documents": [
 *     { "description": "BOL", "photo": { "s3Key": "temp/...", "mimeType": "image/jpeg" } }
 *   ],
 *   "angles": { ...8 angle objects with { photo: { s3Key: "temp/...", mimeType: "..." } } ... },
 *   "axles": [
 *     {
 *       "axleNumber": 1,
 *       "type": "DUAL",
 *       "left":  { "photo": { "s3Key": "temp/..." }, "outer": { "brand": "X", "psi": 100, "condition": "ORI" }, "inner": { "brand": "X", "psi": 100, "condition": "ORI" } },
 *       "right": { "photo": { "s3Key": "temp/..." }, "outer": { "brand": "X", "psi": 100, "condition": "ORI" }, "inner": { "brand": "X", "psi": 100, "condition": "ORI" } }
 *     }
 *   ],
 *   "damageChecklist": { ... },
 *   "damages": [ { "location": "LEFT_FRONT", "type": "SCRATCH", "newDamage": true,
 *                  "photo": { "s3Key": "temp/...", "mimeType": "image/jpeg" }, "comment": "" } ],
 *   "ctpat": { ... }
 * }
 *
 * Notes for Frontend
 * ------------------
 * - Always send every required angle photo and each side photo (left/right) for axles.
 * - Always include `requestId` to make retries safe.
 * - For new trailers, provide the minimal trailer object (see Trailer Reference).
 * - On success, use the returned `movement` for all FINAL S3 keys to display images.
 */
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";
import { parseJsonBody } from "@/lib/utils/reqParser";

import { Movement } from "@/mongoose/models/Movement";
import { Trailer } from "@/mongoose/models/Trailer";
import { YardDayStat } from "@/mongoose/models/YardDayStat";

import { yards } from "@/data/yards";
import { APP_TZ, dayKeyToStartUtc, toDayKey } from "@/lib/utils/dateUtils";

import { isTempKey, makeEntityFinalPrefix, deleteS3Objects, finalizeAssetWithCache } from "@/lib/utils/s3Helper";

import { ES3Folder, ES3Namespace } from "@/types/aws.types";
import { EMovementType, type TMovement, type TAnglePhotos, type TDamageItem } from "@/types/movement.types";
import { ETrailerStatus, ETrailerLoadState, type TTrailer } from "@/types/Trailer.types";
import { EYardId } from "@/types/yard.types";
import type { IFileAsset } from "@/types/shared.types";

import { vAssert as assert } from "@/lib/validation/validationHelpers";
import { validateMovementPayload } from "@/lib/validation/movementValidation";
import { isValidObjectId } from "mongoose";

/* ───────────────────────── Helpers ───────────────────────── */

function yardCapacityOf(id: EYardId): number | null {
  const y = yards.find((yy) => yy.id === id);
  return y?.capacity ?? null;
}

function hasNewDamage(damages?: TDamageItem[]): boolean {
  return Array.isArray(damages) && damages.some((d) => d?.newDamage === true);
}

function mapLoadState(isLoaded: boolean): ETrailerLoadState {
  return isLoaded ? ETrailerLoadState.LOADED : ETrailerLoadState.EMPTY;
}

/**
 * Angle key -> ES3Folder mapping (Section 2)
 */
const ANGLE_FOLDER_BY_KEY: Record<keyof TAnglePhotos, ES3Folder> = {
  FRONT: ES3Folder.ANGLES_FRONT,
  LEFT_FRONT: ES3Folder.ANGLES_LEFT_FRONT,
  LEFT_REAR: ES3Folder.ANGLES_LEFT_REAR,
  REAR: ES3Folder.ANGLES_REAR,
  RIGHT_REAR: ES3Folder.ANGLES_RIGHT_REAR,
  RIGHT_FRONT: ES3Folder.ANGLES_RIGHT_FRONT,
  TRAILER_NUMBER_VIN: ES3Folder.ANGLES_TRAILER_NUMBER_VIN,
  LANDING_GEAR_UNDERCARRIAGE: ES3Folder.ANGLES_LANDING_GEAR_UNDERCARRIAGE,
};

/**
 * Gather every temp s3Key in the movement payload for potential cleanup-on-fail.
 * NOTE: We only push TEMP keys; final keys will be tracked separately.
 */
function collectAllTempKeys(m: TMovement): string[] {
  const keys: string[] = [];

  // Section 1: documents
  for (const d of m.documents ?? []) if (isTempKey(d?.photo?.s3Key)) keys.push(d.photo.s3Key);

  // Section 2 angles
  (Object.keys(ANGLE_FOLDER_BY_KEY) as Array<keyof TAnglePhotos>).forEach((k) => {
    const asset = m.angles?.[k]?.photo;
    if (asset?.s3Key && isTempKey(asset.s3Key)) keys.push(asset.s3Key);
  });

  // Section 3 axle side photos
  for (const ax of m.axles ?? []) {
    const lSide = ax.left?.photo;
    if (lSide?.s3Key && isTempKey(lSide.s3Key)) keys.push(lSide.s3Key);
    const rSide = ax.right?.photo;
    if (rSide?.s3Key && isTempKey(rSide.s3Key)) keys.push(rSide.s3Key);
  }

  // Section 4 damages
  for (const d of m.damages ?? []) {
    if (d?.photo?.s3Key && isTempKey(d.photo.s3Key)) keys.push(d.photo.s3Key);
  }

  // (No files in Section 5)
  return keys;
}

/**
 * Finalize all file assets for a movement into submissions/movements/{movementId}/...
 * Returns:
 *  - updatedMovement: payload with all file assets rewritten to final keys
 *  - movedKeys: list of FINAL keys (also pushed into collector eagerly)
 */
async function finalizeAllMovementAssets(movementId: string, payload: TMovement, collector?: string[]): Promise<{ updatedMovement: TMovement; movedKeys: string[] }> {
  const ns = ES3Namespace.MOVEMENTS;

  const movedKeys: string[] = [];
  const pushMoved = (key?: string) => {
    if (!key) return;
    movedKeys.push(key);
    collector?.push(key);
  };

  const clone: TMovement = JSON.parse(JSON.stringify(payload)); // deep clone to mutate safely
  const cache = new Map<string, IFileAsset>(); // tempKey -> finalized asset

  // Section 1: documents[]
  {
    const docDest = makeEntityFinalPrefix(ns, movementId, ES3Folder.DOCUMENTS);

    // type-safe rebuild of TDocumentItem[]
    const nextDocs: NonNullable<TMovement["documents"]> = [];
    for (const doc of clone.documents ?? []) {
      // Ensure proper typing
      const finalizedPhoto = await finalizeAssetWithCache(doc.photo, docDest, cache, (k) => pushMoved(k));
      nextDocs.push({ ...doc, photo: finalizedPhoto ?? doc.photo });
    }
    clone.documents = nextDocs;
  }

  // Section 2: Angles
  {
    for (const key of Object.keys(ANGLE_FOLDER_BY_KEY) as Array<keyof TAnglePhotos>) {
      const dest = makeEntityFinalPrefix(ns, movementId, ANGLE_FOLDER_BY_KEY[key]);
      const before = clone.angles[key].photo;
      const after = (await finalizeAssetWithCache(before, dest, cache, (k) => pushMoved(k))) ?? before;
      clone.angles[key].photo = after!;
    }
  }

  // Section 3: Axle side photos (store under TIRES for continuity)
  {
    const tiresDest = makeEntityFinalPrefix(ns, movementId, ES3Folder.TIRES);
    for (const ax of clone.axles ?? []) {
      if (ax.left?.photo) ax.left.photo = (await finalizeAssetWithCache(ax.left.photo, tiresDest, cache, (k) => pushMoved(k))) ?? ax.left.photo;
      if (ax.right?.photo) ax.right.photo = (await finalizeAssetWithCache(ax.right.photo, tiresDest, cache, (k) => pushMoved(k))) ?? ax.right.photo;
    }
  }

  // Section 4: Damages
  {
    if (Array.isArray(clone.damages) && clone.damages.length) {
      const dmgDest = makeEntityFinalPrefix(ns, movementId, ES3Folder.DAMAGES);
      for (const d of clone.damages) {
        if (d.photo) d.photo = (await finalizeAssetWithCache(d.photo, dmgDest, cache, (k) => pushMoved(k))) ?? d.photo;
      }
    }
  }

  return { updatedMovement: clone, movedKeys };
}

/* ───────────────────────── YardDayStat upsert + rollback ───────────────────────── */

type TStatInc = Partial<Record<"inCount" | "outCount" | "inspectionCount" | "damageCount", number>>;
type TStatApplied = { yardId: EYardId; dayKey: string; inc: TStatInc };

/**
 * Update or create YardDayStat for the day/yard, and return what we changed
 * so we can roll it back if the request later fails.
 * For INSPECTION: only increment when yardId is provided (optional by spec).
 */
async function upsertStatsForMovement(m: TMovement): Promise<TStatApplied | null> {
  const yardId: EYardId | undefined = m.type === EMovementType.INSPECTION ? (m.yardId as EYardId | undefined) : (m.yardId as EYardId);
  if (!yardId) return null;

  const ts = m.ts ? new Date(m.ts) : new Date();
  const dayKey = toDayKey(ts, APP_TZ);
  const exactDayStartUtc: Date = dayKeyToStartUtc(dayKey, APP_TZ);

  const inc: TStatInc = {};
  if (m.type === EMovementType.IN) inc.inCount = 1;
  else if (m.type === EMovementType.OUT) inc.outCount = 1;
  else if (m.type === EMovementType.INSPECTION) inc.inspectionCount = 1;

  if (hasNewDamage(m.damages)) inc.damageCount = 1;

  if (Object.keys(inc).length === 0) return null;

  await YardDayStat.findOneAndUpdate(
    { yardId, dayKey },
    {
      $setOnInsert: { tz: APP_TZ, dayStartUtc: exactDayStartUtc, yardId, dayKey },
      $inc: inc,
    },
    { upsert: true, new: true }
  );

  return { yardId, dayKey, inc };
}

/** Apply the inverse of a previous stats upsert. Safe to call even if the doc was modified by others. */
async function rollbackYardStats(applied: TStatApplied) {
  const dec: TStatInc = {};
  if (applied.inc.inCount) dec.inCount = -applied.inc.inCount;
  if (applied.inc.outCount) dec.outCount = -applied.inc.outCount;
  if (applied.inc.inspectionCount) dec.inspectionCount = -applied.inc.inspectionCount;
  if (applied.inc.damageCount) dec.damageCount = -applied.inc.damageCount;

  if (Object.keys(dec).length === 0) return;

  await YardDayStat.updateOne({ yardId: applied.yardId, dayKey: applied.dayKey }, { $inc: dec });
}

/* ───────────────────────── Route ───────────────────────── */

export async function POST(req: NextRequest) {
  let createdTrailerId: string | null = null;
  let createdMovementId: string | null = null;

  // Track any YardDayStat change so we can undo it on failure.
  let statsApplied: TStatApplied | null = null;

  // Collector of final keys, filled eagerly inside finalizer
  const movedFinalKeys: string[] = [];

  try {
    await connectDB();
    const user = await guard(); // may be null if DISABLE_AUTH

    const body = await parseJsonBody<any>(req);

    // Idempotency pre-check
    {
      const existing = await Movement.findOne({ requestId: body?.requestId }).lean();
      if (existing) {
        return successResponse(200, "Idempotent replay: movement already exists.", {
          movement: existing,
          idempotent: true,
        });
      }
    }

    // Full early validation (fast-fail before S3/DB)
    validateMovementPayload(body);

    // Yard capacity sanity
    if (body.type === EMovementType.IN || body.type === EMovementType.OUT) {
      const yardCap = yardCapacityOf(body.yardId);
      assert(typeof yardCap === "number" && yardCap > 0, "Yard capacity not found");
    }

    // Trailer resolution: create if trailer object is supplied; otherwise expect trailerId
    let trailerId: string;
    if (body.trailer && !body.trailer._id && !body.trailer.id && !body.trailerId) {
      // Align with schema-required fields
      const t: Partial<TTrailer> = {
        trailerNumber: body.trailer.trailerNumber,
        owner: body.trailer.owner,
        make: body.trailer.make,
        model: body.trailer.model,
        year: body.trailer.year,
        vin: body.trailer.vin,
        licensePlate: body.trailer.licensePlate,
        stateOrProvince: body.trailer.stateOrProvince,
        trailerType: body.trailer.trailerType,
        safetyInspectionExpiryDate: new Date(body.trailer.safetyInspectionExpiryDate),
        comments: body.trailer.comments ?? undefined,

        status: ETrailerStatus.OUT,
        yardId: undefined,
        loadState: ETrailerLoadState.UNKNOWN,
        totalMovements: 0,
      };

      // Presence checks
      assert(!!t.trailerNumber, "New trailer.trailerNumber is required");
      assert(!!t.owner, "New trailer.owner is required");
      assert(!!t.make, "New trailer.make is required");
      assert(!!t.model, "New trailer.model is required");
      assert(!!t.year, "New trailer.year is required");
      assert(!!t.licensePlate, "New trailer.licensePlate is required");
      assert(!!t.stateOrProvince, "New trailer.stateOrProvince is required");
      assert(!!t.trailerType, "New trailer.trailerType is required");
      assert(!!t.safetyInspectionExpiryDate, "New trailer.safetyInspectionExpiryDate is required");

      const created = await Trailer.create(t);
      trailerId = created._id.toString();
      createdTrailerId = trailerId;
    } else {
      trailerId = body.trailerId || body.trailer?._id || body.trailer?.id;
      assert(trailerId, "Missing trailerId or trailer object");
      if (body.trailerId) assert(isValidObjectId(body.trailerId), "Invalid trailerId");
    }

    // Load the (possibly existing) trailer state
    const trailerDoc = await Trailer.findById(trailerId);
    assert(trailerDoc, "Trailer not found", 404);

    // Capacity & logical flow checks
    const isNewTrailer = !!createdTrailerId;

    if (body.type === EMovementType.IN) {
      if (!isNewTrailer && trailerDoc.status === ETrailerStatus.IN) {
        throw new AppError(409, "Trailer is already IN. Next movement must be OUT.");
      }

      const yardCap = yardCapacityOf(body.yardId as EYardId)!;
      const currentInCount = await Trailer.countDocuments({ status: ETrailerStatus.IN, yardId: body.yardId });
      if (currentInCount >= yardCap) {
        throw new AppError(409, "Yard capacity reached. Cannot move IN another trailer.");
      }
    } else if (body.type === EMovementType.OUT) {
      if (!isNewTrailer && trailerDoc.status === ETrailerStatus.OUT) {
        throw new AppError(409, "Trailer is already OUT. Next movement must be IN.");
      }
    }
    // INSPECTION: always allowed

    // Build a movement payload
    const movementInput: TMovement = {
      ...body,
      trailer: trailerDoc._id,
      actor: {
        id: user?.id,
        displayName: user?.name ?? "Unknown User",
        email: user?.email ?? undefined,
      },
      ts: new Date(),
    };

    // Keep a list of TEMP keys referenced
    const referencedTempKeys = collectAllTempKeys(movementInput);

    // 1) Create movement (with potentially temp file refs)
    const movementDoc = await Movement.create(movementInput);
    createdMovementId = movementDoc._id.toString();

    // 2) Finalize all files under submissions/movements/{id}/...
    {
      const { updatedMovement } = await finalizeAllMovementAssets(createdMovementId, movementInput, movedFinalKeys);

      // 3) Update movement with finalized file assets (single pass)
      await Movement.findByIdAndUpdate(
        createdMovementId,
        {
          $set: {
            documents: updatedMovement.documents,
            angles: updatedMovement.angles,
            axles: updatedMovement.axles,
            damages: updatedMovement.damages ?? [],
          },
        },
        { new: true }
      );
    }

    // 4) Update trailer snapshot from this movement
    {
      const newLoadState = mapLoadState(!!body?.trip?.isLoaded);

      if (body.type === EMovementType.IN) {
        trailerDoc.status = ETrailerStatus.IN;
        trailerDoc.yardId = body.yardId as EYardId;
        trailerDoc.lastMoveIoTs = movementDoc.ts;
        trailerDoc.loadState = newLoadState;
        trailerDoc.totalMovements = (trailerDoc.totalMovements ?? 0) + 1;
      } else if (body.type === EMovementType.OUT) {
        trailerDoc.status = ETrailerStatus.OUT;
        trailerDoc.yardId = undefined;
        trailerDoc.lastMoveIoTs = movementDoc.ts;
        trailerDoc.loadState = newLoadState;
        trailerDoc.totalMovements = (trailerDoc.totalMovements ?? 0) + 1;
      } else if (body.type === EMovementType.INSPECTION) {
        trailerDoc.loadState = newLoadState;
      }

      await trailerDoc.save();
    }

    // 5) Update yard-day stats (and remember what we changed for rollback)
    statsApplied = await upsertStatsForMovement({
      ...movementInput,
      yardId: body.yardId,
    });

    // Load the fresh movement to return (with finalized assets)
    const finalMovement = await Movement.findById(createdMovementId).lean();

    return successResponse(200, "Movement created successfully", {
      movement: finalMovement,
      trailer: trailerDoc.toObject({ virtuals: true }),
      referencedTempKeys,
    });
  } catch (error: any) {
    // Cleanup DB documents
    try {
      if (createdMovementId) await Movement.findByIdAndDelete(createdMovementId);
    } catch (e) {
      console.warn("Failed to delete Movement during cleanup:", createdMovementId, e);
    }
    try {
      if (createdTrailerId) await Trailer.findByIdAndDelete(createdTrailerId);
    } catch (e) {
      console.warn("Failed to delete Trailer during cleanup:", createdTrailerId, e);
    }

    // Roll back YardDayStat change if we applied one
    if (statsApplied) {
      try {
        await rollbackYardStats(statsApplied);
      } catch (e) {
        console.warn("Failed to roll back YardDayStat during cleanup:", statsApplied, e);
      }
    }

    // Cleanup any FINAL S3 objects we created during this request
    if (movedFinalKeys.length) {
      try {
        await deleteS3Objects(movedFinalKeys);
      } catch (e) {
        console.warn("Failed to delete finalized S3 objects during cleanup:", movedFinalKeys, e);
      }
    }

    console.error("POST /api/v1/guard/movements error:", error);
    return errorResponse(error);
  }
}
