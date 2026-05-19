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

  // 今日の個人シフトを取得（statusがscheduledのもののみ）
  const schedules = await prisma.schedule.findMany({
    where: {
      scheduledAt: { gte: todayStart, lt: todayEnd },
      status: "scheduled",
    },
    include: { instructor: true },
    orderBy: { scheduledAt: "asc" },
  });

  // 今日の全員参加の予定を取得
  const sharedEvents = await prisma.sharedEvent.findMany({
    where: {
      date: { gte: todayStart, lt: todayEnd },
    },
    orderBy: { startTime: "asc" },
  });

  const totalCount = schedules.length + sharedEvents.length;

  // 予定0件の場合
  if (totalCount === 0) {
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

  // 個人シフトと全員予定を統一形式にマージ
  type UnifiedItem = {
    kind: "instructor" | "shared";
    sortMinutes: number;
    labelLine: string;
    detailLine: string;
  };

  const items: UnifiedItem[] = [];

  for (const s of schedules) {
    const cat = getCategoryInfo(s.category);
    const scheduledDate = new Date(s.scheduledAt);
    const startStr = scheduledDate.toLocaleTimeString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // JST時刻から分換算（ソート用）
    const jstTime = new Date(scheduledDate.getTime() + jstOffset);
    const sortMinutes = jstTime.getUTCHours() * 60 + jstTime.getUTCMinutes();

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

    items.push({
      kind: "instructor",
      sortMinutes,
      labelLine: `👤 ${s.instructor.name}`,
      detailLine: `  ${cat.label} ${timeStr}`,
    });
  }

  for (const e of sharedEvents) {
    let timeStr = "";
    let sortMinutes = 99999;

    if (e.startTime) {
      const [h, m] = e.startTime.split(":").map(Number);
      sortMinutes = h * 60 + m;
      if (e.endTime) {
        timeStr = ` (${e.startTime}〜${e.endTime})`;
      } else {
        timeStr = ` (${e.startTime})`;
      }
    }

    items.push({
      kind: "shared",
      sortMinutes,
      labelLine: "👥 全員",
      detailLine: `  ${e.title}${timeStr}`,
    });
  }

  // sortMinutes昇順、同値なら個人シフト→全員予定の順
  items.sort((a, b) => {
    if (a.sortMinutes !== b.sortMinutes) return a.sortMinutes - b.sortMinutes;
    return a.kind === "instructor" ? -1 : 1;
  });

  // メッセージ組み立て
  const lines: string[] = [
    "おはようございます！",
    `📅 ${dateLabel} の予定`,
    "━━━━━━━━━━━━━━",
  ];

  for (const item of items) {
    lines.push(item.labelLine);
    lines.push(item.detailLine);
  }

  lines.push("━━━━━━━━━━━━━━");
  lines.push(`合計 ${totalCount}件`);
  lines.push("詳細はこちら");
  lines.push("https://app-xi-three-29.vercel.app/");

  const text = lines.join("\n");

  return new NextResponse(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
