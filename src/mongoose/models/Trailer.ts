// src/models/Trailer.model.ts
import { Schema, model, models, type Model, type HydratedDocument } from "mongoose";
import type { TTrailer } from "@/types/Trailer.types";
import { ETrailerStatus, ETrailerCondition, ETrailerLoadState, ETrailerType } from "@/types/Trailer.types";
import { EYardId } from "@/types/yard.types";
import { enumMsg, upperTrim } from "@/lib/utils/stringUtils";

/** Mongoose doc type (hydrate-aware). Keep this ONLY in the model file. */
export type TTrailerDoc = HydratedDocument<TTrailer>;

const TrailerSchema = new Schema<TTrailer>(
  {
    // Core identity/spec
    trailerNumber: {
      type: String,
      required: [true, "Trailer number is required."],
      index: true,
      unique: true,
      trim: true, // required -> use trim: true (no set: trim)
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
      sparse: true, // allows multiple docs with missing vin
      set: (v: string | undefined | null) => {
        const t = upperTrim(v);
        return t || undefined; // empty -> undefined so sparse unique won’t bite
      },
    },
    licensePlate: {
      type: String,
      required: [true, "License plate is required."],
      trim: true,
      set: upperTrim, // keep case normalization
    },
    stateOrProvince: {
      type: String,
      required: [true, "License plate jurisdiction (state/province) is required."],
      trim: true,
      set: upperTrim, // keep case normalization
    },
    trailerType: {
      type: String,
      required: [true, "Trailer type is required."],
      enum: {
        values: Object.values(ETrailerType) as string[],
        message: enumMsg("Trailer type", Object.values(ETrailerType) as string[]),
      },
      trim: true,
      set: upperTrim, // store enum values in canonical UPPER_SNAKE
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
    lastMovementTs: {
      type: Date,
      required: [true, "lastMovementTs is required."],
      default: Date.now,
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

// Compound unique: licensePlate + stateOrProvince (case-insensitive via setters)
TrailerSchema.index({ licensePlate: 1, stateOrProvince: 1 }, { unique: true, name: "uniq_plate_jurisdiction" });

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
