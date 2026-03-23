import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getCategoryInfo } from "@/lib/categories";

export async function POST(req: NextRequest) {
  try {
    const { category, defaultInstructorId } = await req.json();

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let count = 0;

    for (const setting of settings) {
      const [startH, startM] = setting.startTime ? setting.startTime.split(":").map(Number) : [10, 0];
      const [endH, endM] = setting.endTime ? setting.endTime.split(":").map(Number) : [0, 0];

      for (let week = 0; week < setting.weeksToGenerate; week++) {
        // 今週の該当曜日を見つける
        const diff = (setting.dayOfWeek - today.getDay() + 7) % 7;
        const date = new Date(today);
        date.setDate(today.getDate() + diff + week * 7);

        if (date < today) continue;

        const scheduledAt = new Date(date);
        scheduledAt.setHours(startH, startM, 0, 0);

        let endAt: Date | null = null;
        if (setting.endTime && setting.endTime !== "") {
          endAt = new Date(date);
          endAt.setHours(endH, endM, 0, 0);
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
