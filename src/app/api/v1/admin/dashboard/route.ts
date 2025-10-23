// src/app/api/v1/admin/dashboard/route.ts
/**
 * -----------------------------------------------------------------------------
 *  ADMIN · DASHBOARD DATA API
 * -----------------------------------------------------------------------------
 *  Method: GET
 *  Path:   /api/v1/admin/dashboard
 *
 *  Purpose
 *  --------
 *  Central admin dashboard view for a single yard.
 *  Provides:
 *   • Yard capacity snapshot (current vs max)
 *   • Inventory breakdown (empty / loaded / unknown)
 *   • Day-level YardDayStat for selected date (IN / OUT / inspections / damages)
 *   • Weather summary (Open-Meteo with icon hints)
 *   • 7-day damage activity trend (and previous-week delta)
 *   • Paginated list of movements with new damages during that 7-day window
 *
 *  Query Parameters
 *  ----------------
 *   - yardId (required): one of EYardId ("YARD1" | "YARD2" | "YARD3")
 *   - date   (optional): 'YYYY-MM-DD' in APP_TZ. Defaults to today.
 *   - page   (optional): default 1, min 1
 *   - limit  (optional): default 10, min 1, max 100
 *
 *  Examples
 *  --------
 *   /api/v1/admin/dashboard?yardId=YARD1
 *   /api/v1/admin/dashboard?yardId=YARD2&date=2025-08-19
 *   /api/v1/admin/dashboard?yardId=YARD3&date=2025-08-19&page=2&limit=20
 *
 *  Response (200 OK)
 *  -----------------
 *   {
 *     "ok": true,
 *     "data": {
 *       yard: { id, name, capacity: { current, max }, inventory: { empty, loaded, unknown } },
 *       stats: { inCount, outCount, inspectionCount, damageCount, ... },
 *       weather: {...},
 *       damageActivity: { series, total, prevWindowTotal, delta },
 *       damagedMovements: { rows: [...], meta: {...} }
 *     }
 *   }
 * -----------------------------------------------------------------------------
 */

import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";

import { Trailer } from "@/mongoose/models/Trailer";
import { Movement } from "@/mongoose/models/Movement";
import { YardDayStat } from "@/mongoose/models/YardDayStat";

import { yards } from "@/data/yards";
import { APP_TZ, toDayKey, dayKeyToStartUtc } from "@/lib/utils/dateUtils";
import { ETrailerLoadState, ETrailerStatus } from "@/types/Trailer.types";
import { EYardId } from "@/types/yard.types";
import { EMovementType } from "@/types/movement.types";
import { getOpenMeteoCurrent } from "@/lib/utils/weather/openMeteo";

import { parseIntClamp, parseEnumParam } from "@/lib/utils/queryUtils";
import { fromZonedTime } from "date-fns-tz";
import { addDays, startOfDay } from "date-fns";

/** Shift a YYYY-MM-DD dayKey by N calendar days in APP_TZ (no DST drift). */
function shiftDayKey(dayKey: string, days: number): string {
  // Build a local (APP_TZ) midnight for the given dayKey, add calendar days in local time,
  // then re-key back to YYYY-MM-DD in APP_TZ.
  const shiftedLocalStartUtc = fromZonedTime(startOfDay(addDays(new Date(`${dayKey}T00:00:00`), days)), APP_TZ);
  return toDayKey(shiftedLocalStartUtc, APP_TZ);
}

