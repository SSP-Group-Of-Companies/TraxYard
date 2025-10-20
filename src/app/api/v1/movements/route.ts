// src/app/api/v1/movements/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { guard, requireUserId } from "@/lib/auth/authUtils";
import { parseJsonBody } from "@/lib/utils/reqParser";

import { Movement } from "@/mongoose/models/Movement";
import { Trailer } from "@/mongoose/models/Trailer";
import { YardDayStat } from "@/mongoose/models/YardDayStat";

import { yards } from "@/constants/yards";
import { APP_TZ, dayKeyToStartUtc, toDayKey } from "@/lib/utils/dateUtils";

import { isTempKey, makeEntityFinalPrefix, deleteS3Objects, finalizeAssetWithCache, finalizeVectorWithCache } from "@/lib/utils/s3Helper";

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

  // Section 1 files
  for (const a of m.documentInfo?.attachments ?? []) if (isTempKey(a?.s3Key)) keys.push(a.s3Key);
  for (const a of m.extras?.attachments ?? []) if (isTempKey(a?.s3Key)) keys.push(a.s3Key);

  // Section 2 angles
  (Object.keys(ANGLE_FOLDER_BY_KEY) as Array<keyof TAnglePhotos>).forEach((k) => {
    const asset = m.angles?.[k]?.photo;
    if (asset?.s3Key && isTempKey(asset.s3Key)) keys.push(asset.s3Key);
  });

  // Section 3 tires
  for (const ax of m.axles ?? []) {
    const lOut = ax.left?.outer?.photo;
    if (lOut?.s3Key && isTempKey(lOut.s3Key)) keys.push(lOut.s3Key);
    const lIn = ax.left?.inner?.photo;
    if (lIn?.s3Key && isTempKey(lIn.s3Key)) keys.push(lIn.s3Key);
    const rOut = ax.right?.outer?.photo;
    if (rOut?.s3Key && isTempKey(rOut.s3Key)) keys.push(rOut.s3Key);
    const rIn = ax.right?.inner?.photo;
    if (rIn?.s3Key && isTempKey(rIn.s3Key)) keys.push(rIn.s3Key);
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
 * FIX #1: accepts a collector to push moved final keys immediately (so cleanup can remove them on error).
 * FIX #2: de-dupes repeated TEMP keys using a temp->final cache (so we don't try to move the same temp twice).
 *
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
    collector?.push(key); // update caller as we go
  };

  const clone: TMovement = JSON.parse(JSON.stringify(payload)); // deep clone to mutate safely

  // Shared cache for this request: tempKey -> finalized asset
  const cache = new Map<string, IFileAsset>();

  // Section 1 (documents/extras)
  {
    const docDest = makeEntityFinalPrefix(ns, movementId, ES3Folder.DOCUMENTS);
    const exDest = makeEntityFinalPrefix(ns, movementId, ES3Folder.EXTRAS);

    clone.documentInfo.attachments = await finalizeVectorWithCache(clone.documentInfo.attachments, docDest, cache, (k) => pushMoved(k));

    clone.extras.attachments = await finalizeVectorWithCache(clone.extras.attachments, exDest, cache, (k) => pushMoved(k));
  }

  // Section 2 (Angles)
  {
    for (const key of Object.keys(ANGLE_FOLDER_BY_KEY) as Array<keyof TAnglePhotos>) {
      const dest = makeEntityFinalPrefix(ns, movementId, ANGLE_FOLDER_BY_KEY[key]);
      const before = clone.angles[key].photo;
      const after = (await finalizeAssetWithCache(before, dest, cache, (k) => pushMoved(k))) ?? before;
      clone.angles[key].photo = after!;
    }
  }

  // Section 3 (Tires)
  {
    const tiresDest = makeEntityFinalPrefix(ns, movementId, ES3Folder.TIRES);
    for (const ax of clone.axles ?? []) {
      if (ax.left?.outer?.photo) ax.left.outer.photo = (await finalizeAssetWithCache(ax.left.outer.photo, tiresDest, cache, (k) => pushMoved(k))) ?? ax.left.outer.photo;

      if (ax.left?.inner?.photo) ax.left.inner.photo = (await finalizeAssetWithCache(ax.left.inner.photo, tiresDest, cache, (k) => pushMoved(k))) ?? ax.left.inner.photo;

      if (ax.right?.outer?.photo) ax.right.outer.photo = (await finalizeAssetWithCache(ax.right.outer.photo, tiresDest, cache, (k) => pushMoved(k))) ?? ax.right.outer.photo;

      if (ax.right?.inner?.photo) ax.right.inner.photo = (await finalizeAssetWithCache(ax.right.inner.photo, tiresDest, cache, (k) => pushMoved(k))) ?? ax.right.inner.photo;
    }
  }

  // Section 4 (Damages)
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

