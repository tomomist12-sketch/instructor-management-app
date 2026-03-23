"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { getCategoryInfo } from "@/lib/categories";

// ライン返信: 曜日ごとの固定担当を保存
export async function saveLineReplySettings(settings: { dayOfWeek: number; instructorId: string }[]) {
  // 既存のline_reply設定を全削除
  await prisma.rotationSetting.deleteMany({ where: { category: "line_reply" } });

  for (const s of settings) {
    if (!s.instructorId) continue;
    await prisma.rotationSetting.create({
      data: {
        category: "line_reply",
        dayOfWeek: s.dayOfWeek,
        startTime: "",
        endTime: "",
        instructorOrder: s.instructorId,
        startDate: new Date().toISOString().split("T")[0],
        weeksToGenerate: 12,
      },
    });
  }
  revalidatePath("/rotation");
}

// ライン返信の予定を自動生成
export async function generateLineReplySchedules(weeksToGenerate: number) {
  const settings = await prisma.rotationSetting.findMany({ where: { category: "line_reply" } });
  if (settings.length === 0) throw new Error("ライン返信の曜日設定がありません");

  const groupId = randomUUID();
  // 既存の自動生成分を削除
  await prisma.schedule.deleteMany({
    where: { recurrenceGroupId: { startsWith: "linereply_" } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;

  for (let week = 0; week < weeksToGenerate; week++) {
    for (const s of settings) {
      const date = new Date(today);
      // 今週の該当曜日を見つける
      const diff = (s.dayOfWeek - today.getDay() + 7) % 7;
      date.setDate(today.getDate() + diff + week * 7);

      if (date < today) continue; // 過去はスキップ

      await prisma.schedule.create({
        data: {
          category: "line_reply",
          title: "ライン返信",
          instructorId: s.instructorOrder,
          scheduledAt: date,
          status: "scheduled",
          isRecurring: true,
          recurrenceRule: "weekly",
          recurrenceGroupId: `linereply_${groupId}`,
        },
      });
      count++;
    }
  }

  revalidatePath("/rotation");
  revalidatePath("/");
  return { count };
}

// 初回コンサル: 週替わりローテーション
export async function saveRotationSetting(data: {
  id?: string;
  category: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  instructorOrder: string[];
  startDate: string;
  weeksToGenerate: number;
}) {
  const orderStr = data.instructorOrder.join(",");

  if (data.id) {
    await prisma.rotationSetting.update({
      where: { id: data.id },
      data: {
        category: data.category,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        instructorOrder: orderStr,
        startDate: data.startDate,
        weeksToGenerate: data.weeksToGenerate,
      },
    });
  } else {
    await prisma.rotationSetting.create({
      data: {
        category: data.category,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        instructorOrder: orderStr,
        startDate: data.startDate,
        weeksToGenerate: data.weeksToGenerate,
      },
    });
  }
  revalidatePath("/rotation");
}

export async function deleteRotationSetting(id: string) {
  await prisma.schedule.deleteMany({
    where: { recurrenceGroupId: { startsWith: `rotation_${id}` } },
  });
  await prisma.rotationSetting.delete({ where: { id } });
  revalidatePath("/rotation");
  revalidatePath("/");
}

export async function generateRotationSchedules(settingId: string) {
  const setting = await prisma.rotationSetting.findUnique({ where: { id: settingId } });
  if (!setting) throw new Error("設定が見つかりません");

  const instructorIds = setting.instructorOrder.split(",").filter(Boolean);
  if (instructorIds.length === 0) throw new Error("講師が設定されていません");

  const startDate = new Date(setting.startDate);
  const groupId = randomUUID();

  let current = new Date(startDate);
  while (current.getDay() !== setting.dayOfWeek) current.setDate(current.getDate() + 1);

  const hasTime = setting.startTime && setting.startTime !== "";
  const [startH, startM] = hasTime ? setting.startTime.split(":").map(Number) : [10, 0];
  const [endH, endM] = setting.endTime ? setting.endTime.split(":").map(Number) : [0, 0];

  await prisma.schedule.deleteMany({
    where: { recurrenceGroupId: { startsWith: `rotation_${settingId}` } },
  });

  const catInfo = getCategoryInfo(setting.category);
  let count = 0;

  for (let week = 0; week < setting.weeksToGenerate; week++) {
    const date = new Date(current);
    date.setDate(current.getDate() + week * 7);

    const instructorId = instructorIds[week % instructorIds.length];
    const scheduledAt = new Date(date);
    scheduledAt.setHours(startH, startM, 0, 0);

    let endAt: Date | null = null;
    if (setting.endTime && setting.endTime !== "") {
      endAt = new Date(date);
      endAt.setHours(endH, endM, 0, 0);
    }

    await prisma.schedule.create({
      data: {
        category: setting.category,
        title: catInfo.label,
        instructorId,
        scheduledAt,
        endAt,
        status: "scheduled",
        isRecurring: true,
        recurrenceRule: "weekly",
        recurrenceGroupId: `rotation_${settingId}_${groupId}`,
      },
    });
    count++;
  }

  revalidatePath("/rotation");
  revalidatePath("/consults");
  revalidatePath("/");
  return { count };
}

// ライブトーク・勉強会: 固定曜日で予定を生成（担当者なし＝手動で後から選択）
export async function saveFixedDaySetting(data: {
  id?: string;
  category: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  startDate: string;
  weeksToGenerate: number;
}) {
  if (data.id) {
    await prisma.rotationSetting.update({
      where: { id: data.id },
      data: {
        category: data.category,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        instructorOrder: "",
        startDate: data.startDate,
        weeksToGenerate: data.weeksToGenerate,
      },
    });
  } else {
    await prisma.rotationSetting.create({
      data: {
        category: data.category,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        instructorOrder: "",
        startDate: data.startDate,
        weeksToGenerate: data.weeksToGenerate,
      },
    });
  }
  revalidatePath("/rotation");
}

export async function generateFixedDaySchedules(settingId: string, defaultInstructorId: string) {
  const setting = await prisma.rotationSetting.findUnique({ where: { id: settingId } });
  if (!setting) throw new Error("設定が見つかりません");

  const startDate = new Date(setting.startDate);
  const groupId = randomUUID();

  let current = new Date(startDate);
  while (current.getDay() !== setting.dayOfWeek) current.setDate(current.getDate() + 1);

  const [startH, startM] = setting.startTime ? setting.startTime.split(":").map(Number) : [10, 0];
  const [endH, endM] = setting.endTime ? setting.endTime.split(":").map(Number) : [0, 0];

  await prisma.schedule.deleteMany({
    where: { recurrenceGroupId: { startsWith: `fixedday_${settingId}` } },
  });

  const catInfo = getCategoryInfo(setting.category);
  let count = 0;

  for (let week = 0; week < setting.weeksToGenerate; week++) {
    const date = new Date(current);
    date.setDate(current.getDate() + week * 7);

    const scheduledAt = new Date(date);
    scheduledAt.setHours(startH, startM, 0, 0);

    let endAt: Date | null = null;
    if (setting.endTime) {
      endAt = new Date(date);
      endAt.setHours(endH, endM, 0, 0);
    }

    await prisma.schedule.create({
      data: {
        category: setting.category,
        title: catInfo.label,
        instructorId: defaultInstructorId, // 仮で1人目を設定（後からシフト表で手動変更可能）
        scheduledAt,
        endAt,
        status: "scheduled",
        isRecurring: true,
        recurrenceRule: "weekly",
        recurrenceGroupId: `fixedday_${settingId}_${groupId}`,
      },
    });
    count++;
  }

  revalidatePath("/rotation");
  revalidatePath("/");
  return { count };
}
