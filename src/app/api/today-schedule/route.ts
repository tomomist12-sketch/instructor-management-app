import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCategoryInfo } from "@/lib/categories";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export async function GET(req: NextRequest) {
  // 簡易トークン認証
  const token = req.nextUrl.searchParams.get("token");
  const expectedToken = process.env.TODAY_SCHEDULE_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 今日の日付範囲 (JSTベースで計算)
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const nowJST = new Date(now.getTime() + jstOffset);

  const year = nowJST.getUTCFullYear();
  const month = nowJST.getUTCMonth();
  const date = nowJST.getUTCDate();
  const dayOfWeek = WEEKDAYS[new Date(Date.UTC(year, month, date)).getUTCDay()];

  // JSTにおける今日の始まり (00:00 JST = 前日15:00 UTC)
  const todayStart = new Date(Date.UTC(year, month, date, -9, 0, 0));
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const dateLabel = `${year}年${month + 1}月${date}日(${dayOfWeek})`;

  // 今日の予定を取得（statusがscheduledのもののみ）
  const schedules = await prisma.schedule.findMany({
    where: {
      scheduledAt: { gte: todayStart, lt: todayEnd },
      status: "scheduled",
    },
    include: { instructor: true },
    orderBy: { scheduledAt: "asc" },
  });

  // 予定0件の場合
  if (schedules.length === 0) {
    const text = [
      "おはようございます！",
      `📅 ${dateLabel} の予定`,
      "━━━━━━━━━━━━━━",
      "本日の予定はありません",
      "━━━━━━━━━━━━━━",
      "詳細はこちら",
      "https://app-xi-three-29.vercel.app/",
    ].join("\n");

    return new NextResponse(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 講師ごとにグループ化
  const byInstructor: Record<
    string,
    { name: string; items: string[] }
  > = {};

  for (const s of schedules) {
    if (!byInstructor[s.instructorId]) {
      byInstructor[s.instructorId] = { name: s.instructor.name, items: [] };
    }

    const cat = getCategoryInfo(s.category);
    const startStr = new Date(s.scheduledAt).toLocaleTimeString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    let timeStr: string;
    if (s.endAt) {
      const endStr = new Date(s.endAt).toLocaleTimeString("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      timeStr = `(${startStr}〜${endStr})`;
    } else {
      timeStr = `(${startStr})`;
    }

    byInstructor[s.instructorId].items.push(`  ${cat.label} ${timeStr}`);
  }

  // メッセージ組み立て
  const lines: string[] = [
    "おはようございます！",
    `📅 ${dateLabel} の予定`,
    "━━━━━━━━━━━━━━",
  ];

  for (const data of Object.values(byInstructor)) {
    lines.push(`👤 ${data.name}`);
    for (const item of data.items) {
      lines.push(item);
    }
  }

  lines.push("━━━━━━━━━━━━━━");
  lines.push(`合計 ${schedules.length}件`);
  lines.push("詳細はこちら");
  lines.push("https://app-xi-three-29.vercel.app/");

  const text = lines.join("\n");

  return new NextResponse(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
