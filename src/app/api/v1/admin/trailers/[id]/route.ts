// src/app/api/v1/admin/trailers/[id]/route.ts

import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";

import { Trailer } from "@/mongoose/models/Trailer";
import { Movement } from "@/mongoose/models/Movement";
import { isValidObjectId, PipelineStage, Types } from "mongoose";
import { EMovementType } from "@/types/movement.types";
import { parseBool, parseIsoDate, inclusiveEndOfDay, parseEnumParam, parsePagination, buildMeta } from "@/lib/utils/queryUtils";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { ETrailerCondition, ETrailerLoadState, ETrailerType } from "@/types/Trailer.types";
import { APP_TZ, dayKeyToStartUtc, toDayKey } from "@/lib/utils/dateUtils";
import { fromZonedTime } from "date-fns-tz";
import { addDays, startOfDay } from "date-fns";

// Next.js 15: params is a Promise
type RouteCtx = { params: Promise<{ id: string }> };

/** Shift a YYYY-MM-DD dayKey by N calendar days in APP_TZ (no DST drift). */
function shiftDayKey(dayKey: string, days: number): string {
  const shiftedLocalStartUtc = fromZonedTime(startOfDay(addDays(new Date(`${dayKey}T00:00:00`), days)), APP_TZ);
  return toDayKey(shiftedLocalStartUtc, APP_TZ);
}

/**
 * ---------------------------------------------------------------------------
 *  ADMIN · TRAILER DETAILS + MOVEMENT HISTORY API
 * ---------------------------------------------------------------------------
 *  Method: GET
 *  Path:   /api/v1/admin/trailers/:id
 *
 *  Purpose
 *  --------
 *  Fetch a single trailer by its MongoDB `_id`.
 *  Optionally include a **paginated, date-filtered movement history**
 *  (IN / OUT / INSPECTION) for that trailer.
 *
 *  Time Handling (DST-safe)
 *  ------------------------
 *  - `dayFrom` / `dayTo` (preferred): treated as **local days in APP_TZ**, then
 *    converted to UTC start/end using `dayKeyToStartUtc()` and `shiftDayKey()`.
 *  - `dateFrom` / `dateTo`: accepted as ISO datetimes (UTC-based).
 *  - When `YYYY-MM-DD` form is used, the end date is **inclusive end-of-day**.
 *
 *  Query Parameters
 *  ----------------
 *   - history:   booleanish (1/0, true/false, yes/no, y/n)
 *                → include paginated movement history
 *
 *   - type:      enum "IN" | "OUT" | "INSPECTION"
 *                → filter by movement type (optional)
 *
 *   - dayFrom:   YYYY-MM-DD (in APP_TZ)
 *   - dayTo:     YYYY-MM-DD (in APP_TZ)
 *                → inclusive day-level filter window
 *
 *   - dateFrom:  ISO datetime (UTC)
 *   - dateTo:    ISO datetime (UTC)
 *                → fallback for precise UTC filtering
 *
 *   - page:      number (default 1, min 1)
 *   - limit:     number (default 20, min 1, max 100)
 *
 *  Response (200 OK)
 *  -----------------
 *  {
 *    "ok": true,
 *    "data": {
 *      "trailer": { ... },
 *      "history": {
 *        "data": [
 *          {
 *            "_id": "6706a2fb51f0b9c4b0f9a321",
 *            "ts": "2025-10-27T14:22:08.123Z",
 *            "tsIso": "2025-10-27T14:22:08.123Z",
 *            "dayKey": "2025-10-27",
 *            "type": "IN",
 *            "yardId": "YARD1",
 *            "truckNumber": "TRK-5511",
 *            "destination": "Toronto Yard",
 *            "orderNumber": "N/A",
 *            "actorName": "Jamie Cruz"
 *          }
 *        ],
 *        "meta": {
 *          "page": 1,
 *          "pageSize": 20,
 *          "total": 45,
 *          "totalPages": 3,
 *          "hasPrev": false,
 *          "hasNext": true,
 *          "sortBy": "ts",
 *          "sortDir": "desc",
 *          "filters": {
 *            "type": "IN",
 *            "window": {
 *              "startUtc": "2025-10-01T04:00:00.000Z",
 *              "endExclusiveUtc": "2025-10-29T04:00:00.000Z"
 *            }
 *          }
 *        }
 *      }
 *    }
 *  }
 *
 *  Errors
 *  -------
 *   - 400 Bad Request: invalid or missing trailer ID / query param
 *   - 404 Not Found: trailer does not exist
 *
 *  Auth
 *  ----
 *  Requires a signed-in admin user (via `guard()`).
 * ---------------------------------------------------------------------------
 */
