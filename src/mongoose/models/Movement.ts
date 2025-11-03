// src/models/Movement.model.ts
import { Schema, model, models, type Model, type HydratedDocument, SchemaDefinitionProperty } from "mongoose";

import {
  TMovement,
  TAnglePhotos,
  EMovementType,
  ETrailerBound,
  EAxleType,
  ETireCondition,
  EDamageLocation,
  EDamageType,
  EDamageChecklistItem,
  ECtpatItem,
  TTireSpec,
  TAngleItem,
  TSideTires,
  TAxle,
  TDamageChecklist,
  TCtpatChecklist,
  // TDocumentItem type exists in types, but we don't need to import it for schema
} from "@/types/movement.types";
import { EYardId } from "@/types/yard.types";
import { enumMsg, trim } from "@/lib/utils/stringUtils";
import fileAssetSchema from "../schemas/fileAssetSchema";
import { TIRE_BRAND_VALUES } from "@/data/tireBrandNames";

/** Keep doc type local to the model file */
export type TMovementDoc = HydratedDocument<TMovement>;

/* ───────────────────────── Shared sub-schemas ───────────────────────── */

const AngleItemSchema = new Schema<TAngleItem>({ photo: { type: fileAssetSchema, required: [true, "Angle photo is required."] } }, { _id: false });

// NOTE: photo moved off TTireSpec onto TSideTires
const TireSpecSchema = new Schema<TTireSpec>(
  {
    brand: {
      type: String,
      required: [true, "Tire brand is required."],
      enum: {
        values: TIRE_BRAND_VALUES,
        message: enumMsg("Tire brand", TIRE_BRAND_VALUES),
      },
    },
    psi: { type: Number, required: [true, "Tire PSI is required."], min: [0, "PSI cannot be negative."], max: [200, "PSI seems unrealistic."] },
    condition: {
      type: String,
      required: [true, "Tire condition is required."],
      enum: {
        values: Object.values(ETireCondition) as string[],
        message: enumMsg("Tire condition", Object.values(ETireCondition) as string[]),
      },
    },
  },
  { _id: false }
);

const SideTiresSchema = new Schema<TSideTires>(
  {
    photo: { type: fileAssetSchema, required: [true, "Side tires photo is required."] },
    outer: { type: TireSpecSchema, required: [true, "Outer tire is required."] },
    inner: { type: TireSpecSchema }, // optional if SINGLE axle
  },
  { _id: false }
);

const AxleSchema = new Schema<TAxle>(
  {
    axleNumber: {
      type: Number,
      required: [true, "Axle number is required."],
      min: [1, "Axle number must be between 1 and 6."],
      max: [6, "Axle number must be between 1 and 6."],
    },
    type: {
      type: String,
      required: [true, "Axle type is required."],
      enum: {
        values: Object.values(EAxleType) as string[],
        message: enumMsg("Axle type", Object.values(EAxleType) as string[]),
      },
    },
    left: { type: SideTiresSchema, required: [true, "Left tires are required."] },
    right: { type: SideTiresSchema, required: [true, "Right tires are required."] },
  },
  { _id: false }
);

const CarrierSchema = new Schema(
  {
    carrierName: { type: String, required: [true, "Carrier name is required."], trim: true },
    truckNumber: { type: String, set: trim },
    driverName: { type: String, required: [true, "Driver name is required."], trim: true },
  },
  { _id: false }
);

const TripSchema = new Schema(
  {
    safetyInspectionExpiry: {
      type: Date,
      required: [true, "safetyInspectionExpiry is required."],
    },
    customerName: { type: String, required: [true, "Customer name is required."], trim: true },
    destination: { type: String, required: [true, "Destination is required."], trim: true },
    orderNumber: { type: String, required: [true, "Order number is required."], trim: true },

    isLoaded: { type: Boolean, required: [true, "isLoaded is required."] },
    trailerBound: {
      type: String,
      required: [true, "trailerBound is required."],
      enum: {
        values: Object.values(ETrailerBound) as string[],
        message: enumMsg("trailerBound", Object.values(ETrailerBound) as string[]),
      },
    },
  },
  { _id: false }
);

// NEW: documents[] replaces documentInfo/extras/fines buckets
const DocumentItemSchema = new Schema(
  {
    description: { type: String, required: [true, "Document description is required."], trim: true },
    photo: { type: fileAssetSchema, required: [true, "Document photo is required."] },
  },
  { _id: false }
);

const ActorSchema = new Schema(
  {
    id: { type: String, set: trim },
    displayName: { type: String, required: [true, "Actor displayName is required."], trim: true },
    email: { type: String, set: trim },
  },
  { _id: false }
);

