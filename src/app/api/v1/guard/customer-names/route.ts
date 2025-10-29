// src/app/api/v1/guard/customer-names/route.ts
/**
 * GET /api/v1/guard/customer-names
 * -----------------------------------------------------------------------------
 * Purpose
 *   Return distinct customer names (case-insensitive) from Movement documents,
 *   filtered by a "q" substring match, with pagination.
 *
 * Query
 *   - q: string        (required) case-insensitive substring to search
 *   - page: number     default 1   (min 1)
 *   - limit: number    default 20  (min 1, max 100)
 *
 * Response (200 OK)
 *   {
 *     "success": true,
 *     "message": "OK",
 *     "data": {
 *       "data": ["Acme Staging", "Acme Steel", ...],
 *       "meta": {
 *         "page": 1,
 *         "pageSize": 20,
 *         "total": 37,
 *         "totalPages": 2,
 *         "hasPrev": false,
 *         "hasNext": true,
 *         "sortBy": "name",
 *         "sortDir": "asc",
 *         "filters": { "q": "acm" }
 *       }
 *     }
 *   }
 */

import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";
import { Movement } from "@/mongoose/models/Movement";
import { buildMeta, parsePagination, rx } from "@/lib/utils/queryUtils";

export async function GET(req: NextRequest) {
  try {
    await guard();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const { page, limit, skip } = parsePagination(searchParams.get("page"), searchParams.get("limit"), 100);

    if (!q) throw new AppError(400, "`q` query parameter is required.");

    // Case-insensitive match on substring
    const regex = rx(q);

    // Aggregate: match -> group by lower(name) to de-dupe -> pick a representative
    // -> sort by name asc -> facet for total + page slice
    const [result] = await Movement.aggregate([
      { $match: { "trip.customerName": { $type: "string", $regex: regex } } },
      {
        $group: {
          _id: { $toLower: "$trip.customerName" },
          name: { $first: "$trip.customerName" },
          count: { $sum: 1 }, // could be used to sort by popularity if desired
        },
      },
      // Sort alphabetically by the representative name
      { $sort: { name: 1 } },
      {
        $facet: {
          total: [{ $count: "n" }],
          rows: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ]);

    const total = result?.total?.[0]?.n ?? 0;
    const names: string[] = (result?.rows ?? []).map((r: any) => r.name as string);

    const meta = buildMeta({
      page,
      pageSize: limit,
      total,
      sortBy: "name",
      sortDir: 1, // asc
      filters: { q },
    });

    return successResponse(200, "customer names retrieved", { data: names, meta });
  } catch (err: any) {
    return errorResponse(err);
  }
}
