import { Schema, model, models, type Model, type HydratedDocument } from "mongoose";
import type { TTrailer } from "@/types/Trailer.types";
import { ETrailerStatus, ETrailerCondition, ETrailerLoadState, ETrailerType } from "@/types/Trailer.types";
import { EYardId } from "@/types/yard.types";
import { enumMsg, upperTrim } from "@/lib/utils/stringUtils";
import { EMovementType } from "@/types/movement.types";

/** Mongoose doc type (hydrate-aware). Keep this ONLY in the model file. */
export type TTrailerDoc = HydratedDocument<TTrailer>;

const TrailerSchema = new Schema<TTrailer>(
  {
    // Core identity/spec
    trailerNumber: {
      type: String,
      required: [true, "Trailer number is required."],
      unique: true, // unique index defined by Mongoose
      trim: true,
    },
    owner: { type: String, required: [true, "Owner is required."], trim: true },
    make: { type: String, required: [true, "Make is required."], trim: true },
    model: { type: String, required: [true, "Model is required."], trim: true },
    year: {
      type: Number,
      required: [true, "Year is required."],
      min: [1900, "Year cannot be earlier than 1900."],
      max: [9999, "Year must be a 4-digit value."],
    },
    vin: {
      type: String,
      unique: true,
      sparse: true,
      set: (v: string | undefined | null) => {
        const t = upperTrim(v);
        return t || undefined;
      },
    },
    licensePlate: {
      type: String,
      required: [true, "License plate is required."],
      trim: true,
      set: upperTrim,
    },
    stateOrProvince: {
      type: String,
      required: [true, "License plate jurisdiction (state/province) is required."],
      trim: true,
      set: upperTrim,
    },
    trailerType: {
      type: String,
      required: [true, "Trailer type is required."],
      enum: {
        values: Object.values(ETrailerType) as string[],
        message: enumMsg("Trailer type", Object.values(ETrailerType) as string[]),
      },
      trim: true,
      set: upperTrim,
    },
    safetyInspectionExpiryDate: {
      type: Date,
      required: [true, "Safety inspection expiry date is required."],
    },
    comments: { type: String, trim: true },

    // Live snapshot
    status: {
      type: String,
      required: [true, "Status is required."],
      enum: {
        values: Object.values(ETrailerStatus) as string[],
        message: enumMsg("Status", Object.values(ETrailerStatus) as string[]),
      },
    },
    yardId: {
      type: String,
      enum: {
        values: Object.values(EYardId) as string[],
        message: enumMsg("yardId", Object.values(EYardId) as string[]),
      },
      required: [
        function (this: TTrailerDoc) {
          return this.status === ETrailerStatus.IN;
        },
        "yardId is required when status is IN.",
      ],
    },

    /** Latest IN/OUT movement timestamp (excludes INSPECTION). */
    lastMoveIoTs: {
      type: Date,
      // sorting index is declared in the index section
    },

    loadState: {
      type: String,
      enum: {
        values: Object.values(ETrailerLoadState) as string[],
        message: enumMsg("Load state", Object.values(ETrailerLoadState) as string[]),
      },
      default: ETrailerLoadState.UNKNOWN,
    },
    condition: {
      type: String,
      required: [true, "Condition is required."],
      enum: {
        values: Object.values(ETrailerCondition) as string[],
        message: enumMsg("Condition", Object.values(ETrailerCondition) as string[]),
      },
      default: ETrailerCondition.ACTIVE,
    },
    totalMovements: {
      type: Number,
      required: [true, "totalMovements is required."],
      default: 0,
      min: [0, "totalMovements cannot be negative."],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ───────────────────────── Indexes ───────────────────────── */
// fast inventory buckets
TrailerSchema.index({ yardId: 1, status: 1, loadState: 1 }, { name: "by_yard_status_load" });

// common admin/guard list sort when filtered by yard/status
TrailerSchema.index({ yardId: 1, status: 1, updatedAt: -1 }, { name: "list_by_yard_status_updated" });

// global expiry queries (expiredOnly without yard/status)
TrailerSchema.index({ safetyInspectionExpiryDate: 1 }, { name: "by_expiry" });

// expiry when filtered by yard/status
TrailerSchema.index({ yardId: 1, status: 1, safetyInspectionExpiryDate: 1 }, { name: "by_yard_status_expiry" });

// unique plate+jurisdiction business rule
TrailerSchema.index({ licensePlate: 1, stateOrProvince: 1 }, { unique: true, name: "uniq_plate_jurisdiction" });

// sort/search by recent I/O (admin/guard lists & details)
TrailerSchema.index({ lastMoveIoTs: -1 }, { name: "by_lastMoveTs" });

/** Virtual: latest IN/OUT movement (excludes INSPECTION). */
TrailerSchema.virtual("lastMoveIo", {
  ref: "Movement",
  localField: "_id",
  foreignField: "trailer",
  match: { type: { $in: [EMovementType.IN, EMovementType.OUT] } },
  options: { sort: { ts: -1 }, limit: 1 },
  justOne: true,
});

/** Minimal E11000 duplicate-key -> friendly message (optional). */
function duplicateMessage(err: any): string | null {
  if (err?.name === "MongoServerError" && err?.code === 11000) {
    if (err.message?.includes("uniq_plate_jurisdiction")) {
      return "A trailer with the same license plate and jurisdiction already exists.";
    }
    const key = Object.keys(err.keyValue || {})[0];
    if (key) return `${key} must be unique.`;
    return "Unique constraint violated.";
  }
  return null;
}

// Attach minimal handlers for common write ops
(["save", "insertMany", "updateOne", "findOneAndUpdate", "bulkWrite"] as const).forEach((op) => {
  // @ts-expect-error dynamic post op is valid at runtime
  TrailerSchema.post(op, function (err: any, _res: any, next: (e?: any) => void) {
    const msg = duplicateMessage(err);
    if (msg) return next(new Error(msg));
    next(err);
  });
});

export type TrailerModel = Model<TTrailer>;
export const Trailer: TrailerModel = (models.Trailer as TrailerModel) || model<TTrailer>("Trailer", TrailerSchema);