const DamageItemSchema = new Schema(
  {
    location: {
      type: String,
      required: [true, "Damage location is required."],
      enum: {
        values: Object.values(EDamageLocation) as string[],
        message: enumMsg("Damage location", Object.values(EDamageLocation) as string[]),
      },
    },
    type: {
      type: String,
      required: [true, "Damage type is required."],
      enum: {
        values: Object.values(EDamageType) as string[],
        message: enumMsg("Damage type", Object.values(EDamageType) as string[]),
      },
    },
    comment: { type: String, set: trim },
    photo: { type: fileAssetSchema, required: [true, "Damage photo is required."] },
    newDamage: { type: Boolean, required: [true, "newDamage is required."] },
  },
  { _id: false }
);

/* ─────────── Extracted versions of the previously inline sub-schemas ─────────── */

// Section 2: fixed-angle keys
const AnglesSchema = new Schema<TAnglePhotos>(
  {
    FRONT: { type: AngleItemSchema, required: true },
    LEFT_FRONT: { type: AngleItemSchema, required: true },
    LEFT_REAR: { type: AngleItemSchema, required: true },
    REAR: { type: AngleItemSchema, required: true },
    RIGHT_REAR: { type: AngleItemSchema, required: true },
    RIGHT_FRONT: { type: AngleItemSchema, required: true },
    TRAILER_NUMBER_VIN: { type: AngleItemSchema, required: true },
    LANDING_GEAR_UNDERCARRIAGE: { type: AngleItemSchema, required: true },
  },
  { _id: false }
);

// Section 4: Damage checklist (explicit keys)
const DamageChecklistSchema = new Schema<TDamageChecklist>(
  {
    [EDamageChecklistItem.CRANK_SHAFT]: { type: Boolean, required: true },
    [EDamageChecklistItem.MUD_FLAPS]: { type: Boolean, required: true },

    [EDamageChecklistItem.CLEARANCE_LIGHTS_1]: { type: Boolean, required: true },
    [EDamageChecklistItem.MARKERS]: { type: Boolean, required: true },
    [EDamageChecklistItem.REFLECTORS]: { type: Boolean, required: true },
    [EDamageChecklistItem.CLEARANCE_LIGHTS_2]: { type: Boolean, required: true },
    [EDamageChecklistItem.CLEARANCE_LIGHTS_3]: { type: Boolean, required: true },

    [EDamageChecklistItem.LUG_NUTS]: { type: Boolean, required: true },
    [EDamageChecklistItem.UNDER_CARRIAGE]: { type: Boolean, required: true },
    [EDamageChecklistItem.SEA_ATA_7_WAY_PLUG]: { type: Boolean, required: true },

    [EDamageChecklistItem.WIRING]: { type: Boolean, required: true },
    [EDamageChecklistItem.REAR_END_PROTECTION]: { type: Boolean, required: true },

    [EDamageChecklistItem.AIR_OR_V_LOSS]: { type: Boolean, required: true },
    [EDamageChecklistItem.CONNECTIONS]: { type: Boolean, required: true },
    [EDamageChecklistItem.HOSE]: { type: Boolean, required: true },
    [EDamageChecklistItem.TUBING]: { type: Boolean, required: true },
  },
  { _id: false }
);

// Section 5: C-TPAT checklist (explicit keys)
const CtpatSchema = new Schema<TCtpatChecklist>(
  {
    [ECtpatItem.TRACTOR_BUMPER]: { type: Boolean, required: true },
    [ECtpatItem.TRAILER_TIRES]: { type: Boolean, required: true },
    [ECtpatItem.MOTOR]: { type: Boolean, required: true },
    [ECtpatItem.TRAILER_BUMPER]: { type: Boolean, required: true },
    [ECtpatItem.TRACTOR_TIRE]: { type: Boolean, required: true },
    [ECtpatItem.TRAILER_DOORS]: { type: Boolean, required: true },
    [ECtpatItem.TRACTOR_FLOOR]: { type: Boolean, required: true },
    [ECtpatItem.SECURITY_SEALS]: { type: Boolean, required: true },
    [ECtpatItem.FUEL_TANKS]: { type: Boolean, required: true },
    [ECtpatItem.TRAILER_WALLS_SIDE]: { type: Boolean, required: true },
    [ECtpatItem.CABINS_AND_COMPARTMENTS]: { type: Boolean, required: true },
    [ECtpatItem.TRAILER_FRONT_WALL]: { type: Boolean, required: true },
    [ECtpatItem.AIR_TANKS]: { type: Boolean, required: true },
    [ECtpatItem.TRAILER_CEILING]: { type: Boolean, required: true },
    [ECtpatItem.TRACTOR_CHASSIS]: { type: Boolean, required: true },
    [ECtpatItem.TRAILER_MUFFLER]: { type: Boolean, required: true },
    [ECtpatItem.QUINTA]: { type: Boolean, required: true },
    [ECtpatItem.INTERIOR_FLOOR_TRAILER]: { type: Boolean, required: true },
    [ECtpatItem.TRAILER_CHASSIS]: { type: Boolean, required: true },
    [ECtpatItem.INTERNAL_TRACTOR_WALLS]: { type: Boolean, required: true },
    [ECtpatItem.AGRICULTURE]: { type: Boolean, required: true },
  },
  { _id: false }
);