/**
 * Update or create YardDayStat for the day/yard.
 * For INSPECTION: only increment when yardId is provided (optional by spec).
 */
async function upsertStatsForMovement(m: TMovement) {
  const yardId: EYardId | undefined = m.type === EMovementType.INSPECTION ? (m.yardId as EYardId | undefined) : (m.yardId as EYardId);

  if (!yardId) return;

  const ts = m.ts ? new Date(m.ts) : new Date();
  const dayKey = toDayKey(ts, APP_TZ);
  const exactDayStartUtc: Date = dayKeyToStartUtc(dayKey, APP_TZ);

  const inc: Partial<Record<"inCount" | "outCount" | "inspectionCount" | "damageCount", number>> = {};
  if (m.type === EMovementType.IN) inc.inCount = 1;
  else if (m.type === EMovementType.OUT) inc.outCount = 1;
  else if (m.type === EMovementType.INSPECTION) inc.inspectionCount = 1;

  if (hasNewDamage(m.damages)) inc.damageCount = 1;

  await YardDayStat.findOneAndUpdate(
    { yardId, dayKey },
    {
      $setOnInsert: { tz: APP_TZ, dayStartUtc: exactDayStartUtc, yardId, dayKey },
      $inc: inc,
    },
    { upsert: true, new: true }
  );
}

/* ───────────────────────── Route ───────────────────────── */

