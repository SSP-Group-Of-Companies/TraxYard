// src/app/api/v1/trailers/route.ts
/**
 * GET /api/v1/trailers
 * -----------------------------------------------------------------------------
 * Purpose
 *   Return ONLY trailers that are currently IN a specific yard.
 *
 * Required
 *   - yardId: EYardId  (YARD1 | YARD2 | YARD3)
 *
 * Optional (all combine together)
 *   - page: number           default 1   (min 1)
 *   - limit: number          default 20  (min 1, max 100)
 *   - q: string              free-text on trailerNumber, licensePlate, vin, owner, make, model
 *   - trailerId: ObjectId    fetch a specific trailer
 *   - truck: string          matches last IN/OUT movement’s carrier.truckNumber
 *   - trailerType: enum      DRY_VAN | REEFER | FLATBED | STEP_DECK | DOUBLE_DROP | LOWBOY |
 *                            CONESTOGA | CURTAINSIDE | INTERMODAL_CHASSIS | TANKER | DUMP |
 *                            CAR_CARRIER | LIVESTOCK
 *   - condition: enum        ACTIVE | OUT_OF_SERVICE | DAMAGED
 *   - loadState: enum        EMPTY | LOADED | UNKNOWN
 *   - expiredOnly: boolean   true to return trailers with safetyInspectionExpiryDate in the past
 *
 * Sorting (single field)
 *   - sortBy: trailerNumber | owner | licensePlate | stateOrProvince | trailerType |
 *             condition | loadState | year | createdAt | updatedAt |
 *             lastMoveTs | truckNumber
 *   - sortDir: asc | desc   (default: desc)
 *
 * Response (200)
 *   {
 *     message: "OK",
 *     data: Trailer[],         // trailers currently IN the requested yard
 *     meta: {
 *       yardId, page, pageSize, total, totalPages, hasPrev, hasNext,
 *       sortBy, sortDir,
 *       filters: { q, trailerId, truck, trailerType, condition, loadState, expiredOnly }
 *     }
 *   }
 *   - Each Trailer includes standard trailer fields plus:
 *       status ("IN"), yardId, lastMoveIoTs, loadState, condition,
 *       and (when available) lastMoveIo { ts, type, yardId, carrier.truckNumber }
 *
 * Errors
 *   - 400: missing/invalid inputs (e.g., yardId, trailerId, enums)
 *   - 401/403: unauthorized (when auth is enabled)
 *   - 500: server error
 *
 * Examples
 *   /api/v1/trailers?yardId=YARD2
 *   /api/v1/trailers?yardId=YARD2&page=2&limit=50
 *   /api/v1/trailers?yardId=YARD2&q=van&sortBy=lastMoveTs&sortDir=desc
 *   /api/v1/trailers?yardId=YARD2&truck=TRK-102
 *   /api/v1/trailers?yardId=YARD2&trailerType=REEFER&condition=ACTIVE&loadState=LOADED
 *   /api/v1/trailers?yardId=YARD2&expiredOnly=true&sortBy=licensePlate&sortDir=asc
 */

import { NextRequest } from "next/server";
import { isValidObjectId, Types } from "mongoose";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";

import { Trailer } from "@/mongoose/models/Trailer";
import { ETrailerStatus, ETrailerCondition, ETrailerLoadState, ETrailerType } from "@/types/Trailer.types";
import { EYardId } from "@/types/yard.types";
import { EMovementType } from "@/types/movement.types";

/** Parse boolean-ish query values */
function parseBool(v: string | null): boolean | null {
  if (v == null) return null;
  const t = v.trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(t)) return true;
  if (["0", "false", "no", "n"].includes(t)) return false;
  return null;
}

