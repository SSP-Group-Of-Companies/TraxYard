// src/app/api/v1/admin/trailers/route.ts
/**
 * GET /api/v1/admin/trailers
 * -----------------------------------------------------------------------------
 * Purpose
 *   Admin search over ALL trailers (across all yards). Unlike the Guard route,
 *   this endpoint does NOT force status=IN and does NOT require yardId.
 *   Admins may optionally filter by yardId (and/or other filters).
 *
 * Optional (all combine together)
 *   - yardId: EYardId         YARD1 | YARD2 | YARD3  (if omitted => all yards)
 *   - status: enum            IN | OUT                (if omitted => both)
 *   - page: number            default 1   (min 1)
 *   - limit: number           default 20  (min 1, max 100)
 *   - q: string               case-insensitive match on:
 *                             • trailerNumber
 *                             • owner
 *                             • vin
 *                             • licensePlate
 *                             • make
 *   - trailerType: enum       DRY_VAN | FLATBED | FLATBED_ROLL_TITE | STEP_DECK | STEP_DECK_ROLL_TITE
 *   - condition: enum         ACTIVE | OUT_OF_SERVICE | DAMAGED
 *   - loadState: enum         EMPTY | LOADED | UNKNOWN
 *   - expiredOnly: boolean    true => safetyInspectionExpiryDate in the past
 *
 * Sorting (single field)
 *   - sortBy: trailerNumber | owner | licensePlate | stateOrProvince | trailerType |
 *             condition | loadState | status | year | createdAt | updatedAt |
 *             lastMoveTs | truckNumber | yardId
 *   - sortDir: asc | desc   (default: desc)
 *
 * Response (200)
 *   {
 *     message: "OK",
 *     data: Trailer[],
 *     meta: {
 *       page, pageSize, total, totalPages, hasPrev, hasNext,
 *       sortBy, sortDir,
 *       filters: { yardId, status, q, trailerType, condition, loadState, expiredOnly }
 *     }
 *   }
 *
 * Examples
 *   /api/v1/admin/trailers                          // all trailers, all yards
 *   /api/v1/admin/trailers?yardId=YARD2             // only YARD2
 *   /api/v1/admin/trailers?status=OUT               // all OUT trailers across yards
 *   /api/v1/admin/trailers?q=TRL-1001               // matches trailerNumber
 *   /api/v1/admin/trailers?q=acme                   // matches owner or make
 *   /api/v1/admin/trailers?q=1GRAA0620BW123456      // matches vin
 *   /api/v1/admin/trailers?q=ABCZ-912               // matches licensePlate
 *   /api/v1/admin/trailers?expiredOnly=true&sortBy=licensePlate&sortDir=asc
 *   /api/v1/admin/trailers?yardId=YARD1&status=IN&loadState=EMPTY
 */

import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";

import { Trailer } from "@/mongoose/models/Trailer";
import { ETrailerStatus, ETrailerCondition, ETrailerLoadState, ETrailerType } from "@/types/Trailer.types";
import { EYardId } from "@/types/yard.types";
import { EMovementType } from "@/types/movement.types";

import { parseBool, rx, parseEnumParam, parsePagination, parseSort, buildMeta } from "@/lib/utils/queryUtils";
import { parseJsonBody } from "@/lib/utils/reqParser";

const SORT_MAP = {
  trailerNumber: "trailerNumber",
  owner: "owner",
  licensePlate: "licensePlate",
  stateOrProvince: "stateOrProvince",
  trailerType: "trailerType",
  condition: "condition",
  loadState: "loadState",
  status: "status",
  year: "year",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  lastMoveTs: "lastMoveIoTs",
  truckNumber: "lastMoveIo.carrier.truckNumber",
  yardId: "yardId",
} as const;
type SortKey = keyof typeof SORT_MAP;

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await guard();

    const url = new URL(req.url);

    // yardId is OPTIONAL for admins
    const yardIdParam = parseEnumParam(url.searchParams.get("yardId"), Object.values(EYardId) as readonly EYardId[], "yardId");

    // Optional: status (IN | OUT)
    const statusParam = parseEnumParam(url.searchParams.get("status"), Object.values(ETrailerStatus) as readonly ETrailerStatus[], "status");

    // Pagination
    const { page, limit, skip } = parsePagination(url.searchParams.get("page"), url.searchParams.get("limit"));

    // Filters
    const q = url.searchParams.get("q")?.trim() || "";
    const typeParam = parseEnumParam(url.searchParams.get("trailerType"), Object.values(ETrailerType) as readonly ETrailerType[], "trailerType");
    const conditionParam = parseEnumParam(url.searchParams.get("condition"), Object.values(ETrailerCondition) as readonly ETrailerCondition[], "condition");
    const loadParam = parseEnumParam(url.searchParams.get("loadState"), Object.values(ETrailerLoadState) as readonly ETrailerLoadState[], "loadState");
    const expiredOnly = parseBool(url.searchParams.get("expiredOnly"));

    // Sorting
    const allowedKeys = Object.keys(SORT_MAP) as readonly SortKey[];
    const { sortBy, sortDir } = parseSort(url.searchParams.get("sortBy"), url.searchParams.get("sortDir"), allowedKeys, "updatedAt");
    const sortPath = SORT_MAP[sortBy];

    // Base match: optionally filter by yardId + other filters
    const baseMatch: Record<string, any> = {};
    if (yardIdParam) baseMatch.yardId = yardIdParam;
    if (statusParam) baseMatch.status = statusParam;
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
            {
              $match: {
                $expr: { $eq: ["$trailer", "$$trailerId"] },
                type: { $in: [EMovementType.IN, EMovementType.OUT] },
              },
            },
            { $sort: { ts: -1 } },
            { $limit: 1 },
            { $project: { ts: 1, "carrier.truckNumber": 1, type: 1, yardId: 1 } },
          ],
          as: "lastMoveIo",
        },
      },
      { $addFields: { lastMoveIo: { $first: "$lastMoveIo" } } },
    ];

    // q: trailerNumber | owner | vin | licensePlate | make (case-insensitive via rx)
    if (q) {
      const r = rx(q);
      pipeline.push({
        $match: {
          $or: [{ trailerNumber: r }, { owner: r }, { vin: r }, { licensePlate: r }, { make: r }],
        },
      });
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

    return successResponse(200, "OK", {
      data: rows,
      meta: buildMeta({
        page,
        pageSize: limit,
        total,
        sortBy,
        sortDir,
        filters: {
          yardId: yardIdParam ?? null,
          status: statusParam ?? null,
          q: q || null,
          trailerType: typeParam ?? null,
          condition: conditionParam ?? null,
          loadState: loadParam ?? null,
          expiredOnly: expiredOnly ?? null,
        },
      }),
    });
  } catch (err: any) {
    return errorResponse(err);
  }
}

