"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { getCategoryInfo } from "@/lib/categories";
import { jstDateTime, nextDateKeyForWeekday, todayJstDateKey } from "@/lib/jst-date";

// ライン返信: 曜日ごとの固定担当を保存（保存後に自動で予定を再生成）
export async function saveLineReplySettings(settings: { dayOfWeek: number; instructorId: string }[], weeksToGenerate: number = 12) {
  const validSettings = settings.filter((setting) => setting.instructorId);

  // 既存のline_reply設定を全削除
  await prisma.rotationSetting.deleteMany({ where: { category: "line_reply" } });

  for (const s of validSettings) {
    await prisma.rotationSetting.create({
      data: {
        category: "line_reply",
        dayOfWeek: s.dayOfWeek,
        startTime: "",
        endTime: "",
        instructorOrder: s.instructorId,
        startDate: todayJstDateKey(),
        weeksToGenerate,
      },
    });
  }

  if (validSettings.length === 0) {
    await prisma.schedule.deleteMany({
      where: { recurrenceGroupId: { startsWith: "linereply_" } },
    });
    revalidatePath("/rotation");
    revalidatePath("/");
    return { count: 0 };
  }

  // 設定保存後に予定を自動再生成
  const result = await generateLineReplySchedules(weeksToGenerate);
  revalidatePath("/rotation");
  return result;
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

  const today = todayJstDateKey();
  let count = 0;

  for (let week = 0; week < weeksToGenerate; week++) {
    for (const s of settings) {
      const dateKey = nextDateKeyForWeekday(today, s.dayOfWeek, week);

      await prisma.schedule.create({
        data: {
          category: "line_reply",
          title: "ライン返信",
          instructorId: s.instructorOrder,
          scheduledAt: jstDateTime(dateKey),
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

// 初回コンサル: 週替わりローテーション（保存後に自動で予定を再生成）
export async function saveRotationSetting(data: {
  id?: string;
  category: string;
  daysOfWeek: number[];
  rotationMode: "continuous" | "perDay";
  startTime: string;
  endTime: string;
  instructorOrder: string[];
  startDate: string;
  weeksToGenerate: number;
}) {
  if (data.daysOfWeek.length === 0) {
    throw new Error("曜日を1つ以上選択してください");
  }
  const orderStr = data.instructorOrder.join(",");
  const sortedDays = [...new Set(data.daysOfWeek)].sort((a, b) => a - b);
  const [primaryDay, ...extra] = sortedDays;
  const extraStr = extra.length > 0 ? extra.join(",") : null;

  let settingId: string;
  if (data.id) {
    await prisma.rotationSetting.update({
      where: { id: data.id },
      data: {
        category: data.category,
        dayOfWeek: primaryDay,
        extraDaysOfWeek: extraStr,
        rotationMode: data.rotationMode,
        startTime: data.startTime,
        endTime: data.endTime,
        instructorOrder: orderStr,
        startDate: data.startDate,
        weeksToGenerate: data.weeksToGenerate,
      },
    });
    settingId = data.id;
  } else {
    const created = await prisma.rotationSetting.create({
      data: {
        category: data.category,
        dayOfWeek: primaryDay,
        extraDaysOfWeek: extraStr,
        rotationMode: data.rotationMode,
        startTime: data.startTime,
        endTime: data.endTime,
        instructorOrder: orderStr,
        startDate: data.startDate,
        weeksToGenerate: data.weeksToGenerate,
      },
    });
    settingId = created.id;
  }

  // 設定保存後に予定を自動再生成
  const result = await generateRotationSchedules(settingId);
  revalidatePath("/rotation");
  return result;
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

  const entries = setting.instructorOrder.split(",").filter(Boolean);
  if (entries.length === 0) throw new Error("講師が設定されていません");

  // "id|startTime|endTime" or "id:startTime-endTime"(旧) or "id" 形式をパース
  const parsed = entries.map((entry) => {
    const parts = entry.split("|");
    if (parts.length >= 3) {
      return { instructorId: parts[0], startTime: parts[1], endTime: parts[2] };
    }
    // 旧形式フォールバック（UUID:HH:MM-HH:MM）
    if (entry.length > 36 && entry[36] === ":") {
      const id = entry.substring(0, 36);
      const timePart = entry.substring(37);
      const [s, e] = timePart.split("-");
      if (s && e) return { instructorId: id, startTime: s, endTime: e };
    }
    return { instructorId: entry, startTime: setting.startTime, endTime: setting.endTime };
  });

  const groupId = randomUUID();

  await prisma.schedule.deleteMany({
    where: { recurrenceGroupId: { startsWith: `rotation_${settingId}` } },
  });

  const catInfo = getCategoryInfo(setting.category);
  let count = 0;

  // 主曜日 + 追加曜日をまとめて昇順化（0..6）
  const extras = (setting.extraDaysOfWeek ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const days = [...new Set([setting.dayOfWeek, ...extras])].sort((a, b) => a - b);

  // 各 (week, day) で 1 件作成。担当インデックスは rotationMode に応じて算出。
  for (let week = 0; week < setting.weeksToGenerate; week++) {
    for (let di = 0; di < days.length; di++) {
      const dow = days[di];
      const dateStr = nextDateKeyForWeekday(setting.startDate, dow, week);
      const slotIndex =
        setting.rotationMode === "perDay"
          ? week % parsed.length
          : (week * days.length + di) % parsed.length;
      const entry = parsed[slotIndex];
      const hasTime = entry.startTime && entry.startTime !== "" && entry.startTime !== "00:00";
      const sTime = hasTime ? entry.startTime : "00:00";
      const eTime = entry.endTime && entry.endTime !== "00:00" ? entry.endTime : "";

      const scheduledAt = jstDateTime(dateStr, sTime);

      let endAt: Date | null = null;
      if (eTime) {
        endAt = jstDateTime(dateStr, eTime);
      }

      await prisma.schedule.create({
        data: {
          category: setting.category,
          title: catInfo.label,
          instructorId: entry.instructorId,
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
  }

  revalidatePath("/rotation");
  revalidatePath("/consults");
  revalidatePath("/");
  return { count };
}

// ライブトーク・勉強会: 固定曜日で予定を生成（保存後に自動で予定を再生成）
export async function saveFixedDaySetting(data: {
  id?: string;
  category: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  startDate: string;
  weeksToGenerate: number;
  defaultInstructorId: string;
}) {
  let settingId: string;
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
    settingId = data.id;
  } else {
    const created = await prisma.rotationSetting.create({
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
    settingId = created.id;
  }

  // 設定保存後に予定を自動再生成
  const result = await generateFixedDaySchedules(settingId, data.defaultInstructorId);
  revalidatePath("/rotation");
  return result;
}

export async function generateFixedDaySchedules(settingId: string, defaultInstructorId: string) {
  const setting = await prisma.rotationSetting.findUnique({ where: { id: settingId } });
  if (!setting) throw new Error("設定が見つかりません");

  const groupId = randomUUID();

  await prisma.schedule.deleteMany({
    where: { recurrenceGroupId: { startsWith: `fixedday_${settingId}` } },
  });

  const catInfo = getCategoryInfo(setting.category);
  let count = 0;

  for (let week = 0; week < setting.weeksToGenerate; week++) {
    const dateKey = nextDateKeyForWeekday(setting.startDate, setting.dayOfWeek, week);
    const scheduledAt = jstDateTime(dateKey, setting.startTime || "10:00");

    let endAt: Date | null = null;
    if (setting.endTime) {
      endAt = jstDateTime(dateKey, setting.endTime);
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
