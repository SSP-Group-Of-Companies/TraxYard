// src/lib/validation/movementValidation.ts
import { EYardId } from "@/types/yard.types";
import { vAssert, isObj, vString, vBoolean, vNumber, vOneOf, vFileish } from "./validationHelpers";
import type { TAnglePhotos, TDamageItem } from "@/types/movement.types";

/** External yard validator can be injected (keeps this module independent of data). */
export function isValidYardId(id: any): id is EYardId {
  return Object.values(EYardId).includes(id as EYardId);
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
  vString(spec.brand, `${prefix}.brand`);
  vNumber(spec.psi, `${prefix}.psi`);
  vAssert(spec.psi >= 0 && spec.psi <= 200, `${prefix}.psi must be between 0 and 200`);
  vOneOf(spec.condition, `${prefix}.condition`, ["ORI", "RE"] as const);
  vFileish(spec.photo, `${prefix}.photo`);
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

    vOneOf(ax.type, `${label}.type`, ["SINGLE", "DUAL"] as const);

    vAssert(isObj(ax.left), `${label}.left is required`);
    vAssert(isObj(ax.right), `${label}.right is required`);

    // Outers required on both sides
    validateTireSpec(ax.left.outer, `${label}.left.outer`);
    validateTireSpec(ax.right.outer, `${label}.right.outer`);

    if (ax.type === "DUAL") {
      validateTireSpec(ax.left.inner, `${label}.left.inner`);
      validateTireSpec(ax.right.inner, `${label}.right.inner`);
    } else {
      if (ax.left.inner) validateTireSpec(ax.left.inner, `${label}.left.inner`);
      if (ax.right.inner) validateTireSpec(ax.right.inner, `${label}.right.inner`);
    }
  }
}

/* ───────── Section 1: Carrier/Trip/Fines/FileBuckets ───────── */
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
  vOneOf(trip.trailerBound, "trip.trailerBound", ["SOUTH_BOUND", "NORTH_BOUND", "LOCAL"] as const);
}

export function validateFines(fines: any) {
  vAssert(isObj(fines), "fines is required");
  for (const k of ["lights", "tires", "plates", "mudFlaps", "hinges"] as const) {
    vBoolean(fines[k], `fines.${k}`);
  }
  if (fines.notes != null) vAssert(typeof fines.notes === "string", "fines.notes must be string");
}

export function validateFileBucket(bucket: any, label: string) {
  vAssert(isObj(bucket), `${label} is required`);
  if (bucket.notes != null) vAssert(typeof bucket.notes === "string", `${label}.notes must be string`);
  vAssert(Array.isArray(bucket.attachments), `${label}.attachments must be an array`);
  for (let i = 0; i < bucket.attachments.length; i++) {
    vFileish(bucket.attachments[i], `${label}.attachments[${i}]`);
  }
}

/* ───────── Section 4: Damages ───────── */
export function validateDamages(damages: any) {
  if (damages == null) return;
  vAssert(Array.isArray(damages), "damages must be an array if provided");
  for (let i = 0; i < damages.length; i++) {
    const d = damages[i] as TDamageItem;
    const label = `damages[${i}]`;
    vAssert(isObj(d), `${label} must be an object`);
    vString(d.location, `${label}.location`);
    vString(d.type, `${label}.type`);
    vBoolean(d.newDamage, `${label}.newDamage`);
    if ((d as any).comment != null) vAssert(typeof (d as any).comment === "string", `${label}.comment must be string`);
    vFileish((d as any).photo, `${label}.photo`);
  }
}

/* ───────── Top-level payload ───────── */
export function validateMovementPayload(body: any) {
  vAssert(isObj(body), "Missing JSON body");
  vOneOf(body.type, "type", ["IN", "OUT", "INSPECTION"] as const);
  vString(body.requestId, "requestId");

  if (body.type === "IN" || body.type === "OUT") {
    vAssert(isValidYardId(body.yardId), "Invalid or missing yardId");
  } else if (body.yardId != null) {
    vAssert(isValidYardId(body.yardId), "Invalid yardId");
  }

  if (body.actor) {
    vAssert(isObj(body.actor), "actor must be an object");
    if (body.actor.id != null) vAssert(typeof body.actor.id === "string", "actor.id must be string");
    if (body.actor.displayName != null) vAssert(typeof body.actor.displayName === "string", "actor.displayName must be string");
    if (body.actor.email != null) vAssert(typeof body.actor.email === "string", "actor.email must be string");
  }

  // Section 1
  validateCarrier(body.carrier);
  validateTrip(body.trip);
  validateFines(body.fines);
  validateFileBucket(body.documentInfo, "documentInfo");
  validateFileBucket(body.extras, "extras");

  // Section 2
  validateAngles(body.angles);

  // Section 3
  validateAxles(body.axles);

  // Section 4
  vAssert(isObj(body.damageChecklist), "damageChecklist is required");
  validateDamages(body.damages);

  // Section 5
  vAssert(isObj(body.ctpat), "ctpat is required");
}
