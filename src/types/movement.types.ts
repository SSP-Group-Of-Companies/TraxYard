// src/types/Movement.types.ts

import { ObjectId } from "mongoose";
import { IFileAsset } from "./shared.types";
import { EYardId } from "./yard.types";

/* ───────────────────────── Core ───────────────────────── */

export enum EMovementType {
  IN = "IN",
  OUT = "OUT",
  INSPECTION = "INSPECTION",
}

export type TMovementActor = {
  id?: string;
  displayName: string;
  email?: string;
};

/* ───────────────────────── Section 1: Carrier / Trip / Documents ───────────────────────── */

export type TCarrierInfo = {
  carrierName: string;
  truckNumber?: string; // a.k.a. tractor number
  driverName: string;
};

export enum ETrailerBound {
  SOUTH_BOUND = "SOUTH_BOUND",
  NORTH_BOUND = "NORTH_BOUND",
  LOCAL = "LOCAL",
}

export type TTripInfo = {
  // shown in the UI Trip panel
  safetyInspectionExpiry: Date; // YYYY-MM-DD (captured here; server may sync to Trailer)
  customerName: string;
  destination: string;
  orderNumber: string;

  // movement-level toggles
  isLoaded: boolean; // "Trailer Is Currently" LOADED/EMPTY
  trailerBound: ETrailerBound; // South/North/Local
};

export type TDocumentItem = {
  description: string;
  photo: IFileAsset; // single file per document item (image/PDF/etc.)
};

export type TDocuments = TDocumentItem[];

/* ───────────────────────── Section 2: Angle Photos (fixed keys) ───────────────────────── */

export type TAngleItem = {
  photo: IFileAsset;
};

export type TAnglePhotos = {
  FRONT: TAngleItem; // "Capture the front wall, landing gear, and trailer ID."
  LEFT_FRONT: TAngleItem; // "3/4 view front + driver side."
  LEFT_REAR: TAngleItem; // "3/4 view rear + driver side."
  REAR: TAngleItem; // "Doors, hinges, seals, plates."
  RIGHT_REAR: TAngleItem; // "3/4 view rear + passenger side."
  RIGHT_FRONT: TAngleItem; // "3/4 view front + passenger side."
  TRAILER_NUMBER_VIN: TAngleItem; // "Zoom on asset tag or ID plate."
  LANDING_GEAR_UNDERCARRIAGE: TAngleItem; // "Close-up of landing gear, frame, dolly legs."
};

/* ───────────────────────── Section 3: Axles (max 6) ───────────────────────── */

export enum EAxleType {
  SINGLE = "SINGLE",
  DUAL = "DUAL",
}

export enum ETireCondition {
  ORI = "ORI", // Original
  RE = "RE", // Replaced
}

export type TTireSpec = {
  brand: string;
  psi: number;
  condition: ETireCondition;
};

export type TSideTires = {
  photo: IFileAsset; // single side photo covering outer + (optional) inner
  outer: TTireSpec;
  inner?: TTireSpec; // optional when axle type is SINGLE
};

export type TAxle = {
  axleNumber: number; // 1..6 (UI validation/server guardrail)
  type: EAxleType;
  left: TSideTires;
  right: TSideTires;
};

/* ───────────────────────── Section 4: Damages & Damage Checklist ───────────────────────── */

/** Trailer damage enums (as provided) */
export enum EDamageLocation {
  // Front / nose
  FRONT_WALL = "FRONT_WALL",
  FRONT_CORNER_LEFT = "FRONT_CORNER_LEFT",
  FRONT_CORNER_RIGHT = "FRONT_CORNER_RIGHT",
  LANDING_GEAR = "LANDING_GEAR",

  // Left side
  LEFT_WALL = "LEFT_WALL",
  LEFT_FRONT_CORNER = "LEFT_FRONT_CORNER",
  LEFT_REAR_CORNER = "LEFT_REAR_CORNER",
  LEFT_DOOR = "LEFT_DOOR",

