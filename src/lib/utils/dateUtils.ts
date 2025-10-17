import { addDays, format } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const APP_TZ = "America/Toronto" as const;

export type TBusinessDay = {
  dayKey: string; // 'YYYY-MM-DD' in APP_TZ
  tz: typeof APP_TZ; // explicit for clarity/audit
  dayStartUtc: Date; // UTC instant of local midnight (DST-safe)
};

export function toDayKey(instant: Date, tz: string = APP_TZ): string {
  return formatInTimeZone(instant, tz, "yyyy-MM-dd");
}

export function dayKeyToStartUtc(dayKey: string, tz: string = APP_TZ): Date {
  // Local midnight in tz → UTC instant
  return fromZonedTime(`${dayKey}T00:00:00`, tz);
}

export function nowAsBusinessDay(): TBusinessDay {
  const now = new Date();
  const dayKey = toDayKey(now, APP_TZ);
  const dayStartUtc = dayKeyToStartUtc(dayKey, APP_TZ);
  return { dayKey, tz: APP_TZ, dayStartUtc };
}

export function dayKeyUtcRange(dayKey: string, tz: string = APP_TZ): { startUtc: Date; endUtc: Date } {
  const startUtc = dayKeyToStartUtc(dayKey, tz);
  // Convert to local, add 1 local day, then get next local midnight → UTC
  const startLocal = toZonedTime(startUtc, tz);
  const nextLocalMidnight = addDays(startLocal, 1);
  const nextDayKey = format(nextLocalMidnight, "yyyy-MM-dd");
  const endUtc = dayKeyToStartUtc(nextDayKey, tz);
  return { startUtc, endUtc };
}

export function isDayKey(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
