// src/app/api/v1/yards/[yardId]/dashboard/route.ts
/**
 * --------------------------------------------------------------------------
 *  YARD DASHBOARD DATA API
 *  -------------------------------------------------------------------------
 *  Method: GET
 *  Path:   /api/v1/yards/[yardId]/dashboard
 *
 *  Purpose:
 *  --------
 *  Provides all data required for the Guard-side Yard Dashboard view.
 *  This includes:
 *   • Yard capacity snapshot (current vs max)
 *   • Today's YardDayStat document (counts for IN / OUT / inspection / damage)
 *   • Current weather (from Open-Meteo) with rich hint fields for icons and UI
 *
 *  Request:
 *  --------
 *  GET /api/v1/yards/YARD_1/dashboard
 *
 *  Parameters:
 *   - [yardId] : one of EYardId (e.g., YARD_1, YARD_2, YARD_3)
 *     derived from your /data/yards.ts constant.
 *
 *  Response (200 OK):
 *  ------------------
 *  {
 *    "ok": true,
 *    "data": {
 *      "yard": {
 *        "id": "YARD_1",
 *        "name": "Downtown Yard",
 *        "capacity": { "current": 34, "max": 50 }
 *      },
 *      "stats": {
 *        "_id": "...",                // YardDayStat Mongo doc (same shape as DB)
 *        "yardId": "YARD_1",
 *        "dayKey": "2025-10-21",
 *        "inCount": 12,
 *        "outCount": 10,
 *        "inspectionCount": 4,
 *        "damageCount": 2,
 *        "tz": "America/Toronto",
 *        "dayStartUtc": "2025-10-21T04:00:00.000Z"
 *      },
 *      "weather": {
 *        "provider": "open-meteo",
 *        "asOfIso": "2025-10-21T13:30:00Z",
 *        "temperatureC": 18.5,
 *        "feelsLikeC": 17.9,
 *        "humidityPct": 62,
 *        "precipitationMm": 0.2,
 *        "windSpeedKph": 15,
 *        "windGustKph": 20,
 *        "windCategory": "moderate",
 *        "cloudCoverPct": 35,
 *        "wmoCode": 2,
 *        "label": "Partly cloudy",
 *        "iconHint": "partly-cloudy",
 *        "isDay": true,
 *        "dayPeriod": "day",
 *        "cloudiness": "partly-cloudy",
 *        "precipKind": "none",
 *        "intensity": "none",
 *        "hasThunder": false,
 *        "hasHail": false,
 *        "isFreezing": false,
 *        "isFog": false
 *      }
 *    }
 *  }
 *
 *  Error Responses:
 *  ----------------
 *  404  { ok: false, message: "Unknown yardId: ..." }
 *  500  { ok: false, message: "Internal server error." }
 *
 *  Notes:
 *  ------
 *   • Weather data is proxied via the backend (no frontend API key needed)
 *   • Uses today's YardDayStat (no ?date param)
 *   • Uses `await ctx.params` for Next.js 15 compatibility
 * --------------------------------------------------------------------------
 */
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";

import { Trailer } from "@/mongoose/models/Trailer";
import { YardDayStat } from "@/mongoose/models/YardDayStat";

import { yards } from "@/data/yards";
import { APP_TZ, toDayKey } from "@/lib/utils/dateUtils";
import { EYardId } from "@/types/yard.types";
import { ETrailerStatus } from "@/types/Trailer.types";
import { getOpenMeteoCurrent } from "@/lib/utils/weather/openMeteo";

export async function GET(_: NextRequest, ctx: { params: Promise<{ yardId: EYardId }> }) {
  try {
    await guard();
    await connectDB();

    const { yardId } = await ctx.params;
    const yard = yards.find((y) => y.id === yardId);
    if (!yard) throw new AppError(404, `Unknown yardId: ${yardId}`);

    const max = yard.capacity ?? 0;

    const [currentInCount, todaysStat, weather] = await Promise.all([
      Trailer.countDocuments({ yardId, status: ETrailerStatus.IN }),
      YardDayStat.findOne({ yardId, dayKey: toDayKey(new Date(), APP_TZ) }).lean(),
      (async () => {
        const loc = yard.location;
        if (loc?.latitude != null && loc?.longitude != null) {
          return getOpenMeteoCurrent(loc.latitude, loc.longitude);
        }
        return null;
      })(),
    ]);

    return successResponse(200, "yard dashboard data retrieved", {
      yard: {
        id: yard.id,
        name: yard.name,
        capacity: { current: currentInCount, max },
      },
      stats: todaysStat ?? null,
      weather, // includes iconHint + label for UI
    });
  } catch (err) {
    return errorResponse(err);
  }
}