  // Right side
  RIGHT_WALL = "RIGHT_WALL",
  RIGHT_FRONT_CORNER = "RIGHT_FRONT_CORNER",
  RIGHT_REAR_CORNER = "RIGHT_REAR_CORNER",
  RIGHT_DOOR = "RIGHT_DOOR",

  // Rear
  REAR_WALL_DOORS = "REAR_WALL_DOORS",
  BUMPER_ICC_BAR = "BUMPER_ICC_BAR",
  TAILLIGHTS = "TAILLIGHTS",

  // Top
  ROOF = "ROOF",

  // Undercarriage
  FRAME = "FRAME",
  SUSPENSION = "SUSPENSION",
  AXLES = "AXLES",

  // Tires (generic picks)
  TIRE_LEFT_INNER = "TIRE_LEFT_INNER",
  TIRE_LEFT_OUTER = "TIRE_LEFT_OUTER",
  TIRE_RIGHT_INNER = "TIRE_RIGHT_INNER",
  TIRE_RIGHT_OUTER = "TIRE_RIGHT_OUTER",

  // Interior
  INTERIOR_FLOOR = "INTERIOR_FLOOR",
  INTERIOR_WALLS = "INTERIOR_WALLS",
  INTERIOR_ROOF = "INTERIOR_ROOF",
  E_TRACK_RAILS = "E_TRACK_RAILS",
}

export enum EDamageType {
  SCRATCH = "SCRATCH",
  DENT = "DENT",
  CRACK = "CRACK",
  HOLE_PUNCTURE = "HOLE_PUNCTURE",
  TEAR = "TEAR",
  RUST_CORROSION = "RUST_CORROSION",
  BURN_SCORCH = "BURN_SCORCH",
  BENT = "BENT",
  BROKEN = "BROKEN",
  LOOSE_OR_MISSING = "LOOSE_OR_MISSING",
  LEAK_WATER_DAMAGE = "LEAK_WATER_DAMAGE",
  PAINT_DAMAGE = "PAINT_DAMAGE",
  STRUCTURAL_DAMAGE = "STRUCTURAL_DAMAGE",
  TIRE_DAMAGE_FLAT = "TIRE_DAMAGE_FLAT",
  ELECTRICAL_LIGHTS = "ELECTRICAL_LIGHTS",
  DOOR_ISSUE = "DOOR_ISSUE",
  LANDING_GEAR_ISSUE = "LANDING_GEAR_ISSUE",
}

export type TDamageItem = {
  location: EDamageLocation;
  type: EDamageType;
  comment?: string;
  photo: IFileAsset;
  newDamage: boolean; // counts this movement as "damage" if any item has true
};

/* Damage Checklist (explicit) */

export enum EDamageChecklistItem {
  CRANK_SHAFT = "CRANK_SHAFT",
  MUD_FLAPS = "MUD_FLAPS",

  // The UI shows three separate “Clearance Lights” checkboxes.
  CLEARANCE_LIGHTS_1 = "CLEARANCE_LIGHTS_1",
  MARKERS = "MARKERS",
  REFLECTORS = "REFLECTORS",
  CLEARANCE_LIGHTS_2 = "CLEARANCE_LIGHTS_2",
  CLEARANCE_LIGHTS_3 = "CLEARANCE_LIGHTS_3",

  // Wheel/Lug area
  LUG_NUTS = "LUG_NUTS",
  UNDER_CARRIAGE = "UNDER_CARRIAGE",
  SEA_ATA_7_WAY_PLUG = "SEA_ATA_7_WAY_PLUG",

  // Wiring area
  WIRING = "WIRING",
  REAR_END_PROTECTION = "REAR_END_PROTECTION",

  // Brakes area
  AIR_OR_V_LOSS = "AIR_OR_V_LOSS",
  CONNECTIONS = "CONNECTIONS",
  HOSE = "HOSE",
  TUBING = "TUBING",
}

