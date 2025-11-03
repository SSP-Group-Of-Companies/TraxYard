// src/lib/validation/movementValidation.ts
import { EYardId } from "@/types/yard.types";
import { EMovementType, ETrailerBound, EAxleType, ETireCondition, EDamageLocation, EDamageType, EDamageChecklistItem, ECtpatItem, type TAnglePhotos, type TDamageItem } from "@/types/movement.types";
import { ETrailerType } from "@/types/Trailer.types"; // ⟵ add this
import { vAssert, isObj, vString, vBoolean, vNumber, vOneOf, vFileish } from "./validationHelpers";
import { TIRE_BRAND_NAMES } from "@/data/tireBrandNames";

/** External yard validator can be injected (keeps this module independent of data). */
export function isValidYardId(id: any): id is EYardId {
  return Object.values(EYardId).includes(id as EYardId);
}

// ───────── Tire brand normalization helpers ─────────
const normalizeBrandKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ""); // strip spaces, dashes, underscores, dots, etc.

const BRAND_LOOKUP: Record<string, string> = Object.fromEntries(TIRE_BRAND_NAMES.map((name) => [normalizeBrandKey(name), name]));

/** Coerce user-provided brand to canonical casing; throw if not comparable. */
function coerceTireBrand(input: any, label: string): string {
  vString(input, label); // ensures it's a non-empty string
  const key = normalizeBrandKey(input);
  const canonical = BRAND_LOOKUP[key];
  vAssert(Boolean(canonical), `${label} must be a known brand. Allowed: ${TIRE_BRAND_NAMES.join(", ")}`);
  return canonical!;
}

/* ───────── Section 2: Angles ───────── */
export const ANGLE_KEYS = ["FRONT", "LEFT_FRONT", "LEFT_REAR", "REAR", "RIGHT_REAR", "RIGHT_FRONT", "TRAILER_NUMBER_VIN", "LANDING_GEAR_UNDERCARRIAGE"] as const;

export function validateAngles(angles: any) {
  vAssert(isObj(angles), "angles is required");
  for (const k of ANGLE_KEYS) {
    const angle = angles[k as keyof TAnglePhotos];
    vAssert(isObj(angle), `angles.${k} is required`);
    vFileish((angle as any).photo, `angles.${k}.photo`);
  }
}

/* ───────── Section 3: Axles & Tires ───────── */
function validateTireSpec(spec: any, prefix: string) {
  vAssert(isObj(spec), `${prefix} is required`);

  // ⟵ UPDATED: validate + normalize brand
  spec.brand = coerceTireBrand(spec.brand, `${prefix}.brand`);

  vNumber(spec.psi, `${prefix}.psi`);
  vAssert(spec.psi >= 0 && spec.psi <= 200, `${prefix}.psi must be between 0 and 200`);
  vOneOf(spec.condition, `${prefix}.condition`, Object.values(ETireCondition) as readonly string[]);
}

function validateSideTires(side: any, prefix: string, isDual: boolean) {
  vAssert(isObj(side), `${prefix} is required`);
  vFileish(side.photo, `${prefix}.photo`);
  validateTireSpec(side.outer, `${prefix}.outer`);
  if (isDual) {
    validateTireSpec(side.inner, `${prefix}.inner`);
  } else if (side.inner) {
    validateTireSpec(side.inner, `${prefix}.inner`);
  }
}

export function validateAxles(axles: any) {
  vAssert(Array.isArray(axles), "axles must be an array");
  vAssert(axles.length >= 2 && axles.length <= 6, "axles must have between 2 and 6 items");

  const seen = new Set<number>();
  for (let i = 0; i < axles.length; i++) {
    const ax = axles[i];
    const label = `axles[${i}]`;

    vAssert(isObj(ax), `${label} must be an object`);
    vNumber(ax.axleNumber, `${label}.axleNumber`);
    vAssert(ax.axleNumber >= 1 && ax.axleNumber <= 6, `${label}.axleNumber must be 1..6`);
    vAssert(!seen.has(ax.axleNumber), `${label}.axleNumber must be unique`);
    seen.add(ax.axleNumber);

    vOneOf(ax.type, `${label}.type`, Object.values(EAxleType) as readonly string[]);

    vAssert(isObj(ax.left), `${label}.left is required`);
    vAssert(isObj(ax.right), `${label}.right is required`);

    const isDual = ax.type === EAxleType.DUAL;
    validateSideTires(ax.left, `${label}.left`, isDual);
    validateSideTires(ax.right, `${label}.right`, isDual);
  }
}

/* ───────── Section 1: Carrier / Trip / Documents ───────── */
export function validateCarrier(carrier: any) {
  vAssert(isObj(carrier), "carrier is required");
  vString(carrier.carrierName, "carrier.carrierName");
  if (carrier.truckNumber != null) vAssert(typeof carrier.truckNumber === "string", "carrier.truckNumber must be string");
  vString(carrier.driverName, "carrier.driverName");
}

export function validateTrip(trip: any) {
  vAssert(isObj(trip), "trip is required");
  vAssert(trip.safetyInspectionExpiry != null, "trip.safetyInspectionExpiry is required");
  const d = new Date(trip.safetyInspectionExpiry);
  vAssert(!isNaN(d.valueOf()), "trip.safetyInspectionExpiry must be a valid date");

  vString(trip.customerName, "trip.customerName");
  vString(trip.destination, "trip.destination");
  vString(trip.orderNumber, "trip.orderNumber");

  vBoolean(trip.isLoaded, "trip.isLoaded");
  vOneOf(trip.trailerBound, "trip.trailerBound", Object.values(ETrailerBound) as readonly string[]);
}

