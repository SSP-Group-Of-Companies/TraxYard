// src/types/stats.types.ts
import { EYardId } from "./yard.types";
import type { APP_TZ } from "@/lib/utils/dateUtils";

export type TYardDayStat = {
  yardId: EYardId;

  /** 'YYYY-MM-DD' in APP_TZ (unique with yardId) */
  dayKey: string;

  /** Explicit TZ kept for clarity/audit; enforced to 'America/Toronto' in schema */
  tz: typeof APP_TZ;

  /** UTC instant of local midnight for that dayKey (DST-safe) */
  dayStartUtc: Date;

  inCount: number;
  outCount: number;
  inspectionCount: number;
  damageCount: number;
};
