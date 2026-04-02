import { prisma } from "@/lib/prisma";
import { ConsultFlowClient } from "./consult-flow-client";

export const dynamic = "force-dynamic";

export default async function ConsultFlowPage() {
  // 今日のJST日付範囲
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const nowJST = new Date(now.getTime() + jstOffset);
  const todayStart = new Date(Date.UTC(nowJST.getUTCFullYear(), nowJST.getUTCMonth(), nowJST.getUTCDate(), -9, 0, 0));
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // 今日の初回コンサル
  const todayConsult = await prisma.schedule.findFirst({
    where: {
      category: "first_consult",
      scheduledAt: { gte: todayStart, lt: todayEnd },
      status: "scheduled",
    },
    include: { instructor: true },
    orderBy: { scheduledAt: "asc" },
  });

  // 今日のがなければ直近の未来の初回コンサル
  const nextConsult = todayConsult || await prisma.schedule.findFirst({
    where: {
      category: "first_consult",
      scheduledAt: { gte: now },
      status: "scheduled",
    },
    include: { instructor: true },
    orderBy: { scheduledAt: "asc" },
  });

  // Zoom URLをメモから抽出
  let zoomUrl = "";
  let consultTime = "";
  let consultDate = "";
  if (nextConsult) {
    const memo = nextConsult.memo || "";
    const urlMatch = memo.match(/(https?:\/\/[^\s]*zoom[^\s]*)/i);
    if (urlMatch) zoomUrl = urlMatch[1];

    const d = new Date(nextConsult.scheduledAt);
    consultTime = d.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
    consultDate = d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short" });
  }

  return (
    <ConsultFlowClient
      zoomUrl={zoomUrl}
      consultTime={consultTime}
      consultDate={consultDate}
      isToday={!!todayConsult}
      instructorName={nextConsult?.instructor?.name || ""}
    />
  );
}
