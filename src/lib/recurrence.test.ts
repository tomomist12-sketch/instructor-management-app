import { test } from "node:test";
import assert from "node:assert/strict";
import { expandRecurrenceDateKeys } from "./recurrence";

test("none: 常に開始日1件のみ", () => {
  assert.deepEqual(expandRecurrenceDateKeys("2026-08-03", "none", 5), ["2026-08-03"]);
});

test("weekly: 7日刻みでcount件", () => {
  assert.deepEqual(
    expandRecurrenceDateKeys("2026-08-03", "weekly", 3),
    ["2026-08-03", "2026-08-10", "2026-08-17"]
  );
});

test("biweekly: 14日刻み", () => {
  assert.deepEqual(
    expandRecurrenceDateKeys("2026-08-03", "biweekly", 3),
    ["2026-08-03", "2026-08-17", "2026-08-31"]
  );
});

test("monthly: 通常は同じ日", () => {
  assert.deepEqual(
    expandRecurrenceDateKeys("2026-08-15", "monthly", 3),
    ["2026-08-15", "2026-09-15", "2026-10-15"]
  );
});

test("monthly: 月末は存在しない日を月末に丸める(1/31→2/28→3/31)", () => {
  assert.deepEqual(
    expandRecurrenceDateKeys("2026-01-31", "monthly", 3),
    ["2026-01-31", "2026-02-28", "2026-03-31"]
  );
});

test("weekly: 月境界をまたぐ", () => {
  assert.deepEqual(
    expandRecurrenceDateKeys("2026-08-31", "weekly", 2),
    ["2026-08-31", "2026-09-07"]
  );
});

test("count<=1 や不正countは1件", () => {
  assert.deepEqual(expandRecurrenceDateKeys("2026-08-03", "weekly", 1), ["2026-08-03"]);
  assert.deepEqual(expandRecurrenceDateKeys("2026-08-03", "weekly", 0), ["2026-08-03"]);
});
