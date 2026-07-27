import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jstDateKey,
  pickSlotForEvent,
  parseApplicants,
  buildConsultMemo,
  type SlotCandidate,
} from "./consult-match";

function slot(partial: Partial<SlotCandidate> & { id: string; scheduledAt: Date }): SlotCandidate {
  return {
    instructorId: "inst-" + partial.id,
    hasGcalLink: false,
    status: "scheduled",
    ...partial,
  };
}

// --- jstDateKey ---
test("jstDateKey: +09:00 表記はそのままの日付", () => {
  assert.equal(jstDateKey(new Date("2026-08-06T11:00:00+09:00")), "2026-08-06");
});

test("jstDateKey: UTC15時は翌日のJST", () => {
  // 15:00Z == 翌00:00 JST
  assert.equal(jstDateKey(new Date("2026-08-06T15:00:00Z")), "2026-08-07");
});

test("jstDateKey: UTC14:59は当日のJST(23:59)", () => {
  assert.equal(jstDateKey(new Date("2026-08-06T14:59:00Z")), "2026-08-06");
});

// --- pickSlotForEvent ---
test("同じ日の枠が1つなら時刻が違っても選ぶ", () => {
  const s = slot({ id: "a", scheduledAt: new Date("2026-08-06T10:00:00+09:00") });
  const chosen = pickSlotForEvent(new Date("2026-08-06T11:00:00+09:00"), [s], new Set());
  assert.equal(chosen?.id, "a");
});

test("同じ日の枠が無ければ null（→デフォルト作成にフォールバック）", () => {
  const s = slot({ id: "a", scheduledAt: new Date("2026-08-05T10:00:00+09:00") });
  const chosen = pickSlotForEvent(new Date("2026-08-06T21:00:00+09:00"), [s], new Set());
  assert.equal(chosen, null);
});

test("同日に複数枠があれば開始時刻が最も近い枠を選ぶ", () => {
  const morning = slot({ id: "am", scheduledAt: new Date("2026-08-06T10:00:00+09:00") });
  const night = slot({ id: "pm", scheduledAt: new Date("2026-08-06T21:00:00+09:00") });
  const chosen = pickSlotForEvent(new Date("2026-08-06T20:30:00+09:00"), [morning, night], new Set());
  assert.equal(chosen?.id, "pm");
});

test("usedIds に入った枠は再利用しない（同日2件のイベントを別枠へ）", () => {
  const morning = slot({ id: "am", scheduledAt: new Date("2026-08-06T11:00:00+09:00") });
  const night = slot({ id: "pm", scheduledAt: new Date("2026-08-06T21:00:00+09:00") });
  const candidates = [morning, night];
  const used = new Set<string>();

  const first = pickSlotForEvent(new Date("2026-08-06T11:00:00+09:00"), candidates, used);
  assert.equal(first?.id, "am");
  used.add(first!.id);

  const second = pickSlotForEvent(new Date("2026-08-06T21:00:00+09:00"), candidates, used);
  assert.equal(second?.id, "pm");
});

test("既にgcal紐付け済みの枠は候補から除外", () => {
  const linked = slot({ id: "linked", scheduledAt: new Date("2026-08-06T11:00:00+09:00"), hasGcalLink: true });
  const chosen = pickSlotForEvent(new Date("2026-08-06T11:00:00+09:00"), [linked], new Set());
  assert.equal(chosen, null);
});

test("キャンセル済みの枠は候補から除外", () => {
  const canceled = slot({ id: "c", scheduledAt: new Date("2026-08-06T11:00:00+09:00"), status: "canceled" });
  const chosen = pickSlotForEvent(new Date("2026-08-06T11:00:00+09:00"), [canceled], new Set());
  assert.equal(chosen, null);
});

// --- parseApplicants ---
test("parseApplicants: 複数の申込者の氏名とメールを抽出", () => {
  const desc =
    "[申込者情報]\nお名前：黒川 大樹\nメールアドレス：gl.kuro11@gmail.com\n" +
    "----------------------------\nお名前：益田 弦毅\nメールアドレス：masudagenki2@gmail.com";
  const { names, emails } = parseApplicants(desc);
  assert.deepEqual(names, ["黒川 大樹", "益田 弦毅"]);
  assert.deepEqual(emails, ["gl.kuro11@gmail.com", "masudagenki2@gmail.com"]);
});

test("parseApplicants: 「メール：」表記も拾う / null は空配列", () => {
  const { names, emails } = parseApplicants("お名前：佐藤 暢晃\nメール：nob@example.com");
  assert.deepEqual(names, ["佐藤 暢晃"]);
  assert.deepEqual(emails, ["nob@example.com"]);
  assert.deepEqual(parseApplicants(null), { names: [], emails: [] });
});

// --- buildConsultMemo ---
test("buildConsultMemo: gcal:ID・URL・申込者を整形", () => {
  const memo = buildConsultMemo("evt123", "https://zoom.us/j/1", ["黒川 大樹"], ["gl.kuro11@gmail.com"]);
  assert.ok(memo.startsWith("gcal:evt123"));
  assert.ok(memo.includes("🔗 https://zoom.us/j/1"));
  assert.ok(memo.includes("【申込者】"));
  assert.ok(memo.includes("黒川 大樹"));
  assert.ok(memo.includes("📧 gl.kuro11@gmail.com"));
});

test("buildConsultMemo: 申込者なしなら gcal のみ（URLも無ければ1行）", () => {
  assert.equal(buildConsultMemo("evt9", null, [], []), "gcal:evt9");
});
