// src/app/api/v1/guard/trailers/[id]/last-movement/route.ts
/**
 * GET /api/v1/guard/trailers/:id/last-movement
 * -----------------------------------------------------------------------------
 * Purpose
 *   Return the most recent movement for a trailer (IN, OUT, or INSPECTION).
 *
 * Query: Required
 *   (none)
 *
 * Path Params
 *   - id: string  (Mongo ObjectId of the trailer)
 *
 * Response (200)
 *   {
 *     "message": "OK",
 *     "data": Movement
 *   }
 *
 * Errors
 *   - 400: Invalid trailer id
 *   - 404: No movements found for this trailer
 */

import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";

import { Movement } from "@/mongoose/models/Movement";
import { isValidObjectId } from "mongoose";

// Next.js 15: params is a Promise
type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    await connectDB();
    await guard();

    const { id } = await ctx.params;

    if (!isValidObjectId(id)) {
      throw new AppError(400, "Invalid trailer id.");
    }

    // Latest movement of ANY type
    const movement = await Movement.findOne({ trailer: id }).sort({ ts: -1 }).lean();

    if (!movement) {
      throw new AppError(404, "No movements found for this trailer.");
    }

    return successResponse(200, "OK", movement);
  } catch (err: any) {
    return errorResponse(err);
  }
}
