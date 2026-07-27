import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCalendarEvents } from "@/lib/google-calendar";
import {
  pickSlotForEvent,
  parseApplicants,
  buildConsultMemo,
  type SlotCandidate,
} from "@/lib/consult-match";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 認証チェック（Cron or 手動同期ボタン用）
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // 手動同期ボタンからの呼び出しも許可
    const url = new URL(req.url);
    if (!url.searchParams.has("manual")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) {
    return NextResponse.json({ error: "GOOGLE_CALENDAR_ID is not set" }, { status: 500 });
  }

  try {
    // 今日から3ヶ月先までの予定を取得
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const timeMax = new Date(timeMin);
    timeMax.setMonth(timeMax.getMonth() + 3);

    const events = await fetchCalendarEvents(calendarId, timeMin, timeMax);

    // 「初回コンサル」に該当するイベントをフィルタ
    // タイトルに「コンサル」「consult」が含まれるものを対象
    const consultEvents = events.filter((e) => {
      const s = (e.summary || "").toLowerCase();
      return s.includes("コンサル") || s.includes("consult") || s.includes("初回");
    });

    // 講師リスト（createdAt昇順）。フォールバック先は先頭講師。
    const instructors = await prisma.instructor.findMany({ orderBy: { createdAt: "asc" } });
    const defaultInstructorId = instructors[0]?.id;

    // マッチング用に、対象期間の初回コンサル予定を一括ロード（TZ端対策で前後1日パディング）
    const DAY = 24 * 60 * 60 * 1000;
    const existingConsults = await prisma.schedule.findMany({
      where: {
        category: "first_consult",
        scheduledAt: { gte: new Date(timeMin.getTime() - DAY), lt: new Date(timeMax.getTime() + DAY) },
      },
    });

    const toCandidate = (s: (typeof existingConsults)[number]): SlotCandidate => ({
      id: s.id,
      instructorId: s.instructorId,
      scheduledAt: s.scheduledAt,
      hasGcalLink: !!s.memo && s.memo.includes("gcal:"),
      status: s.status,
    });

    // このrunで消費済みの枠ID（同日に複数イベントがある場合の取り合いを防ぐ）
    const usedSlotIds = new Set<string>();

    let created = 0; // 事前枠が無く、デフォルト講師(関)に新規作成
    let merged = 0; // 事前に置かれた講師枠へ統合
    let updated = 0; // 既に紐付け済みの予定を最新化
    let duplicatesRemoved = 0; // 統合に伴い削除した重複予定

    for (const event of consultEvents) {
      const scheduledAt = new Date(event.start);
      const endAt = event.end ? new Date(event.end) : null;

      const { names, emails } = parseApplicants(event.description);
      const participantName = names.length > 0 ? names.join("、") : null;
      const url = event.location || null;
      const memoText = buildConsultMemo(event.id, url, names, emails);

      // このイベントに既に紐付いている予定（あれば）
      const linked = existingConsults.find(
        (s) => !!s.memo && s.memo.includes(`gcal:${event.id}`)
      );

      // 事前に講師へ置かれた空きコンサル枠を探す（同じ日・最も近い時刻）
      const slot = pickSlotForEvent(scheduledAt, existingConsults.map(toCandidate), usedSlotIds);

      if (slot) {
        // Case A: 事前枠へ統合。枠の講師は維持し、申込者情報・時刻・gcalリンクを書き込む。
        usedSlotIds.add(slot.id);
        await prisma.schedule.update({
          where: { id: slot.id },
          data: {
            participantName: participantName ?? undefined,
            scheduledAt,
            endAt,
            memo: memoText,
            status: "scheduled",
          },
        });
        // 以前のデフォルト(関)への重複同期が残っていれば削除して統合
        if (linked && linked.id !== slot.id) {
          await prisma.schedule.delete({ where: { id: linked.id } });
          duplicatesRemoved++;
        }
        merged++;
      } else if (linked) {
        // Case B: 事前枠は無いが既に紐付け済み → 参加者名・メモを最新化（講師・時刻は維持）
        await prisma.schedule.update({
          where: { id: linked.id },
          data: {
            participantName: participantName ?? linked.participantName,
            memo: memoText,
          },
        });
        updated++;
      } else {
        // Case C: 事前枠も紐付けも無い → デフォルト講師(関)に新規作成（後で手動移動可）
        if (!defaultInstructorId) continue;
        await prisma.schedule.create({
          data: {
            category: "first_consult",
            title: event.summary,
            instructorId: defaultInstructorId,
            participantName,
            scheduledAt,
            endAt,
            memo: memoText,
            status: "scheduled",
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      ok: true,
      total: events.length,
      consultEvents: consultEvents.length,
      created,
      merged,
      updated,
      duplicatesRemoved,
      // 後方互換（旧UI）: 追加以外はまとめて skipped 扱い
      skipped: merged + updated,
    });
  } catch (e) {
    console.error("Calendar sync error:", e);
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "同期エラー",
    }, { status: 500 });
  }
}