export type TDamageChecklist = {
  [EDamageChecklistItem.CRANK_SHAFT]: boolean;
  [EDamageChecklistItem.MUD_FLAPS]: boolean;

  [EDamageChecklistItem.CLEARANCE_LIGHTS_1]: boolean;
  [EDamageChecklistItem.MARKERS]: boolean;
  [EDamageChecklistItem.REFLECTORS]: boolean;
  [EDamageChecklistItem.CLEARANCE_LIGHTS_2]: boolean;
  [EDamageChecklistItem.CLEARANCE_LIGHTS_3]: boolean;

  [EDamageChecklistItem.LUG_NUTS]: boolean;
  [EDamageChecklistItem.UNDER_CARRIAGE]: boolean;
  [EDamageChecklistItem.SEA_ATA_7_WAY_PLUG]: boolean;

  [EDamageChecklistItem.WIRING]: boolean;
  [EDamageChecklistItem.REAR_END_PROTECTION]: boolean;

  [EDamageChecklistItem.AIR_OR_V_LOSS]: boolean;
  [EDamageChecklistItem.CONNECTIONS]: boolean;
  [EDamageChecklistItem.HOSE]: boolean;
  [EDamageChecklistItem.TUBING]: boolean;
};

export const DAMAGE_CHECKLIST_LABELS: Record<EDamageChecklistItem, string> = {
  [EDamageChecklistItem.CRANK_SHAFT]: "Crank Shaft",
  [EDamageChecklistItem.MUD_FLAPS]: "Mud Flaps",

  [EDamageChecklistItem.CLEARANCE_LIGHTS_1]: "Clearance Lights",
  [EDamageChecklistItem.MARKERS]: "Markers",
  [EDamageChecklistItem.REFLECTORS]: "Reflectors",
  [EDamageChecklistItem.CLEARANCE_LIGHTS_2]: "Clearance Lights",
  [EDamageChecklistItem.CLEARANCE_LIGHTS_3]: "Clearance Lights",

  [EDamageChecklistItem.LUG_NUTS]: "Lug Nuts",
  [EDamageChecklistItem.UNDER_CARRIAGE]: "Under Carriage",
  [EDamageChecklistItem.SEA_ATA_7_WAY_PLUG]: "Sea-Ata 7 Way Plug",

  [EDamageChecklistItem.WIRING]: "Wiring",
  [EDamageChecklistItem.REAR_END_PROTECTION]: "Rear end Protection",

  [EDamageChecklistItem.AIR_OR_V_LOSS]: "Air or V. Loss",
  [EDamageChecklistItem.CONNECTIONS]: "Connections",
  [EDamageChecklistItem.HOSE]: "Hose",
  [EDamageChecklistItem.TUBING]: "Tubing",
};

/* ───────────────────────── Section 5: C-TPAT Inspection (explicit) ───────────────────────── */

export enum ECtpatItem {
  TRACTOR_BUMPER = "TRACTOR_BUMPER",
  TRAILER_TIRES = "TRAILER_TIRES",
  MOTOR = "MOTOR",
  TRAILER_BUMPER = "TRAILER_BUMPER",
  TRACTOR_TIRE = "TRACTOR_TIRE",
  TRAILER_DOORS = "TRAILER_DOORS",
  TRACTOR_FLOOR = "TRACTOR_FLOOR",
  SECURITY_SEALS = "SECURITY_SEALS",
  FUEL_TANKS = "FUEL_TANKS",
  TRAILER_WALLS_SIDE = "TRAILER_WALLS_SIDE",
  CABINS_AND_COMPARTMENTS = "CABINS_AND_COMPARTMENTS",
  TRAILER_FRONT_WALL = "TRAILER_FRONT_WALL",
  AIR_TANKS = "AIR_TANKS",
  TRAILER_CEILING = "TRAILER_CEILING",
  TRACTOR_CHASSIS = "TRACTOR_CHASSIS",
  TRAILER_MUFFLER = "TRAILER_MUFFLER",
  QUINTA = "QUINTA", // label shown in UI
  INTERIOR_FLOOR_TRAILER = "INTERIOR_FLOOR_TRAILER",
  TRAILER_CHASSIS = "TRAILER_CHASSIS",
  INTERNAL_TRACTOR_WALLS = "INTERNAL_TRACTOR_WALLS",
  AGRICULTURE = "AGRICULTURE",
}