/* ───────────────────────── Root schema ───────────────────────── */

const MovementSchema = new Schema<TMovement>(
  {
    type: {
      type: String,
      required: [true, "Movement type is required."],
      enum: {
        values: Object.values(EMovementType) as string[],
        message: enumMsg("Movement type", Object.values(EMovementType) as string[]),
      },
      // index handled via compound indexes section
    },

    trailer: {
      type: Schema.Types.ObjectId,
      ref: "Trailer",
      required: [true, "trailer is required."],
      // index handled via compound indexes section
    },

    yardId: {
      type: String,
      enum: {
        values: Object.values(EYardId) as string[],
        message: enumMsg("yardId", Object.values(EYardId) as string[]),
      },
      required: [
        function (this: TMovementDoc) {
          return this.type === EMovementType.IN || this.type === EMovementType.OUT;
        },
        "yardId is required when movement type is IN or OUT.",
      ],
      // index handled via compound/partial indexes section
    } as SchemaDefinitionProperty<EYardId | undefined>,

    ts: {
      type: Date,
      required: [true, "ts is required."],
      default: Date.now,
      // index handled via compound/partial indexes section
    },

    actor: { type: ActorSchema, required: [true, "actor is required."] },

    // Section 1
    carrier: { type: CarrierSchema, required: [true, "carrier is required."] },
    trip: { type: TripSchema, required: [true, "trip is required."] },

    // NEW: documents[] replaces documentInfo/extras/fines
    documents: {
      type: [DocumentItemSchema],
      required: [true, "documents array is required."],
      default: [],
      validate: { validator: (arr: unknown[]) => Array.isArray(arr), message: "documents must be an array." },
    },

    // Section 2
    angles: { type: AnglesSchema, required: [true, "angles are required."] },

    // Section 3
    axles: {
      type: [AxleSchema],
      required: [true, "axles are required."],
      validate: {
        validator: (arr: unknown[]) => Array.isArray(arr) && arr.length >= 2 && arr.length <= 6,
        message: "axles must have between 2 and 6 items.",
      },
    },

    // Section 4
    damageChecklist: { type: DamageChecklistSchema, required: [true, "damageChecklist is required."] },
    damages: { type: [DamageItemSchema], default: undefined },

    // Section 5
    ctpat: { type: CtpatSchema, required: [true, "ctpat is required."] },

    // Idempotency key to prevent duplicate submissions
    requestId: {
      type: String,
      required: [true, "requestId is required."],
      trim: true,
      unique: true, // unique index only (no extra 'index: true')
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ───────────────────────── Indexes ───────────────────────── */
// trailer history + latest I/O lookup
MovementSchema.index({ trailer: 1, ts: -1 }, { name: "by_trailer_ts" });

// admin search: type/yard + time range + ts sort
MovementSchema.index({ type: 1, yardId: 1, ts: -1 }, { name: "by_type_yard_ts" });

// dashboard & search: newDamage within yard/time window
MovementSchema.index(
  { yardId: 1, ts: -1 },
  {
    name: "partial_yard_ts_newDamage",
    partialFilterExpression: { "damages.newDamage": true },
  }
);

// admin search: hasDamage=true (any damage) within yard/time window
MovementSchema.index(
  { yardId: 1, ts: -1 },
  {
    name: "partial_yard_ts_hasDamage",
    partialFilterExpression: { "damages.0": { $exists: true } },
  }
);

/* ───────────────── Duplicate-key -> friendly errors ───────────────── */

function duplicateMessage(err: any): string | null {
  if (err?.name === "MongoServerError" && err?.code === 11000) {
    if (err.message?.includes("requestId")) return "Duplicate submission detected (requestId must be unique).";
    const key = Object.keys(err.keyValue || {})[0];
    if (key) return `${key} must be unique.`;
    return "Unique constraint violated.";
  }
  return null;
}

(["save", "insertMany", "updateOne", "findOneAndUpdate", "bulkWrite"] as const).forEach((op) => {
  // @ts-expect-error dynamic post op is valid at runtime
  MovementSchema.post(op, function (err: any, _res: any, next: (e?: any) => void) {
    const msg = duplicateMessage(err);
    if (msg) return next(new Error(msg));
    next(err);
  });
});

/* ───────────────────────── Export ───────────────────────── */

export type MovementModel = Model<TMovement>;
export const Movement: MovementModel = (models.Movement as MovementModel) || model<TMovement>("Movement", MovementSchema);
