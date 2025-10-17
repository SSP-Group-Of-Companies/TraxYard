import { parseISO, isValid as isValidDate } from "date-fns";

// Utility for formatting date to yyyy-MM-dd
export const formatInputDate = (date: string | Date | undefined | null) => {
  if (!date) return "";
  const s = String(date);

  // If already plain date (from DB) keep as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Parse ISO (e.g., 2023-04-09T00:00:00.000Z)
  // Then format using UTC so we don't drift a day in local timezones
  let d: Date;
  try {
    d = parseISO(s);
  } catch {
    return "";
  }
  if (!isValidDate(d)) return "";

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
