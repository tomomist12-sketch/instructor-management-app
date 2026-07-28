"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { jstDateTime } from "@/lib/jst-date";
import { expandRecurrenceDateKeys } from "@/lib/recurrence";

export async function createSharedEvent(formData: FormData) {
  const dateStr = formData.get("date") as string;
  const title = formData.get("title") as string;
  const startTime = (formData.get("startTime") as string) || null;
  const endTime = (formData.get("endTime") as string) || null;
  const note = (formData.get("note") as string) || null;
  const createdByName = (formData.get("createdByName") as string) || null;

  const repeat = (formData.get("repeat") as string) || "none";
  const repeatCount = parseInt((formData.get("repeatCount") as string) || "1", 10);

  if (!dateStr || !title) throw new Error("日付とタイトルは必須です");

  // 繰り返し分の日付キー(00:00 JST固定)を生成
  const isRecurring = repeat !== "none" && repeatCount > 1;
  const dateKeys = expandRecurrenceDateKeys(dateStr, repeat, repeatCount);
  const recurrenceGroupId = isRecurring ? randomUUID() : null;
  const recurrenceRule = isRecurring ? repeat : null;
  const recurrenceEnd = isRecurring ? jstDateTime(dateKeys[dateKeys.length - 1]) : null;

  for (const dk of dateKeys) {
    await prisma.sharedEvent.create({
      data: {
        date: jstDateTime(dk),
        startTime, endTime, title, note, createdByName,
        isRecurring, recurrenceRule, recurrenceEnd, recurrenceGroupId,
      },
    });
  }

  revalidatePath("/");
}

export async function updateSharedEvent(id: string, formData: FormData) {
  const data: Record<string, unknown> = {};

  if (formData.has("date")) {
    const dateStr = formData.get("date") as string;
    data.date = new Date(`${dateStr}T00:00:00+09:00`);
  }
  if (formData.has("title")) data.title = formData.get("title") as string;
  if (formData.has("startTime")) data.startTime = (formData.get("startTime") as string) || null;
  if (formData.has("endTime")) data.endTime = (formData.get("endTime") as string) || null;
  if (formData.has("note")) data.note = (formData.get("note") as string) || null;

  await prisma.sharedEvent.update({ where: { id }, data });
  revalidatePath("/");
}

export async function deleteSharedEvent(id: string) {
  await prisma.sharedEvent.delete({ where: { id } });
  revalidatePath("/");
}

// 同じ繰り返しグループを全て削除
export async function deleteSharedRecurrenceGroup(groupId: string) {
  await prisma.sharedEvent.deleteMany({ where: { recurrenceGroupId: groupId } });
  revalidatePath("/");
}

// この予定以降の同グループを削除（SQLite文字列比較バグ回避のためJS側でフィルタ）
export async function deleteSharedRecurrenceFromDate(groupId: string, fromDateISO: string) {
  const fromTime = new Date(fromDateISO).getTime();
  const rows = await prisma.sharedEvent.findMany({
    where: { recurrenceGroupId: groupId },
    select: { id: true, date: true },
  });
  const ids = rows
    .filter((r) => new Date(r.date).getTime() >= fromTime)
    .map((r) => r.id);
  if (ids.length > 0) {
    await prisma.sharedEvent.deleteMany({ where: { id: { in: ids } } });
  }
  revalidatePath("/");
}
