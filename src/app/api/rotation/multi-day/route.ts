import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getCategoryInfo } from "@/lib/categories";
import { jstDateTime, nextDateKeyForWeekday, todayJstDateKey } from "@/lib/jst-date";

type DayInput = {
  enabled?: boolean;
  startTime?: string;
  endTime?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { category, days, startDate, weeksToGenerate, defaultInstructorId } = await req.json();
    const dayInputs: DayInput[] = Array.isArray(days) ? days : [];
    const enabledDays = dayInputs.filter((day) => day.enabled);

    if (!category || enabledDays.length === 0) {
      return NextResponse.json({ ok: false, error: "曜日を1つ以上選択してください" }, { status: 400 });
    }

    // 既存のこのcategoryの設定を全削除
    await prisma.rotationSetting.deleteMany({ where: { category } });

    // 有効な曜日だけ保存
    for (let dow = 0; dow < 7; dow++) {
      const day = dayInputs[dow];
      if (!day || !day.enabled) continue;
      await prisma.rotationSetting.create({
        data: {
          category,
          dayOfWeek: dow,
          startTime: day.startTime || "",
          endTime: day.endTime || "",
          instructorOrder: "",
          startDate: startDate || todayJstDateKey(),
          weeksToGenerate: weeksToGenerate || 12,
        },
      });
    }

    // 設定保存後に予定を自動再生成
    if (defaultInstructorId) {
      const settings = await prisma.rotationSetting.findMany({ where: { category } });
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
    }

    return NextResponse.json({ ok: true, count: 0 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "不明なエラー" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { category } = await req.json();
    // 設定を削除
    await prisma.rotationSetting.deleteMany({ where: { category } });
    // 生成済み予定も削除
    await prisma.schedule.deleteMany({
      where: { category, recurrenceGroupId: { not: null } },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "" }, { status: 500 });
  }
}