export type TCtpatChecklist = {
  [ECtpatItem.TRACTOR_BUMPER]: boolean;
  [ECtpatItem.TRAILER_TIRES]: boolean;
  [ECtpatItem.MOTOR]: boolean;
  [ECtpatItem.TRAILER_BUMPER]: boolean;
  [ECtpatItem.TRACTOR_TIRE]: boolean;
  [ECtpatItem.TRAILER_DOORS]: boolean;
  [ECtpatItem.TRACTOR_FLOOR]: boolean;
  [ECtpatItem.SECURITY_SEALS]: boolean;
  [ECtpatItem.FUEL_TANKS]: boolean;
  [ECtpatItem.TRAILER_WALLS_SIDE]: boolean;
  [ECtpatItem.CABINS_AND_COMPARTMENTS]: boolean;
  [ECtpatItem.TRAILER_FRONT_WALL]: boolean;
  [ECtpatItem.AIR_TANKS]: boolean;
  [ECtpatItem.TRAILER_CEILING]: boolean;
  [ECtpatItem.TRACTOR_CHASSIS]: boolean;
  [ECtpatItem.TRAILER_MUFFLER]: boolean;
  [ECtpatItem.QUINTA]: boolean;
  [ECtpatItem.INTERIOR_FLOOR_TRAILER]: boolean;
  [ECtpatItem.TRAILER_CHASSIS]: boolean;
  [ECtpatItem.INTERNAL_TRACTOR_WALLS]: boolean;
  [ECtpatItem.AGRICULTURE]: boolean;
};

export const CTPAT_LABELS: Record<ECtpatItem, string> = {
  [ECtpatItem.TRACTOR_BUMPER]: "Tractor Bumper",
  [ECtpatItem.TRAILER_TIRES]: "Trailer Tires",
  [ECtpatItem.MOTOR]: "Motor",
  [ECtpatItem.TRAILER_BUMPER]: "Trailer Bumper",
  [ECtpatItem.TRACTOR_TIRE]: "Tractor Tire",
  [ECtpatItem.TRAILER_DOORS]: "Trailer Doors",
  [ECtpatItem.TRACTOR_FLOOR]: "Tractor Floor",
  [ECtpatItem.SECURITY_SEALS]: "Security Seals",
  [ECtpatItem.FUEL_TANKS]: "Fuel Tanks",
  [ECtpatItem.TRAILER_WALLS_SIDE]: "Trailer Walls (Side)",
  [ECtpatItem.CABINS_AND_COMPARTMENTS]: "Cabins And Compartments",
  [ECtpatItem.TRAILER_FRONT_WALL]: "Trailer Front Wall",
  [ECtpatItem.AIR_TANKS]: "Air Tanks",
  [ECtpatItem.TRAILER_CEILING]: "Trailer Ceiling",
  [ECtpatItem.TRACTOR_CHASSIS]: "Tractor Chassis",
  [ECtpatItem.TRAILER_MUFFLER]: "Trailer Muffler",
  [ECtpatItem.QUINTA]: "Quinta",
  [ECtpatItem.INTERIOR_FLOOR_TRAILER]: "Interior Floor (Trailer)",
  [ECtpatItem.TRAILER_CHASSIS]: "Trailer Chassis",
  [ECtpatItem.INTERNAL_TRACTOR_WALLS]: "Internal Tractor Walls",
  [ECtpatItem.AGRICULTURE]: "Agriculture",
};

/* ───────────────────────── Movement aggregate ───────────────────────── */

export type TMovement = {
  type: EMovementType;
  trailer: ObjectId; // reference to Trailer
  yardId?: EYardId; // required for IN/OUT; optional for INSPECTION
  ts: Date;

  actor: TMovementActor;

  // Section 1
  carrier: TCarrierInfo;
  trip: TTripInfo;
  documents: TDocuments;

  // Section 2
  angles: TAnglePhotos;

  // Section 3
  axles: TAxle[]; // up to 6 (validate in service/UI)

  // Section 4
  damageChecklist: TDamageChecklist;
  damages?: TDamageItem[];

  // Section 5
  ctpat: TCtpatChecklist;

  // Idempotency to prevent double-click duplicates
  requestId: string;
};
