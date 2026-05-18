"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createSharedEvent(formData: FormData) {
  const dateStr = formData.get("date") as string;
  const title = formData.get("title") as string;
  const startTime = (formData.get("startTime") as string) || null;
  const endTime = (formData.get("endTime") as string) || null;
  const note = (formData.get("note") as string) || null;
  const createdByName = (formData.get("createdByName") as string) || null;

  if (!dateStr || !title) throw new Error("日付とタイトルは必須です");

  // 日付部分のみ使用（時刻は00:00:00 JST）
  const date = new Date(`${dateStr}T00:00:00+09:00`);

  await prisma.sharedEvent.create({
    data: { date, startTime, endTime, title, note, createdByName },
  });

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