// src/app/api/v1/admin/trailers/route.ts
/**
 * POST /api/v1/admin/trailers
 * -----------------------------------------------------------------------------
 * Purpose
 *   Create a new trailer. Admins CANNOT set status or yard; those are controlled
 *   only by movements. Creation always sets:
 *     - status = OUT
 *     - yardId = undefined
 *
 * Required JSON body
 *   - trailerNumber: string (unique)
 *   - owner: string
 *   - make: string
 *   - model: string
 *   - year: number (1900..9999)
 *   - trailerType: ETrailerType
 *   - licensePlate: string
 *   - stateOrProvince: string
 *   - safetyInspectionExpiryDate: ISO date string
 *
 * Optional JSON body
 *   - vin?: string (unique, sparse)
 *   - condition?: ETrailerCondition (default: ACTIVE)
 *   - loadState?: ETrailerLoadState   (default: UNKNOWN)
 *   - comments?: string
 *
 * Notes
 *   - Any provided `status` or `yardId` will be ignored.
 *   - lastMoveIo / lastMoveIoTs are not set here (movements will populate).
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    await guard();

    const body = await parseJsonBody(req);

    // Required primitives
    const trailerNumber = String(body.trailerNumber || "").trim();
    const owner = String(body.owner || "").trim();
    const make = String(body.make || "").trim();
    const model = String(body.model || "").trim();
    const year = Number(body.year);
    const licensePlate = String(body.licensePlate || "").trim();
    const stateOrProvince = String(body.stateOrProvince || "").trim();
    const safetyInspectionExpiryDateRaw = body.safetyInspectionExpiryDate;

    if (!trailerNumber) throw new AppError(400, "trailerNumber is required.");
    if (!owner) throw new AppError(400, "owner is required.");
    if (!make) throw new AppError(400, "make is required.");
    if (!model) throw new AppError(400, "model is required.");
    if (!Number.isFinite(year)) throw new AppError(400, "year must be a number.");
    if (!licensePlate) throw new AppError(400, "licensePlate is required.");
    if (!stateOrProvince) throw new AppError(400, "stateOrProvince is required.");
    if (!safetyInspectionExpiryDateRaw) {
      throw new AppError(400, "safetyInspectionExpiryDate is required.");
    }

    const safetyInspectionExpiryDate = new Date(safetyInspectionExpiryDateRaw);
    if (isNaN(safetyInspectionExpiryDate.getTime())) {
      throw new AppError(400, "safetyInspectionExpiryDate must be a valid ISO date.");
    }

    // Enums
    const trailerType = parseEnumParam(body.trailerType, Object.values(ETrailerType) as readonly ETrailerType[], "trailerType");
    if (!trailerType) throw new AppError(400, "trailerType is required and must be valid.");

    const condition = parseEnumParam(body.condition, Object.values(ETrailerCondition) as readonly ETrailerCondition[], "condition") ?? ETrailerCondition.ACTIVE;

    const loadState = parseEnumParam(body.loadState, Object.values(ETrailerLoadState) as readonly ETrailerLoadState[], "loadState") ?? ETrailerLoadState.UNKNOWN;

    // Optionals
    const vin = body.vin ? String(body.vin).trim() : undefined;
    const comments = body.comments ? String(body.comments).trim() : undefined;

    const created = await Trailer.create({
      trailerNumber,
      owner,
      make,
      model,
      year,
      vin,
      licensePlate, // model upper-trims for canonicalization
      stateOrProvince, // model upper-trims for canonicalization
      trailerType, // model upper-trims to UPPER_SNAKE
      safetyInspectionExpiryDate,
      comments,
      condition,
      loadState,
      status: ETrailerStatus.OUT, // forced by policy
      yardId: undefined, // forced by policy
      // totalMovements defaults to 0 via schema
    });

    return successResponse(201, "Created", created);
  } catch (err: any) {
    return errorResponse(err);
  }
}
