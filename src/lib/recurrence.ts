import { addDays, addMonths } from "date-fns";

export type RepeatRule = "none" | "weekly" | "biweekly" | "monthly";

/**
 * 繰り返しの日付キー(YYYY-MM-DD)列を生成する。
 * - UTC正午基準でDateを作りTZずれを回避（slice(0,10)がそのままJSTの日付キー）。
 * - monthly は date-fns の addMonths が月末を自動clamp（1/31 + 1month → 2/28）。
 */
export function expandRecurrenceDateKeys(
  startDateKey: string,
  repeat: string,
  count: number
): string[] {
  const [y, m, d] = startDateKey.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const n = repeat === "none" ? 1 : Math.max(1, Math.floor(count) || 1);
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    let dt: Date;
    if (repeat === "weekly") dt = addDays(base, i * 7);
    else if (repeat === "biweekly") dt = addDays(base, i * 14);
    else if (repeat === "monthly") dt = addMonths(base, i);
    else dt = base;
    keys.push(dt.toISOString().slice(0, 10));
  }
  return keys;
}
