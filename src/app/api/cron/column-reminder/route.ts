import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineNotification } from "@/lib/line";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // JSTで今日の0:00〜24:00の範囲をUTC Dateに変換
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const nowJST = new Date(now.getTime() + jstOffset);
  const todayStart = new Date(
    Date.UTC(nowJST.getUTCFullYear(), nowJST.getUTCMonth(), nowJST.getUTCDate(), -9, 0, 0),
  );
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // SQLite/Turso文字列比較問題回避のためマージン付きで取得→JS側で厳密フィルタ
  const marginMs = 24 * 60 * 60 * 1000;
  const queryStart = new Date(todayStart.getTime() - marginMs);
  const queryEnd = new Date(todayEnd.getTime() + marginMs);

  const logsRaw = await prisma.columnPostLog.findMany({
    where: { postedAt: { gte: queryStart, lt: queryEnd } },
  });
  const todaysLogs = logsRaw.filter((l) => {
    const t = new Date(l.postedAt).getTime();
    return t >= todayStart.getTime() && t < todayEnd.getTime();
  });

  if (todaysLogs.length > 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "今日はコラム投稿済み" });
  }

  const message = [
    "📝 コラムの投稿、忘れてないですか？",
    "",
    "投稿が完了したら「コラム投稿しました」と返信してください。",
    "詳細はこちら",
    "https://app-xi-three-29.vercel.app/",
  ].join("\n");

  const ok = await sendLineNotification(message);
  return NextResponse.json({ ok, sent: true });
}
