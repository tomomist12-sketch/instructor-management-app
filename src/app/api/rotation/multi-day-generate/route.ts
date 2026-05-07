import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getCategoryInfo } from "@/lib/categories";
import { jstDateTime, nextDateKeyForWeekday } from "@/lib/jst-date";

export async function POST(req: NextRequest) {
  try {
    const { category, defaultInstructorId } = await req.json();
    if (!defaultInstructorId) {
      return NextResponse.json({ ok: false, error: "担当講師が指定されていません" }, { status: 400 });
    }

    const settings = await prisma.rotationSetting.findMany({ where: { category } });
    if (settings.length === 0) {
      return NextResponse.json({ ok: false, error: "設定がありません。先に保存してください。" });
    }

    const groupId = randomUUID();
    const catInfo = getCategoryInfo(category);

    // 既存の自動生成分を削除
    await prisma.schedule.deleteMany({
      where: { category, recurrenceGroupId: { startsWith: `multiday_${category}` } },
    });

    let count = 0;

    for (const setting of settings) {
      for (let week = 0; week < setting.weeksToGenerate; week++) {
        const dateKey = nextDateKeyForWeekday(setting.startDate, setting.dayOfWeek, week);
        const scheduledAt = jstDateTime(dateKey, setting.startTime || "10:00");

        let endAt: Date | null = null;
        if (setting.endTime && setting.endTime !== "") {
          endAt = jstDateTime(dateKey, setting.endTime);
        }

        await prisma.schedule.create({
          data: {
            category,
            title: catInfo.label,
            instructorId: defaultInstructorId,
            scheduledAt,
            endAt,
            status: "scheduled",
            isRecurring: true,
            recurrenceRule: "weekly",
            recurrenceGroupId: `multiday_${category}_${groupId}`,
          },
        });
        count++;
      }
    }

    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "" }, { status: 500 });
  }
}
