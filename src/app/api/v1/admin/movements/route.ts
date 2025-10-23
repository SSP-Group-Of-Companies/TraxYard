// src/app/api/v1/admin/movements/route.ts
/**
 * GET /api/v1/admin/movements
 * -----------------------------------------------------------------------------
 * Purpose
 *   Search movements across all yards for the Admin dashboard.
 *
 * Query: Pagination
 *   - page: number      default 1   (min 1)
 *   - limit: number     default 20  (min 1, max 100)
 *
 * Query: Search (combined)
 *   - q: string         Case-insensitive match on:
 *                       • trailerNumber (from Trailer)
 *                       • owner        (from Trailer)
 *                       • carrier.truckNumber
 *
 * Query: Filters (all combine)
 *   - type: EMovementType        IN | OUT | INSPECTION
 *   - yardId: EYardId            YARD1 | YARD2 | YARD3
 *   - dateFrom: string (YYYY-MM-DD or ISO)
 *       Interpreted in APP_TZ as start of local day; applied as ts >= startOfDay(dateFrom, APP_TZ)
 *   - dateTo: string (YYYY-MM-DD or ISO)
 *       Interpreted in APP_TZ as entire local day; applied as ts < startOfDay(dateTo + 1 day, APP_TZ)
 *       (i.e., human-inclusive end date, implemented via exclusive upper bound)
 *   - hasDamage: boolean         true => movements having any damages items
 *   - newDamageOnly: boolean     true => at least one damages.newDamage === true
 *
 * Sorting (single field)
 *   - sortBy: ts | type | yardId | trailerNumber | owner | truckNumber | createdAt | updatedAt
 *   - sortDir: asc | desc   (default: desc)
 *
 * Response (200)
 *   {
 *     message: "OK",
 *     data: MovementRow[],   // movements with joined trailer fields
 *     meta: {
 *       page, pageSize, total, totalPages, hasPrev, hasNext,
 *       sortBy, sortDir,
 *       filters: { q, type, yardId, dateFrom, dateTo, hasDamage, newDamageOnly }
 *     }
 *   }
 *
 * MovementRow (projection)
 *   {
 *     _id, type, yardId, ts, createdAt, updatedAt,
 *     actor, carrier, trip,
 *     truckNumber, // duplicate of carrier.truckNumber for sorting
 *     trailer: { _id, trailerNumber, owner, trailerType }
 *   }
 *
 * Examples
 *   {{API}}/api/v1/admin/movements
 *   {{API}}/api/v1/admin/movements?page=2&limit=50&q=TRL-1002&type=IN&yardId=YARD2&dateFrom=2025-10-01&dateTo=2025-10-23&hasDamage=true&newDamageOnly=true&sortBy=truckNumber&sortDir=asc
 *   {{API}}/api/v1/admin/movements?q=Acme%20Logistics&sortBy=ts&sortDir=desc
 *
 * Notes
 *   Heavy sections are intentionally EXCLUDED for Admin list performance:
 *   - documentInfo (files), extras (attachments), angles (photos), axles (photo+doc),
 *     damageChecklist (CT-PAT), damages (items & media), fines (attachments), requestId.
 */

import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";

import { Movement } from "@/mongoose/models/Movement";
import { EMovementType } from "@/types/movement.types";
import { EYardId } from "@/types/yard.types";

import { parseBool, rx, parseEnumParam, parsePagination, parseSort, buildMeta } from "@/lib/utils/queryUtils";

import { startOfDay, addDays, isValid as isValidDate } from "date-fns";
// If you're on date-fns-tz v3+, fromZonedTime is correct. (v1/v2 used zonedTimeToUtc)
import { fromZonedTime } from "date-fns-tz";
import { APP_TZ } from "@/lib/utils/dateUtils";

