import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCalendarEvents } from "@/lib/google-calendar";

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

    // 講師リストを取得（マッチング用）
    const instructors = await prisma.instructor.findMany();

    let created = 0;
    let skipped = 0;

    for (const event of consultEvents) {
      // 既にGoogleカレンダーIDで同期済みかチェック
      const existing = await prisma.schedule.findFirst({
        where: { memo: { contains: `gcal:${event.id}` } },
      });

      if (existing) {
        // 既存予定の参加者名・メモを更新（説明欄が後から変わった場合に対応）
        const desc = event.description || "";
        const updNames: string[] = [];
        const updEmails: string[] = [];
        for (const line of desc.split("\n")) {
          const nm = line.match(/お名前[：:]\s*(.+)/);
          if (nm) updNames.push(nm[1].trim());
          const em = line.match(/メール[：:]\s*(\S+)/);
          if (em) updEmails.push(em[1].trim());
        }
        if (updNames.length > 0 && !existing.participantName) {
          let updMemo = `gcal:${event.id}\n【申込者】`;
          for (let i = 0; i < updNames.length; i++) {
            updMemo += `\n${updNames[i]}`;
            if (updEmails[i]) updMemo += ` (${updEmails[i]})`;
          }
          await prisma.schedule.update({
            where: { id: existing.id },
            data: { participantName: updNames.join("、"), memo: updMemo },
          });
        }
        skipped++;
        continue;
      }

      // イベントの説明や担当者名から講師をマッチング
      let instructorId = instructors[0]?.id; // デフォルト: 最初の講師
      for (const inst of instructors) {
        if (
          event.summary.includes(inst.name) ||
          (event.description && event.description.includes(inst.name))
        ) {
          instructorId = inst.id;
          break;
        }
      }

      if (!instructorId) continue;

      // 説明欄から申込者情報を抽出
      const desc = event.description || "";
      const names: string[] = [];
      const emails: string[] = [];
      for (const line of desc.split("\n")) {
        const nameMatch = line.match(/お名前[：:]\s*(.+)/);
        if (nameMatch) names.push(nameMatch[1].trim());
        const emailMatch = line.match(/メール[：:]\s*(\S+)/);
        if (emailMatch) emails.push(emailMatch[1].trim());
      }
      const participantName = names.length > 0 ? names.join("、") : null;

      // 申込者情報をメモに整形
      let memoText = `gcal:${event.id}`;
      if (names.length > 0) {
        memoText += "\n【申込者】";
        for (let i = 0; i < names.length; i++) {
          memoText += `\n${names[i]}`;
          if (emails[i]) memoText += ` (${emails[i]})`;
        }
      }

      const scheduledAt = new Date(event.start);
      const endAt = event.end ? new Date(event.end) : null;

      await prisma.schedule.create({
        data: {
          category: "first_consult",
          title: event.summary,
          instructorId,
          participantName,
          scheduledAt,
          endAt,
          memo: memoText,
          status: "scheduled",
        },
      });
      created++;
    }

    return NextResponse.json({
      ok: true,
      total: events.length,
      consultEvents: consultEvents.length,
      created,
      skipped,
    });
  } catch (e) {
    console.error("Calendar sync error:", e);
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "同期エラー",
    }, { status: 500 });
  }
}
