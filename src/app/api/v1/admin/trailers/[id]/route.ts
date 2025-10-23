// src/app/api/v1/admin/trailers/[id]/route.ts

import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";

import { Trailer } from "@/mongoose/models/Trailer";
import { Movement } from "@/mongoose/models/Movement";
import { isValidObjectId } from "mongoose";
import { ETrailerCondition, ETrailerLoadState, ETrailerType } from "@/types/Trailer.types";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { parseEnumParam } from "@/lib/utils/queryUtils";

// Next.js 15: params is a Promise
type RouteCtx = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/admin/trailers/:id
 * -----------------------------------------------------------------------------
 * Purpose
 *   Fetch a single trailer by Mongo _id.
 *
 * Auth
 *   Requires a signed-in user (guard()).
 *
 * Params
 *   - :id (string, Mongo ObjectId)
 *
 * Responses
 *   - 200 OK: { ok: true, data: <Trailer> }
 *   - 400 Bad Request: missing/invalid id
 *   - 404 Not Found: trailer does not exist
 */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    await connectDB();
    await guard();

    const { id } = await ctx.params;
    if (!id) throw new AppError(400, "Missing trailer id in route param.");
    if (!isValidObjectId(id)) throw new AppError(400, "Invalid trailer id.");

    const doc = await Trailer.findById(id);
    if (!doc) throw new AppError(404, "Trailer not found.");

    return successResponse(200, "OK", doc);
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
