"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createInstructor(name: string) {
  await prisma.instructor.create({ data: { name } });
  revalidatePath("/instructors");
  revalidatePath("/");
}

export async function updateInstructor(id: string, name: string) {
  await prisma.instructor.update({ where: { id }, data: { name } });
  revalidatePath("/instructors");
  revalidatePath("/");
}

export async function deleteInstructor(id: string) {
  await prisma.schedule.deleteMany({ where: { instructorId: id } });
  await prisma.shift.deleteMany({ where: { instructorId: id } });
  await prisma.instructor.delete({ where: { id } });
  revalidatePath("/instructors");
  revalidatePath("/");
}