export async function POST(req: NextRequest) {
  let createdTrailerId: string | null = null;
  let createdMovementId: string | null = null;

  // FIX #1: collector of final keys, filled eagerly inside finalizer
  const movedFinalKeys: string[] = [];

  try {
    await connectDB();
    await guard(); // will throw 401 if auth is required and invalid
    const userId = await requireUserId(); // useful to stamp actor.id if missing

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

    // Yard capacity sanity (we already validated yardId shape above)
    if (body.type === EMovementType.IN || body.type === EMovementType.OUT) {
      const yardCap = yardCapacityOf(body.yardId);
      assert(typeof yardCap === "number" && yardCap > 0, "Yard capacity not found");
    }

    // Trailer resolution: create if trailer object is supplied; otherwise expect trailerId
    let trailerId: string;
    if (body.trailer && !body.trailer._id && !body.trailer.id && !body.trailerId) {
      // Create new trailer with minimal required fields
      const t: Partial<TTrailer> = {
        trailerNumber: body.trailer.trailerNumber, // optional; schema demands unique if provided
        owner: body.trailer.owner,
        make: body.trailer.make,
        model: body.trailer.model ?? "UNKNOWN",
        year: body.trailer.year,
        vin: body.trailer.vin,
        licensePlate: body.trailer.licensePlate,
        stateOrProvince: body.trailer.stateOrProvince,
        trailerType: body.trailer.trailerType,
        safetyInspectionExpiryDate: new Date(body.trailer.safetyInspectionExpiryDate),
        comments: body.trailer.comments ?? undefined,

        // snapshot defaults (will be set again after movement)
        status: ETrailerStatus.OUT,
        yardId: undefined,
        loadState: ETrailerLoadState.UNKNOWN,
        totalMovements: 0,
      };

      // Basic presence checks for new trailer (fail-fast)
      assert(!!t.owner, "New trailer.owner is required");
      assert(!!t.make, "New trailer.make is required");
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
    if (body.type === EMovementType.IN) {
      // If existing trailer and already IN -> block (next valid move is OUT)
      if (!createdTrailerId && trailerDoc.status === ETrailerStatus.IN) {
        throw new AppError(409, "Trailer is already IN. Next movement must be OUT.");
      }

      // Capacity check for the yard
      const yardCap = yardCapacityOf(body.yardId as EYardId)!;
      const currentInCount = await Trailer.countDocuments({ status: ETrailerStatus.IN, yardId: body.yardId });
      if (currentInCount >= yardCap) {
        throw new AppError(409, "Yard capacity reached. Cannot move IN another trailer.");
      }
    } else if (body.type === EMovementType.OUT) {
      // If trailer already OUT -> block
      if (trailerDoc.status === ETrailerStatus.OUT) {
        throw new AppError(409, "Trailer is already OUT. Next movement must be IN.");
      }
    }
    // INSPECTION: always allowed (does not affect in/out)

    // Build a movement payload (allow provided ts; otherwise default handled by schema)
    const movementInput: TMovement = {
      ...body,
      trailer: trailerDoc._id,
      actor: {
        id: body?.actor?.id ?? userId,
        displayName: body?.actor?.displayName ?? "System",
        email: body?.actor?.email ?? undefined,
      },
      ts: body?.ts ? new Date(body.ts) : new Date(),
    };

    // Keep a list of TEMP keys referenced (used for cleanup on fail if we had to)
    const referencedTempKeys = collectAllTempKeys(movementInput);

    // 1) Create movement (with potentially temp file refs)
    const movementDoc = await Movement.create(movementInput);
    createdMovementId = movementDoc._id.toString();

    // 2) Finalize all files under submissions/movements/{id}/...
    {
      // FIX #1 + #2: pass collector so cleanup can delete any finals even if we throw mid-way
      const { updatedMovement } = await finalizeAllMovementAssets(createdMovementId, movementInput, movedFinalKeys);

      // 3) Update movement with finalized file assets (single pass)
      await Movement.findByIdAndUpdate(
        createdMovementId,
        {
          $set: {
            documentInfo: updatedMovement.documentInfo,
            extras: updatedMovement.extras,
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
        trailerDoc.totalMovements = (trailerDoc.totalMovements ?? 0) + 1; // IN increments
      } else if (body.type === EMovementType.OUT) {
        trailerDoc.status = ETrailerStatus.OUT;
        trailerDoc.yardId = undefined;
        trailerDoc.lastMoveIoTs = movementDoc.ts;
        trailerDoc.loadState = newLoadState;
        trailerDoc.totalMovements = (trailerDoc.totalMovements ?? 0) + 1; // OUT increments
      } else if (body.type === EMovementType.INSPECTION) {
        // no in/out change; no lastMoveIoTs change; DO NOT increment totalMovements
        trailerDoc.loadState = newLoadState;
      }

      // IMPORTANT: Do NOT modify trailerDoc.condition here (admin-only elsewhere)
      await trailerDoc.save();
    }

    // 5) Update yard-day stats
    await upsertStatsForMovement({
      ...movementInput,
      yardId: body.yardId,
    });

    // Load the fresh movement to return (with finalized assets)
    const finalMovement = await Movement.findById(createdMovementId).lean();

    return successResponse(200, "Movement created successfully", {
      movement: finalMovement,
      trailer: trailerDoc.toObject({ virtuals: true }),
      referencedTempKeys, // for debugging/audit if needed
    });
  } catch (error: any) {
    // Cleanup DB documents
    try {
      if (createdMovementId) await Movement.findByIdAndDelete(createdMovementId);
    } catch (e) {
      console.warn("Failed to delete Movement during cleanup:", createdMovementId, e);
    }
    try {
      // Only delete a newly-created trailer; never delete an existing one
      if (createdTrailerId) await Trailer.findByIdAndDelete(createdTrailerId);
    } catch (e) {
      console.warn("Failed to delete Trailer during cleanup:", createdTrailerId, e);
    }

    // Cleanup any FINAL S3 objects we created during this request
    if (movedFinalKeys.length) {
      try {
        await deleteS3Objects(movedFinalKeys);
      } catch (e) {
        console.warn("Failed to delete finalized S3 objects during cleanup:", movedFinalKeys, e);
      }
    }

    console.error("POST /api/v1/movements error:", error);
    return errorResponse(error);
  }
}
