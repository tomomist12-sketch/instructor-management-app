"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendLineNotification } from "@/lib/line";
import { getCategoryInfo } from "@/lib/categories";
import { randomUUID } from "crypto";

export async function createSchedule(formData: FormData) {
  const category = formData.get("category") as string;
  const title = (formData.get("title") as string) || null;
  const instructorId = formData.get("instructorId") as string;
  const participantName = (formData.get("participantName") as string) || null;
  const scheduledAt = new Date(formData.get("scheduledAt") as string);
  const endAt = formData.get("endAt") ? new Date(formData.get("endAt") as string) : null;
  const memo = (formData.get("memo") as string) || null;

  const repeat = (formData.get("repeat") as string) || "none";
  const repeatCount = parseInt((formData.get("repeatCount") as string) || "1", 10);
  const isRecurring = repeat !== "none" && repeatCount > 1;

  const dates: Date[] = [scheduledAt];
  const endDates: (Date | null)[] = [endAt];
  const duration = endAt ? endAt.getTime() - scheduledAt.getTime() : 0;

  if (isRecurring) {
    for (let i = 1; i < repeatCount; i++) {
      const next = new Date(scheduledAt);
      if (repeat === "daily") next.setDate(next.getDate() + i);
      else if (repeat === "weekly") next.setDate(next.getDate() + i * 7);
      else if (repeat === "biweekly") next.setDate(next.getDate() + i * 14);
      else if (repeat === "monthly") next.setMonth(next.getMonth() + i);
      dates.push(next);
      endDates.push(duration ? new Date(next.getTime() + duration) : null);
    }
  }

  const recurrenceGroupId = isRecurring ? randomUUID() : null;
  const recurrenceEnd = isRecurring ? dates[dates.length - 1] : null;

  for (let i = 0; i < dates.length; i++) {
    await prisma.schedule.create({
      data: {
        category, title, instructorId, participantName,
        scheduledAt: dates[i], endAt: endDates[i], memo,
        status: "scheduled", isRecurring,
        recurrenceRule: isRecurring ? repeat : null,
        recurrenceEnd, recurrenceGroupId,
      },
    });
  }

  revalidatePath("/");
}

export async function updateSchedule(id: string, formData: FormData) {
  const data: Record<string, unknown> = {};
  if (formData.has("category")) data.category = formData.get("category") as string;
  if (formData.has("title")) data.title = (formData.get("title") as string) || null;
  if (formData.has("instructorId")) data.instructorId = formData.get("instructorId") as string;
  if (formData.has("participantName")) data.participantName = (formData.get("participantName") as string) || null;
  if (formData.has("scheduledAt")) data.scheduledAt = new Date(formData.get("scheduledAt") as string);
  if (formData.has("endAt")) data.endAt = formData.get("endAt") ? new Date(formData.get("endAt") as string) : null;
  if (formData.has("status")) data.status = formData.get("status") as string;
  if (formData.has("memo")) data.memo = (formData.get("memo") as string) || null;
  await prisma.schedule.update({ where: { id }, data });
  revalidatePath("/");
}

export async function deleteSchedule(id: string) {
  await prisma.schedule.delete({ where: { id } });
  revalidatePath("/");
}

// 同じ繰り返しグループを全て削除
export async function deleteRecurrenceGroup(groupId: string) {
  await prisma.schedule.deleteMany({ where: { recurrenceGroupId: groupId } });
  revalidatePath("/");
}

// この予定以降の同グループを削除
export async function deleteRecurrenceFromDate(groupId: string, fromDate: string) {
  await prisma.schedule.deleteMany({
    where: {
      recurrenceGroupId: groupId,
      scheduledAt: { gte: new Date(fromDate) },
    },
  });
  revalidatePath("/");
}

// カテゴリ一括削除（例: ライブトークを全部消す等）
export async function deleteByCategory(category: string) {
  const result = await prisma.schedule.deleteMany({ where: { category } });
  revalidatePath("/");
  return { count: result.count };
}

export async function notifySchedule(id: string) {
  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: { instructor: true },
  });
  if (!schedule) throw new Error("予定が見つかりません");

  const catLabel = getCategoryInfo(schedule.category).label;
  const displayTitle = schedule.title || catLabel;
  const dateStr = new Date(schedule.scheduledAt).toLocaleString("ja-JP", {
    month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit",
  });

  const ok = await sendLineNotification(
    `📋 予定のお知らせ\n` +
    `━━━━━━━━━━━━━━\n` +
    `【${catLabel}】${displayTitle}\n` +
    `👤 担当: ${schedule.instructor.name}\n` +
    `🕐 ${dateStr}` +
    (schedule.participantName ? `\n👥 参加者: ${schedule.participantName}` : "") +
    (schedule.memo ? `\n📝 ${schedule.memo}` : "") +
    `\n━━━━━━━━━━━━━━`
  );

  if (!ok) throw new Error("LINE通知の送信に失敗しました。設定を確認してください。");
}
