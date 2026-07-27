// 初回コンサル同期用: Googleカレンダーのイベントを、事前に講師へ置かれた
// 「空きコンサル枠」にマッチさせるための純粋ロジック（DB非依存・テスト可能）。

export type SlotCandidate = {
  id: string;
  instructorId: string;
  scheduledAt: Date;
  hasGcalLink: boolean; // memo に "gcal:" を含むか（=既にGoogle予定と紐付け済み）
  status: string; // "scheduled" | "completed" | "canceled"
};

// Googleカレンダーの説明欄から申込者の氏名・メールを抽出
export function parseApplicants(description: string | null): { names: string[]; emails: string[] } {
  const names: string[] = [];
  const emails: string[] = [];
  for (const line of (description || "").split("\n")) {
    const nameMatch = line.match(/お名前[：:]\s*(.+)/);
    if (nameMatch) names.push(nameMatch[1].trim());
    // 「メールアドレス：」「メール：」の両方に対応
    const emailMatch = line.match(/メール(?:アドレス)?[：:]\s*(\S+)/);
    if (emailMatch) emails.push(emailMatch[1].trim());
  }
  return { names, emails };
}

// スケジュールのメモ欄テキストを組み立て（先頭に gcal:ID を必ず含める）
export function buildConsultMemo(
  eventId: string,
  url: string | null,
  names: string[],
  emails: string[]
): string {
  let memo = `gcal:${eventId}`;
  if (url) memo += `\n🔗 ${url}`;
  if (names.length > 0) {
    memo += "\n【申込者】";
    for (let i = 0; i < names.length; i++) {
      memo += `\n${names[i]}`;
      if (emails[i]) memo += `\n  📧 ${emails[i]}`;
    }
  }
  return memo;
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// JST(+09:00)での日付キー "YYYY-MM-DD" を返す
export function jstDateKey(d: Date): string {
  return new Date(d.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

// JSTでの「その日の何分目か」(0-1439)
function jstMinutesOfDay(d: Date): number {
  const shifted = new Date(d.getTime() + JST_OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

// イベントに統合すべき事前枠を1つ選ぶ。無ければ null。
// - 同じJST日付の first_consult 枠のみ対象
// - 既に gcal 紐付け済み / キャンセル / usedIds 済み は除外
// - 候補が複数なら開始時刻がイベントに最も近いものを選ぶ
export function pickSlotForEvent(
  eventStart: Date,
  candidates: SlotCandidate[],
  usedIds: Set<string> = new Set()
): SlotCandidate | null {
  const targetDate = jstDateKey(eventStart);
  const eventMin = jstMinutesOfDay(eventStart);

  const eligible = candidates.filter(
    (c) =>
      !c.hasGcalLink &&
      c.status !== "canceled" &&
      !usedIds.has(c.id) &&
      jstDateKey(c.scheduledAt) === targetDate
  );
  if (eligible.length === 0) return null;

  let best = eligible[0];
  let bestDiff = Math.abs(jstMinutesOfDay(best.scheduledAt) - eventMin);
  for (const c of eligible.slice(1)) {
    const diff = Math.abs(jstMinutesOfDay(c.scheduledAt) - eventMin);
    if (diff < bestDiff) {
      best = c;
      bestDiff = diff;
    }
  }
  return best;
}
