/**
 * ローテーション設定の「主曜日 + 追加曜日」を実施曜日の配列(0=日..6=土, 昇順)に展開する。
 *
 * 注意: 追加曜日は `extra_days_of_week`（カンマ区切り文字列 or null）で保存される。
 * `"".split(",")` は `[""]`、`Number("")` は `0` になるため、空文字を除外しないと
 * 「追加曜日なし」のときに日曜(0)が誤って混入する（過去バグ）。必ず空要素を除去する。
 */
export function expandWeekdays(
  dayOfWeek: number,
  extraDaysOfWeek: string | null | undefined
): number[] {
  const extras = (extraDaysOfWeek ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return [...new Set([dayOfWeek, ...extras])].sort((a, b) => a - b);
}