/** Build a case-insensitive regex safely */
function rx(s: string) {
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/** Allowed single-field sorts -> actual pipeline paths */
const SORT_MAP = {
  trailerNumber: "trailerNumber",
  owner: "owner",
  licensePlate: "licensePlate",
  stateOrProvince: "stateOrProvince",
  trailerType: "trailerType",
  condition: "condition",
  loadState: "loadState",
  year: "year",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  lastMoveTs: "lastMoveIoTs", // on Trailer doc
  truckNumber: "lastMoveIo.carrier.truckNumber", // from $lookup
} as const;

type SortKey = keyof typeof SORT_MAP;

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await guard(); // no-op if auth disabled

    const url = new URL(req.url);
    const yardId = url.searchParams.get("yardId") as EYardId | null;
    if (!yardId || !Object.values(EYardId).includes(yardId)) {
      throw new AppError(400, "yardId is required and must be a valid EYardId.");
    }

    // Pagination
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    // Search / filters
    const q = url.searchParams.get("q"); // general search: trailerNumber, licensePlate, vin, owner, make, model
    const trailerId = url.searchParams.get("trailerId");
    const truck = url.searchParams.get("truck"); // search by last movement's carrier.truckNumber
    const typeParam = url.searchParams.get("trailerType") as ETrailerType | null;
    const conditionParam = url.searchParams.get("condition") as ETrailerCondition | null;
    const loadParam = url.searchParams.get("loadState") as ETrailerLoadState | null;
    const expiredOnly = parseBool(url.searchParams.get("expiredOnly")); // safetyInspectionExpiryDate < now

    // Sorting (single-field)
    const sortBy = (url.searchParams.get("sortBy") as SortKey | null) || "updatedAt";
    const sortDir = (url.searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sortPath = SORT_MAP[sortBy] || "updatedAt";

    // Base match: only IN in the specified yard
    const $match: Record<string, any> = {
      status: ETrailerStatus.IN,
      yardId,
    };

    if (trailerId) {
      if (!isValidObjectId(trailerId)) throw new AppError(400, "Invalid trailerId.");
      $match._id = new Types.ObjectId(trailerId);
    }

    if (typeParam && Object.values(ETrailerType).includes(typeParam)) {
      $match.trailerType = typeParam;
    }

    if (conditionParam && Object.values(ETrailerCondition).includes(conditionParam)) {
      $match.condition = conditionParam;
    }

    if (loadParam && Object.values(ETrailerLoadState).includes(loadParam)) {
      $match.loadState = loadParam;
    }

    if (expiredOnly === true) {
      $match.safetyInspectionExpiryDate = { $lt: new Date() };
    }

    // Free-text query across a few identity fields
    if (q && q.trim()) {
      const r = rx(q.trim());
      $match.$or = [{ trailerNumber: r }, { licensePlate: r }, { vin: r }, { owner: r }, { make: r }, { model: r }];
    }

    // Build aggregation
    const pipeline: any[] = [
      { $match },
      // Attach the latest IN/OUT movement as lastMoveIo (array -> object)
      {
        $lookup: {
          from: "movements",
          let: { trailerId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$trailer", "$$trailerId"] }, type: { $in: [EMovementType.IN, EMovementType.OUT] } } },
            { $sort: { ts: -1 } },
            { $limit: 1 },
            // Only project what we need
            { $project: { ts: 1, "carrier.truckNumber": 1, type: 1, yardId: 1 } },
          ],
          as: "lastMoveIo",
        },
      },
      { $addFields: { lastMoveIo: { $first: "$lastMoveIo" } } },
    ];

    // Optional truck filter based on lastMoveIo.carrier.truckNumber
    if (truck && truck.trim()) {
      pipeline.push({ $match: { "lastMoveIo.carrier.truckNumber": rx(truck.trim()) } });
    }

    // Count + page results in one go
    pipeline.push(
      {
        $facet: {
          rows: [
            // Sorting
            { $sort: { [sortPath]: sortDir, _id: 1 } },
            // Pagination
            { $skip: skip },
            { $limit: limit },
            // Final projection
            {
              $project: {
                trailerNumber: 1,
                owner: 1,
                make: 1,
                model: 1,
                year: 1,
                vin: 1,
                licensePlate: 1,
                stateOrProvince: 1,
                trailerType: 1,
                safetyInspectionExpiryDate: 1,
                comments: 1,
                status: 1,
                yardId: 1,
                lastMoveIoTs: 1,
                loadState: 1,
                condition: 1,
                totalMovements: 1,
                createdAt: 1,
                updatedAt: 1,
                // from lookup:
                lastMoveIo: 1,
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
      }
    );

    const agg = await Trailer.aggregate(pipeline).allowDiskUse(true);
    const { rows, total } = (agg?.[0] as any) || { rows: [], total: 0 };

    const totalPages = Math.max(Math.ceil((total as number) / limit), 1);

    return successResponse(200, "OK", {
      data: rows,
      meta: {
        yardId,
        page,
        pageSize: limit,
        total,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        sortBy,
        sortDir: sortDir === 1 ? "asc" : "desc",
        filters: {
          q: q || null,
          trailerId: trailerId || null,
          truck: truck || null,
          trailerType: typeParam || null,
          condition: conditionParam || null,
          loadState: loadParam || null,
          expiredOnly: expiredOnly ?? null,
        },
      },
    });
  } catch (err: any) {
    return errorResponse(err);
  }
}