export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    await connectDB();
    await guard();

    const { id } = await ctx.params;
    if (!id) throw new AppError(400, "Missing trailer id in route param.");
    if (!isValidObjectId(id)) throw new AppError(400, "Invalid trailer id.");

    const url = new URL(req.url);
    const qp = url.searchParams;

    const includeHistory = parseBool(qp.get("history"));
    const type = parseEnumParam<EMovementType>(qp.get("type"), Object.values(EMovementType) as readonly EMovementType[], "type");

    const { page, limit, skip } = parsePagination(qp.get("page"), qp.get("limit"), 100);

    // Always fetch the trailer
    const trailer = await Trailer.findById(id);
    if (!trailer) throw new AppError(404, "Trailer not found.");

    if (!includeHistory) {
      return successResponse(200, "OK", trailer);
    }

    // Build time window (DST-safe when using dayFrom/dayTo)
    const dayFromRaw = qp.get("dayFrom"); // YYYY-MM-DD in APP_TZ
    const dayToRaw = qp.get("dayTo"); // YYYY-MM-DD in APP_TZ

    const dateFromRaw = qp.get("dateFrom"); // ISO datetime
    const dateToRaw = qp.get("dateTo"); // ISO datetime

    let startUtc: Date | undefined;
    let endExclusiveUtc: Date | undefined;

    if (dayFromRaw || dayToRaw) {
      // Use APP_TZ day boundaries like the dashboard route
      const fromKey = dayFromRaw?.match(/^\d{4}-\d{2}-\d{2}$/) ? dayFromRaw : undefined;
      const toKey = dayToRaw?.match(/^\d{4}-\d{2}-\d{2}$/) ? dayToRaw : undefined;

      if (fromKey) startUtc = dayKeyToStartUtc(fromKey);
      if (toKey) endExclusiveUtc = dayKeyToStartUtc(shiftDayKey(toKey, 1));
    } else if (dateFromRaw || dateToRaw) {
      // Fallback: accept ISO datetimes (UTC semantics)
      const from = parseIsoDate(dateFromRaw);
      let to = parseIsoDate(dateToRaw);
      if (to) to = inclusiveEndOfDay(to, dateToRaw); // keep your inclusive behavior for date-only ISO
      startUtc = from ?? undefined;
      endExclusiveUtc = to ?? undefined;
    }

    // Build $match
    const match: Record<string, any> = {
      trailer: new Types.ObjectId(id),
    };
    if (type) match.type = type;
    if (startUtc || endExclusiveUtc) {
      match.ts = {};
      if (startUtc) match.ts.$gte = startUtc;
      if (endExclusiveUtc) match.ts.$lt = endExclusiveUtc;
    }

    // Aggregate for timezone-aware fields + pagination
    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $addFields: {
          dayKey: { $dateToString: { format: "%Y-%m-%d", date: "$ts", timezone: APP_TZ } },
          tsIso: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$ts" } },
        },
      },
      { $sort: { ts: -1 as const, _id: 1 as const } }, // <-- literal directions
      {
        $project: {
          ts: 1,
          tsIso: 1,
          dayKey: 1,
          type: 1,
          yardId: 1,
          truckNumber: "$carrier.truckNumber",
          destination: "$trip.destination",
          orderNumber: "$trip.orderNumber",
          actorName: "$actor.displayName",
        },
      },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
      {
        $project: {
          rows: 1,
          total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
        },
      },
    ];

    const agg = await Movement.aggregate(pipeline).allowDiskUse(true);
    const result = (agg?.[0] as any) ?? { rows: [], total: 0 };

    const meta = buildMeta({
      page,
      pageSize: limit,
      total: result.total as number,
      sortBy: "ts",
      sortDir: -1,
      filters: {
        type: type ?? null,
        // Echo the effective window so the frontend can show badges/tooltips
        window: startUtc || endExclusiveUtc ? { startUtc: startUtc ?? null, endExclusiveUtc: endExclusiveUtc ?? null } : null,
      },
    });

    return successResponse(200, "OK", {
      trailer,
      history: {
        data: result.rows,
        meta,
      },
    });
  } catch (err: any) {
    return errorResponse(err);
  }
}

