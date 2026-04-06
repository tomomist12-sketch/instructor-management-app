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

  // 今日の予定を取得
  const schedules = await prisma.schedule.findMany({
    where: {
      scheduledAt: { gte: todayStart, lt: todayEnd },
      status: "scheduled",
    },
    include: { instructor: true },
    orderBy: { scheduledAt: "asc" },
  });

  if (schedules.length === 0) {
    return NextResponse.json({ ok: true, message: "今日の予定はありません", sent: false });
  }

  // 講師ごとにグループ化
  const byInstructor: Record<string, { name: string; items: string[] }> = {};
  for (const s of schedules) {
    if (!byInstructor[s.instructorId]) {
      byInstructor[s.instructorId] = { name: s.instructor.name, items: [] };
    }
    const cat = getCategoryInfo(s.category);
    const startStr = new Date(s.scheduledAt).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
    const endStr = s.endAt ? new Date(s.endAt).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }) : "";
    const time = s.endAt ? `${startStr}〜${endStr}` : startStr;
    byInstructor[s.instructorId].items.push(
      `  ${cat.label}${time ? ` (${time})` : ""}${s.participantName ? ` / ${s.participantName}` : ""}`
    );
  }

  // メッセージ組み立て
  const dateStr = todayStart.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });

  let message = `おはようございます！\n📅 ${dateStr} の予定\n━━━━━━━━━━━━━━\n`;

  for (const [, data] of Object.entries(byInstructor)) {
    message += `\n👤 ${data.name}\n`;
    message += data.items.join("\n") + "\n";
  }

  message += `\n━━━━━━━━━━━━━━\n合計 ${schedules.length}件`;
  message += `\n\n詳細はこちら\nhttps://app-xi-three-29.vercel.app/`;

  const ok = await sendLineNotification(message);

  return NextResponse.json({ ok, sent: true, count: schedules.length });
}
