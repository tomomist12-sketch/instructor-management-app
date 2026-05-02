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

  // 今日の初回コンサルを全件取得（参加人数・名前表示用）
  const todayConsults = await prisma.schedule.findMany({
    where: {
      category: "first_consult",
      scheduledAt: { gte: todayStart, lt: todayEnd },
      status: "scheduled",
    },
    include: { instructor: true },
    orderBy: { scheduledAt: "asc" },
  });

  const todayConsult = todayConsults[0] || null;

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

  // 参加者情報（今日のコンサル全件から、「、」区切りの名前を分割）
  const participants = todayConsults.flatMap((c) => {
    const raw = c.participantName || "";
    const names = raw.split(/[、,]/).map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return [{ name: "", instructorName: c.instructor.name }];
    return names.map((name) => ({ name, instructorName: c.instructor.name }));
  });

  // コンサル一覧用データ
  const allConsults = await prisma.schedule.findMany({
    where: { category: "first_consult" },
    include: { instructor: true },
    orderBy: { scheduledAt: "asc" },
  });
  const instructors = await prisma.instructor.findMany({ orderBy: { createdAt: "asc" } });

  const upcomingConsults = allConsults
    .filter((c) => c.status === "scheduled" && new Date(c.scheduledAt) >= new Date())
    .map((c) => ({
      id: c.id,
      scheduledAt: c.scheduledAt.toISOString(),
      endAt: c.endAt?.toISOString() || null,
      instructorName: c.instructor.name,
      participantName: c.participantName,
      memo: c.memo,
    }));

  const pastConsults = allConsults
    .filter((c) => c.status !== "scheduled" || new Date(c.scheduledAt) < new Date())
    .map((c) => ({
      id: c.id,
      scheduledAt: c.scheduledAt.toISOString(),
      instructorName: c.instructor.name,
      participantName: c.participantName,
      status: c.status,
    }));

  return (
    <ConsultFlowClient
      zoomUrl={zoomUrl}
      consultTime={consultTime}
      consultDate={consultDate}
      isToday={todayConsults.length > 0}
      instructorName={nextConsult?.instructor?.name || ""}
      participants={participants}
      upcomingConsults={upcomingConsults}
      pastConsults={pastConsults}
      instructors={instructors.map((i) => ({ id: i.id, name: i.name }))}
    />
  );
}
