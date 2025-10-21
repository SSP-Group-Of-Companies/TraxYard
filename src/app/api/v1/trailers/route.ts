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
 *   - q: string              matches trailerId (trailerNumber) OR truckNumber
 *   - trailerType: enum      DRY_VAN | FLATBED | FLATBED_ROLL_TITE | STEP_DECK | STEP_DECK_ROLL_TITE
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
 *       filters: { q, trailerType, condition, loadState, expiredOnly }
 *     }
 *   }
 *
 * Examples
 *   /api/v1/trailers?yardId=YARD2
 *   /api/v1/trailers?yardId=YARD2&q=TRLR-1002          // trailerId (trailerNumber)
 *   /api/v1/trailers?yardId=YARD2&q=TRK-102            // truckNumber (from lastMoveIo)
 *   /api/v1/trailers?yardId=YARD2&trailerType=FLATBED_ROLL_TITE&loadState=LOADED
 *   /api/v1/trailers?yardId=YARD2&expiredOnly=true&sortBy=licensePlate&sortDir=asc
 */

import { NextRequest } from "next/server";
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

/** Case-insensitive, escaped regex */
function rx(s: string) {
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/** Allowed single-field sorts -> pipeline paths */
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
  lastMoveTs: "lastMoveIoTs",
  truckNumber: "lastMoveIo.carrier.truckNumber",
} as const;

type SortKey = keyof typeof SORT_MAP;

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await guard();

    const url = new URL(req.url);

    // EYardId required
    const yardId = url.searchParams.get("yardId") as EYardId | null;
    if (!yardId || !Object.values(EYardId).includes(yardId)) {
      throw new AppError(400, "yardId is required and must be one of EYardId.");
    }

    // Pagination
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    // Filters
    const q = url.searchParams.get("q")?.trim() || "";
    const typeParamRaw = url.searchParams.get("trailerType");
    const conditionRaw = url.searchParams.get("condition");
    const loadRaw = url.searchParams.get("loadState");
    const expiredOnly = parseBool(url.searchParams.get("expiredOnly"));

    // Validate enums STRICTLY if present
    let typeParam: ETrailerType | null = null;
    if (typeParamRaw != null) {
      if (!(Object.values(ETrailerType) as string[]).includes(typeParamRaw)) {
        throw new AppError(400, `Invalid trailerType. Allowed: ${Object.values(ETrailerType).join(", ")}`);
      }
      typeParam = typeParamRaw as ETrailerType;
    }

    let conditionParam: ETrailerCondition | null = null;
    if (conditionRaw != null) {
      if (!(Object.values(ETrailerCondition) as string[]).includes(conditionRaw)) {
        throw new AppError(400, `Invalid condition. Allowed: ${Object.values(ETrailerCondition).join(", ")}`);
      }
      conditionParam = conditionRaw as ETrailerCondition;
    }

    let loadParam: ETrailerLoadState | null = null;
    if (loadRaw != null) {
      if (!(Object.values(ETrailerLoadState) as string[]).includes(loadRaw)) {
        throw new AppError(400, `Invalid loadState. Allowed: ${Object.values(ETrailerLoadState).join(", ")}`);
      }
      loadParam = loadRaw as ETrailerLoadState;
    }

    // Sorting
    const sortByRaw = (url.searchParams.get("sortBy") as SortKey | null) || "updatedAt";
    if (!(sortByRaw in SORT_MAP)) {
      throw new AppError(400, `Invalid sortBy. Allowed: ${Object.keys(SORT_MAP).join(", ")}`);
    }
    const sortBy = sortByRaw;
    const sortDir = (url.searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sortPath = SORT_MAP[sortBy];

    // Base match: IN + yard
    const baseMatch: Record<string, any> = { status: ETrailerStatus.IN, yardId };
    if (typeParam) baseMatch.trailerType = typeParam;
    if (conditionParam) baseMatch.condition = conditionParam;
    if (loadParam) baseMatch.loadState = loadParam;
    if (expiredOnly === true) baseMatch.safetyInspectionExpiryDate = { $lt: new Date() };

    const pipeline: any[] = [
      { $match: baseMatch },
      {
        $lookup: {
          from: "movements",
          let: { trailerId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$trailer", "$$trailerId"] }, type: { $in: [EMovementType.IN, EMovementType.OUT] } } },
            { $sort: { ts: -1 } },
            { $limit: 1 },
            { $project: { ts: 1, "carrier.truckNumber": 1, type: 1, yardId: 1 } },
          ],
          as: "lastMoveIo",
        },
      },
      { $addFields: { lastMoveIo: { $first: "$lastMoveIo" } } },
    ];

    // q only: trailerNumber OR lastMoveIo.carrier.truckNumber
    if (q) {
      const r = rx(q);
      pipeline.push({ $match: { $or: [{ trailerNumber: r }, { "lastMoveIo.carrier.truckNumber": r }] } });
    }

    pipeline.push(
      {
        $facet: {
          rows: [
            { $sort: { [sortPath]: sortDir, _id: 1 } },
            { $skip: skip },
            { $limit: limit },
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
          trailerType: typeParam ?? null,
          condition: conditionParam ?? null,
          loadState: loadParam ?? null,
          expiredOnly: expiredOnly ?? null,
        },
      },
    });
  } catch (err: any) {
    return errorResponse(err);
  }
}