export function validateDocuments(documents: any) {
  vAssert(Array.isArray(documents), "documents must be an array");
  for (let i = 0; i < documents.length; i++) {
    const it = documents[i];
    const label = `documents[${i}]`;
    vAssert(isObj(it), `${label} must be an object`);
    vString(it.description, `${label}.description`);
    vFileish(it.photo, `${label}.photo`);
  }
}

/* ───────── Section 4: Damages & Checklist ───────── */
export function validateDamages(damages: any) {
  if (damages == null) return;
  vAssert(Array.isArray(damages), "damages must be an array if provided");
  for (let i = 0; i < damages.length; i++) {
    const d = damages[i] as TDamageItem;
    const label = `damages[${i}]`;
    vAssert(isObj(d), `${label} must be an object`);
    vOneOf(d.location, `${label}.location`, Object.values(EDamageLocation) as readonly string[]);
    vOneOf(d.type, `${label}.type`, Object.values(EDamageType) as readonly string[]);
    if ((d as any).comment != null) vAssert(typeof (d as any).comment === "string", `${label}.comment must be string`);
    vFileish((d as any).photo, `${label}.photo`);
    vBoolean((d as any).newDamage, `${label}.newDamage`);
  }
}

export function validateDamageChecklist(checklist: any) {
  vAssert(isObj(checklist), "damageChecklist is required");
  for (const k of Object.values(EDamageChecklistItem)) {
    vBoolean(checklist[k], `damageChecklist.${k}`);
  }
}

/* ───────── Section 5: C-TPAT ───────── */
export function validateCtpat(ctpat: any) {
  vAssert(isObj(ctpat), "ctpat is required");
  for (const k of Object.values(ECtpatItem)) {
    vBoolean(ctpat[k], `ctpat.${k}`);
  }
}

/* ───────── Trailer reference (either trailerId OR trailer object) ───────── */
function validateTrailerReference(body: any) {
  const hasTrailerId = typeof body.trailerId === "string" && body.trailerId.trim().length > 0;
  const hasTrailerObj = isObj(body.trailer);

  vAssert(hasTrailerId || hasTrailerObj, "Provide either trailerId for an existing trailer OR a trailer object to create.");

  // If both are provided, allow it but ensure they don't conflict in shape (server will prefer trailerId).
  if (hasTrailerId && hasTrailerObj) {
    // No extra checks here; route chooses logic. We just avoid blocking.
    return;
  }

  if (hasTrailerObj) {
    const t = body.trailer;
    vString(t.trailerNumber, "trailer.trailerNumber");
    vString(t.owner, "trailer.owner");
    vString(t.make, "trailer.make");
    vString(t.model, "trailer.model");

    vNumber(t.year, "trailer.year");
    vAssert(t.year >= 1900 && t.year <= 9999, "trailer.year must be between 1900 and 9999");

    if (t.vin != null) vString(t.vin, "trailer.vin");
    vString(t.licensePlate, "trailer.licensePlate");
    vString(t.stateOrProvince, "trailer.stateOrProvince");
    vOneOf(t.trailerType, "trailer.trailerType", Object.values(ETrailerType) as readonly string[]);

    vAssert(t.safetyInspectionExpiryDate != null, "trailer.safetyInspectionExpiryDate is required");
    const exp = new Date(t.safetyInspectionExpiryDate);
    vAssert(!isNaN(exp.valueOf()), "trailer.safetyInspectionExpiryDate must be a valid date");

    if (t.comments != null) vString(t.comments, "trailer.comments");
  }
}

/* ───────── Top-level payload ───────── */
export function validateMovementPayload(body: any) {
  vAssert(isObj(body), "Missing JSON body");

  // Required basics
  vOneOf(body.type, "type", Object.values(EMovementType) as readonly string[]);
  vString(body.requestId, "requestId");

  // Trailer reference: accept trailerId OR trailer object
  validateTrailerReference(body);

  // Yard requirement: only for IN/OUT; optional (but validated) for INSPECTION
  if (body.type === EMovementType.IN || body.type === EMovementType.OUT) {
    vAssert(isValidYardId(body.yardId), "Invalid or missing yardId");
  } else if (body.yardId != null) {
    vAssert(isValidYardId(body.yardId), "Invalid yardId");
  }

  // Optional timestamp (server has default)
  if (body.ts != null) {
    const t = new Date(body.ts);
    vAssert(!isNaN(t.valueOf()), "ts must be a valid date if provided");
  }

  // Actor is OPTIONAL (server populates). If present, validate shape.
  if (body.actor != null) {
    vAssert(isObj(body.actor), "actor must be an object when provided");
    if (body.actor.id != null) vAssert(typeof body.actor.id === "string", "actor.id must be string");
    if (body.actor.displayName != null) vAssert(typeof body.actor.displayName === "string", "actor.displayName must be string");
    if (body.actor.email != null) vAssert(typeof body.actor.email === "string", "actor.email must be string");
  }

  // Section 1
  validateCarrier(body.carrier);
  validateTrip(body.trip);
  validateDocuments(body.documents);

  // Section 2
  validateAngles(body.angles);

  // Section 3
  validateAxles(body.axles);

  // Section 4
  validateDamageChecklist(body.damageChecklist);
  validateDamages(body.damages);

  // Section 5
  validateCtpat(body.ctpat);
}
