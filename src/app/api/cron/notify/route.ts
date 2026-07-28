import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineNotification } from "@/lib/line";
import { getCategoryInfo } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cronからの呼び出しを検証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // CRON_SECRET未設定の場合はスキップ（開発用）
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 今日の日付範囲 (JSTベースで計算)
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const nowJST = new Date(now.getTime() + jstOffset);

  // JSTにおける今日の始まり (00:00 JST) をUTCとしてDateオブジェクトにする (-9時間でUTCに戻す)
  const todayStart = new Date(Date.UTC(nowJST.getUTCFullYear(), nowJST.getUTCMonth(), nowJST.getUTCDate(), -9, 0, 0));
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // ---------------------------------------------------------------
  // 【SQLite文字列比較バグの回避策】(today-schedule と同方式)
  // DB保存形式("+00:00")と Prisma変換("Z")のレキシコ比較で境界レコードが
  // 漏れるため、前後1日マージンで広めに取得し JS の getTime() で厳密フィルタ。
  // SharedEvent.date は常に 00:00 JST = 境界値なので特に重要。
  // ---------------------------------------------------------------
  const marginMs = 24 * 60 * 60 * 1000;
  const queryStart = new Date(todayStart.getTime() - marginMs);
  const queryEnd = new Date(todayEnd.getTime() + marginMs);

  // 今日の個人予定を取得（statusがscheduledのもののみ）
  const schedulesRaw = await prisma.schedule.findMany({
    where: {
      scheduledAt: { gte: queryStart, lt: queryEnd },
      status: "scheduled",
    },
    include: { instructor: true },
    orderBy: { scheduledAt: "asc" },
  });
  const schedules = schedulesRaw.filter((s) => {
    const t = new Date(s.scheduledAt).getTime();
    return t >= todayStart.getTime() && t < todayEnd.getTime();
  });

  // 今日の全員参加予定を取得
  const sharedEventsRaw = await prisma.sharedEvent.findMany({
    where: { date: { gte: queryStart, lt: queryEnd } },
    orderBy: { startTime: "asc" },
  });
  const sharedEvents = sharedEventsRaw.filter((e) => {
    const d = new Date(e.date).getTime();
    return d >= todayStart.getTime() && d < todayEnd.getTime();
  });

  if (schedules.length === 0 && sharedEvents.length === 0) {
    return NextResponse.json({ ok: true, message: "今日の予定はありません", sent: false });
  }

  // メッセージ組み立て
  const dateStr = todayStart.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });

  let message = `おはようございます！\n📅 ${dateStr} の予定\n━━━━━━━━━━━━━━\n`;

  // 全員参加予定（先頭セクション）
  if (sharedEvents.length > 0) {
    message += `\n📢 全員参加\n`;
    for (const e of sharedEvents) {
      const time = e.startTime ? (e.endTime ? ` (${e.startTime}〜${e.endTime})` : ` (${e.startTime})`) : "";
      message += `  ${e.title}${time}\n`;
    }
  }

  // 講師ごとにグループ化（既存踏襲）
  const byInstructor: Record<string, { name: string; items: string[] }> = {};
  for (const s of schedules) {
    if (!byInstructor[s.instructorId]) {
      byInstructor[s.instructorId] = { name: s.instructor.name, items: [] };
    }
    const cat = getCategoryInfo(s.category);
    const displayLabel = s.category === "custom" && s.title ? s.title : cat.label;
    const startStr = new Date(s.scheduledAt).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
    const endStr = s.endAt ? new Date(s.endAt).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }) : "";
    const time = s.endAt ? `${startStr}〜${endStr}` : startStr;
    byInstructor[s.instructorId].items.push(
      `  ${displayLabel}${time ? ` (${time})` : ""}${s.participantName ? ` / ${s.participantName}` : ""}`
    );
  }

  for (const [, data] of Object.entries(byInstructor)) {
    message += `\n👤 ${data.name}\n`;
    message += data.items.join("\n") + "\n";
  }

  const totalCount = schedules.length + sharedEvents.length;
  message += `\n━━━━━━━━━━━━━━\n合計 ${totalCount}件`;
  message += `\n\n詳細はこちら\nhttps://app-xi-three-29.vercel.app/`;

  const ok = await sendLineNotification(message);

  return NextResponse.json({ ok, sent: true, count: totalCount });
}
