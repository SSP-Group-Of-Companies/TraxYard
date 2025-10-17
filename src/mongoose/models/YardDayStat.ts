// src/models/YardDayStat.model.ts
import { Schema, model, models, type Model, type HydratedDocument } from "mongoose";
import type { TYardDayStat } from "@/types/yardDayStat.types";
import { EYardId } from "@/types/yard.types";
import { APP_TZ } from "@/lib/utils/dateUtils";
import { enumMsg } from "@/lib/utils/stringUtils";

/** Mongoose doc type (hydrate-aware). Keep this ONLY in the model file. */
export type TYardDayStatDoc = HydratedDocument<TYardDayStat>;

const YardDayStatSchema = new Schema<TYardDayStat>(
  {
    yardId: {
      type: String,
      required: [true, "yardId is required."],
      enum: {
        values: Object.values(EYardId) as string[],
        message: enumMsg("yardId", Object.values(EYardId) as string[]),
      },
      index: true,
    },

    // 'YYYY-MM-DD' in APP_TZ
    dayKey: {
      type: String,
      required: [true, "dayKey is required."],
      trim: true, // follow your convention: prefer `trim: true`
      match: [/^\d{4}-\d{2}-\d{2}$/, "dayKey must be 'YYYY-MM-DD'."],
    },

    // Lock to one canonical TZ (America/Toronto)
    tz: {
      type: String,
      required: true,
      default: APP_TZ,
      enum: [APP_TZ],
    },

    // Exact UTC instant of local midnight for that dayKey
    dayStartUtc: {
      type: Date,
      required: [true, "dayStartUtc is required."],
    },

    inCount: {
      type: Number,
      required: [true, "inCount is required."],
      default: 0,
      min: [0, "inCount cannot be negative."],
    },
    outCount: {
      type: Number,
      required: [true, "outCount is required."],
      default: 0,
      min: [0, "outCount cannot be negative."],
    },
    inspectionCount: {
      type: Number,
      required: [true, "inspectionCount is required."],
      default: 0,
      min: [0, "inspectionCount cannot be negative."],
    },
    damageCount: {
      type: Number,
      required: [true, "damageCount is required."],
      default: 0,
      min: [0, "damageCount cannot be negative."],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// One doc per yard per business day
YardDayStatSchema.index({ yardId: 1, dayKey: 1 }, { unique: true, name: "uniq_yard_dayKey" });

/** Minimal E11000 duplicate-key -> friendly message (mirrors Trailer model pattern). */
function duplicateMessage(err: any): string | null {
  if (err?.name === "MongoServerError" && err?.code === 11000) {
    if (err.message?.includes("uniq_yard_dayKey")) {
      return "A daily stats document for this yard and day already exists.";
    }
    const key = Object.keys(err.keyValue || {})[0];
    if (key) return `${key} must be unique.`;
    return "Unique constraint violated.";
  }
  return null;
}

// Attach minimal handlers for common write ops (same convention as Trailer)
(["save", "insertMany", "updateOne", "findOneAndUpdate", "bulkWrite"] as const).forEach((op) => {
  // @ts-expect-error dynamic post op is valid at runtime
  YardDayStatSchema.post(op, function (err: any, _res: any, next: (e?: any) => void) {
    const msg = duplicateMessage(err);
    if (msg) return next(new Error(msg));
    next(err);
  });
});

export type YardDayStatModel = Model<TYardDayStat>;
export const YardDayStat: YardDayStatModel = (models.YardDayStat as YardDayStatModel) || model<TYardDayStat>("YardDayStat", YardDayStatSchema);
