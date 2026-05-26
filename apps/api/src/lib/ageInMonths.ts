/**
 * Calendar-month age based on birth date. Returns an integer count of
 * months elapsed since `birthDate` as of `on` (default: now).
 *
 * Examples:
 *   birth 2025-11-15, on 2026-05-15 → 6
 *   birth 2025-11-15, on 2026-05-14 → 5 (day-of-month rolls back)
 *   birth 2026-05-20, on 2026-05-26 → 0
 */
export function ageInMonths(birthDate: Date, on: Date = new Date()): number {
  const months =
    (on.getFullYear() - birthDate.getFullYear()) * 12 + (on.getMonth() - birthDate.getMonth());
  return on.getDate() < birthDate.getDate() ? months - 1 : months;
}
