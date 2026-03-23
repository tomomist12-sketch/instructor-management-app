import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { category, days, startDate, weeksToGenerate } = await req.json();

    // 既存のこのcategoryの設定を全削除
    await prisma.rotationSetting.deleteMany({ where: { category } });

    // 有効な曜日だけ保存
    for (let dow = 0; dow < 7; dow++) {
      const day = days[dow];
      if (!day || !day.enabled) continue;
      await prisma.rotationSetting.create({
        data: {
          category,
          dayOfWeek: dow,
          startTime: day.startTime || "",
          endTime: day.endTime || "",
          instructorOrder: "",
          startDate: startDate || new Date().toISOString().split("T")[0],
          weeksToGenerate: weeksToGenerate || 12,
        },
      });
    }

    return NextResponse.json({ ok: true });
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