const SORT_MAP = {
  ts: "ts",
  type: "type",
  yardId: "yardId",
  trailerNumber: "trailer.trailerNumber",
  owner: "trailer.owner",
  truckNumber: "carrier.truckNumber",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;
type SortKey = keyof typeof SORT_MAP;

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await guard();

    const url = new URL(req.url);

    // Pagination
    const { page, limit, skip } = parsePagination(url.searchParams.get("page"), url.searchParams.get("limit"));

    // Search / Filters
    const q = url.searchParams.get("q")?.trim() || "";

    const type = parseEnumParam(url.searchParams.get("type"), Object.values(EMovementType) as readonly EMovementType[], "type");
    const yardId = parseEnumParam(url.searchParams.get("yardId"), Object.values(EYardId) as readonly EYardId[], "yardId");

    // ---- Date range (timezone-safe, human-inclusive) ------------------------
    const dateFromStr = url.searchParams.get("dateFrom") || null;
    const dateToStr = url.searchParams.get("dateTo") || null;

    // Accept YYYY-MM-DD or full ISO; only the date portion matters
    function parseDay(str: string | null): Date | null {
      if (!str) return null;
      const dayPart = str.length >= 10 ? str.slice(0, 10) : str; // YYYY-MM-DD
      const d = new Date(`${dayPart}T00:00:00`);
      return isValidDate(d) ? d : null;
    }

    const dayFromLocal = parseDay(dateFromStr);
    const dayToLocal = parseDay(dateToStr);

    if (dateFromStr && !dayFromLocal) throw new AppError(400, "dateFrom must be a valid date (YYYY-MM-DD or ISO).");
    if (dateToStr && !dayToLocal) throw new AppError(400, "dateTo must be a valid date (YYYY-MM-DD or ISO).");

    // Convert local day starts to UTC instants
    const fromUtc = dayFromLocal ? fromZonedTime(startOfDay(dayFromLocal), APP_TZ) : null;
    // Exclusive upper bound = start of next local day
    const toUtcExcl = dayToLocal ? fromZonedTime(startOfDay(addDays(dayToLocal, 1)), APP_TZ) : null;

    // ------------------------------------------------------------------------

    const hasDamage = parseBool(url.searchParams.get("hasDamage"));
    const newDamageOnly = parseBool(url.searchParams.get("newDamageOnly"));

    // Sorting
    const allowedKeys = Object.keys(SORT_MAP) as readonly SortKey[];
    const { sortBy, sortDir } = parseSort(url.searchParams.get("sortBy"), url.searchParams.get("sortDir"), allowedKeys, "ts");
    const sortPath = SORT_MAP[sortBy];

    // Base match
    const match: Record<string, any> = {};
    if (type) match.type = type;
    if (yardId) match.yardId = yardId;

    if (fromUtc || toUtcExcl) {
      match.ts = {};
      if (fromUtc) match.ts.$gte = fromUtc;
      if (toUtcExcl) match.ts.$lt = toUtcExcl; // exclusive upper bound
    }

    if (hasDamage === true) match["damages.0"] = { $exists: true };
    if (newDamageOnly === true) match["damages"] = { $elemMatch: { newDamage: true } };

    const pipeline: any[] = [
      { $match: match },
      // Join trailer to get trailerNumber/owner/type for search & sort
      {
        $lookup: {
          from: "trailers",
          localField: "trailer",
          foreignField: "_id",
          as: "trailer",
        },
      },
      { $addFields: { trailer: { $first: "$trailer" } } },
      // q search over trailer fields and truck number
      ...(q
        ? [
            {
              $match: {
                $or: [{ "trailer.trailerNumber": rx(q) }, { "trailer.owner": rx(q) }, { "carrier.truckNumber": rx(q) }],
              },
            },
          ]
        : []),
      // Add flattened truckNumber for sort convenience
      { $addFields: { truckNumber: "$carrier.truckNumber" } },
      {
        $facet: {
          rows: [
            { $sort: { [sortPath]: sortDir, _id: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                // keep small/core fields only
                type: 1,
                yardId: 1,
                ts: 1,
                actor: 1,
                carrier: 1,
                trip: 1,
                truckNumber: 1,
                createdAt: 1,
                updatedAt: 1,
                // join fields
                "trailer._id": 1,
                "trailer.trailerNumber": 1,
                "trailer.owner": 1,
                "trailer.trailerType": 1,
              },
            },
          ],
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
    const { rows, total } = (agg?.[0] as any) || { rows: [], total: 0 };

    return successResponse(200, "OK", {
      data: rows,
      meta: buildMeta({
        page,
        pageSize: limit,
        total,
        sortBy,
        sortDir,
        filters: {
          q: q || null,
          type: type ?? null,
          yardId: yardId ?? null,
          dateFrom: dateFromStr || null,
          dateTo: dateToStr || null,
          hasDamage: hasDamage ?? null,
          newDamageOnly: newDamageOnly ?? null,
        },
      }),
    });
  } catch (err: any) {
    return errorResponse(err);
  }
}