/**
 * PATCH /api/v1/admin/trailers/:id
 * -----------------------------------------------------------------------------
 * Purpose
 *   Update mutable trailer fields by Mongo _id.
 *
 * Auth
 *   Requires a signed-in user (guard()).
 *
 * Params
 *   - :id (string, Mongo ObjectId)
 *
 * Rules
 *   - Movement-controlled fields CANNOT be changed here: status, yardId
 *   - Allowed updates include (but not limited to):
 *       • trailerNumber (trimmed, non-empty, still unique)
 *       • owner, make, model, year
 *       • trailerType, condition, loadState (validated against enums)
 *       • vin, licensePlate, stateOrProvince, comments
 *       • safetyInspectionExpiryDate (must be a valid ISO date)
 *
 * Responses
 *   - 200 OK: { ok: true, data: <Updated Trailer> }
 *   - 400 Bad Request: invalid body/params (e.g., bad enums/date)
 *   - 404 Not Found: trailer does not exist
 *   - 409 Conflict: uniqueness violation (e.g., trailerNumber already exists)
 */
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    await connectDB();
    await guard();

    const { id } = await ctx.params;
    if (!id) throw new AppError(400, "Missing trailer id in route param.");
    if (!isValidObjectId(id)) throw new AppError(400, "Invalid trailer id.");

    const body = await parseJsonBody(req);

    // Disallow movement-controlled fields
    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      throw new AppError(400, "status cannot be changed here. Use a movement.");
    }
    if (Object.prototype.hasOwnProperty.call(body, "yardId")) {
      throw new AppError(400, "yardId cannot be changed here. Use a movement.");
    }

    // Build update doc from allowed fields
    const u: Record<string, any> = {};
    const setIf = (k: string, v: any) => (u[k] = v);

    // Allowed: trailerNumber (unique at DB level)
    if (body.trailerNumber !== undefined) {
      const tn = String(body.trailerNumber).trim();
      if (!tn) throw new AppError(400, "trailerNumber cannot be empty.");
      setIf("trailerNumber", tn);
    }

    if (body.owner !== undefined) setIf("owner", String(body.owner).trim());
    if (body.make !== undefined) setIf("make", String(body.make).trim());
    if (body.model !== undefined) setIf("model", String(body.model).trim());

    if (body.year !== undefined) {
      const y = Number(body.year);
      if (!Number.isFinite(y)) throw new AppError(400, "year must be a number.");
      setIf("year", y);
    }

    if (body.trailerType !== undefined) {
      const trailerType = parseEnumParam(body.trailerType, Object.values(ETrailerType) as readonly ETrailerType[], "trailerType");
      if (!trailerType) throw new AppError(400, "Invalid trailerType.");
      setIf("trailerType", trailerType);
    }

    if (body.condition !== undefined) {
      const condition = parseEnumParam(body.condition, Object.values(ETrailerCondition) as readonly ETrailerCondition[], "condition");
      if (!condition) throw new AppError(400, "Invalid condition.");
      setIf("condition", condition);
    }

    if (body.loadState !== undefined) {
      const loadState = parseEnumParam(body.loadState, Object.values(ETrailerLoadState) as readonly ETrailerLoadState[], "loadState");
      if (!loadState) throw new AppError(400, "Invalid loadState.");
      setIf("loadState", loadState);
    }

    if (body.vin !== undefined) setIf("vin", String(body.vin).trim());
    if (body.licensePlate !== undefined) setIf("licensePlate", String(body.licensePlate).trim());
    if (body.stateOrProvince !== undefined) setIf("stateOrProvince", String(body.stateOrProvince).trim());
    if (body.comments !== undefined) setIf("comments", String(body.comments).trim());

    if (body.safetyInspectionExpiryDate !== undefined) {
      const d = new Date(body.safetyInspectionExpiryDate);
      if (isNaN(d.getTime())) throw new AppError(400, "safetyInspectionExpiryDate must be a valid ISO date.");
      setIf("safetyInspectionExpiryDate", d);
    }

    if (Object.keys(u).length === 0) {
      throw new AppError(400, "No updatable fields provided.");
    }

    let updated = null;
    try {
      updated = await Trailer.findByIdAndUpdate(id, u, {
        new: true,
        runValidators: true,
        context: "query",
      });
    } catch (e: any) {
      if (e?.name === "MongoServerError" && e?.code === 11000) {
        const key = Object.keys(e?.keyValue || {})[0] ?? "A unique field";
        throw new AppError(409, `${key} must be unique.`);
      }
      throw e;
    }

    if (!updated) throw new AppError(404, "Trailer not found.");

    return successResponse(200, "OK", updated);
  } catch (err: any) {
    return errorResponse(err);
  }
}

/**
 * DELETE /api/v1/admin/trailers/:id
 * -----------------------------------------------------------------------------
 * Purpose
 *   Delete a trailer by Mongo _id **only if** there are no movements referencing it.
 *
 * Auth
 *   Requires a signed-in user (guard()).
 *
 * Params
 *   - :id (string, Mongo ObjectId)
 *
 * Rules
 *   - If any Movement exists with { trailer: :id }, deletion is blocked.
 *
 * Responses
 *   - 200 OK: { ok: true, data: { id: "<deletedId>" } }
 *   - 400 Bad Request: missing/invalid id
 *   - 404 Not Found: trailer does not exist
 *   - 409 Conflict: movements reference this trailer
 */
export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  try {
    await connectDB();
    await guard();

    const { id } = await ctx.params;
    if (!id) throw new AppError(400, "Missing trailer id in route param.");
    if (!isValidObjectId(id)) throw new AppError(400, "Invalid trailer id.");

    const trailer = await Trailer.findById(id);
    if (!trailer) throw new AppError(404, "Trailer not found.");

    const movementExists = await Movement.exists({ trailer: id });
    if (movementExists) {
      throw new AppError(409, "Cannot delete trailer: there are movement records referencing this trailer.");
    }

    await Trailer.findByIdAndDelete(id);
    return successResponse(200, "Deleted", { id });
  } catch (err: any) {
    return errorResponse(err);
  }
}