export async function GET(req: NextRequest) {
  try {
    await guard();
    await connectDB();

    const url = new URL(req.url);
    const yardId = parseEnumParam(url.searchParams.get("yardId"), Object.values(EYardId) as readonly EYardId[], "yardId");
    if (!yardId) throw new AppError(400, "yardId is required and must be one of EYardId.");

    const yard = yards.find((y) => y.id === yardId);
    if (!yard) throw new AppError(404, `Unknown yardId: ${yardId}`);

    const dateParam = url.searchParams.get("date");
    const page = parseIntClamp(url.searchParams.get("page"), 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = parseIntClamp(url.searchParams.get("limit"), 10, 1, 100);

    const anchorDayKey = dateParam?.match(/^\d{4}-\d{2}-\d{2}$/) ? dateParam : toDayKey(new Date(), APP_TZ);

    const start7 = shiftDayKey(anchorDayKey, -6);
    const end7 = anchorDayKey;
    const prevStart7 = shiftDayKey(anchorDayKey, -13);
    const prevEnd7 = shiftDayKey(anchorDayKey, -7);

    const windowStartUtc = dayKeyToStartUtc(start7);
    const windowEndExclusiveUtc = dayKeyToStartUtc(shiftDayKey(end7, 1));

    const maxCapacity = yard.capacity ?? 0;

    const [currentInCount, inventoryBuckets, theDayStat, last7Stats, prev7Stats, weather, damagedAgg] = await Promise.all([
      Trailer.countDocuments({ yardId, status: ETrailerStatus.IN }),

      Trailer.aggregate([{ $match: { yardId, status: ETrailerStatus.IN } }, { $group: { _id: "$loadState", count: { $sum: 1 } } }]),

      YardDayStat.findOne({ yardId, dayKey: anchorDayKey }).lean(),

      YardDayStat.find({ yardId, dayKey: { $gte: start7, $lte: end7 } })
        .select({ dayKey: 1, damageCount: 1 })
        .sort({ dayKey: 1 })
        .lean(),

      YardDayStat.find({ yardId, dayKey: { $gte: prevStart7, $lte: prevEnd7 } })
        .select({ dayKey: 1, damageCount: 1 })
        .sort({ dayKey: 1 })
        .lean(),

      (async () => {
        const loc = yard.location;
        if (loc?.latitude != null && loc?.longitude != null) {
          return getOpenMeteoCurrent(loc.latitude, loc.longitude);
        }
        return null;
      })(),

      Movement.aggregate([
        {
          $match: {
            yardId,
            ts: { $gte: windowStartUtc, $lt: windowEndExclusiveUtc },
            type: { $in: [EMovementType.IN, EMovementType.OUT] },
            damages: { $elemMatch: { newDamage: true } },
          },
        },
        { $sort: { ts: -1, _id: 1 } },
        {
          $lookup: {
            from: "trailers",
            localField: "trailer",
            foreignField: "_id",
            as: "trailerDoc",
            pipeline: [{ $project: { trailerNumber: 1, owner: 1, trailerType: 1 } }],
          },
        },
        { $addFields: { trailerDoc: { $first: "$trailerDoc" } } },
        {
          $project: {
            ts: 1,
            type: 1,
            yardId: 1,
            "carrier.truckNumber": 1,
            damages: {
              $filter: {
                input: "$damages",
                as: "d",
                cond: { $eq: ["$$d.newDamage", true] },
              },
            },
            trailer: 1,
            trailerNumber: "$trailerDoc.trailerNumber",
            trailerOwner: "$trailerDoc.owner",
            trailerType: "$trailerDoc.trailerType",
          },
        },
        {
          $facet: {
            rows: [{ $skip: (page - 1) * limit }, { $limit: limit }],
            total: [{ $count: "count" }],
          },
        },
        {
          $project: {
            rows: 1,
            total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
          },
        },
      ]).allowDiskUse(true),
    ]);

    const inventory = (() => {
      const map = new Map<string, number>();
      for (const b of inventoryBuckets as any[]) map.set(b._id ?? "UNKNOWN", b.count ?? 0);
      return {
        empty: map.get(ETrailerLoadState.EMPTY) ?? 0,
        loaded: map.get(ETrailerLoadState.LOADED) ?? 0,
        unknown: map.get(ETrailerLoadState.UNKNOWN) ?? 0,
      };
    })();

    const series = (last7Stats || []).map((s: any) => ({ dayKey: s.dayKey, damageCount: s.damageCount ?? 0 }));
    const total = series.reduce((acc: number, s: any) => acc + (s.damageCount ?? 0), 0);
    const prevTotal = (prev7Stats || []).reduce((acc: number, s: any) => acc + (s.damageCount ?? 0), 0);
    const delta = total - prevTotal;

    const damagedBlock = (damagedAgg?.[0] as any) || { rows: [], total: 0 };
    const totalPages = Math.max(Math.ceil((damagedBlock.total as number) / limit), 1);

    return successResponse(200, "admin yard dashboard data", {
      yard: {
        id: yard.id,
        name: yard.name,
        capacity: { current: currentInCount, max: maxCapacity },
        inventory,
      },
      stats: theDayStat ?? null,
      weather,
      damageActivity: {
        window: { startDayKey: start7, endDayKey: end7 },
        series,
        total,
        prevWindowTotal: prevTotal,
        delta,
      },
      damagedMovements: {
        rows: damagedBlock.rows,
        meta: {
          yardId,
          anchorDayKey,
          window: { startUtc: windowStartUtc, endExclusiveUtc: windowEndExclusiveUtc },
          page,
          pageSize: limit,
          total: damagedBlock.total,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        },
      },
    });
  } catch (err) {
    return errorResponse(err as any);
  }
}
