import { prisma } from "@/lib/prisma";
import { ShiftGrid } from "./shift-grid";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const instructors = await prisma.instructor.findMany({ orderBy: { createdAt: "asc" } });
  const schedules = await prisma.schedule.findMany({
    include: { instructor: true },
    orderBy: { scheduledAt: "asc" },
  });
  const sharedEvents = await prisma.sharedEvent.findMany({
    orderBy: { date: "asc" },
  });

  const serialized = schedules.map((s) => ({
    id: s.id,
    category: s.category,
    title: s.title,
    instructorId: s.instructorId,
    participantName: s.participantName,
    scheduledAt: s.scheduledAt.toISOString(),
    endAt: s.endAt?.toISOString() || null,
    memo: s.memo,
    status: s.status,
    isRecurring: s.isRecurring,
    recurrenceRule: s.recurrenceRule,
    recurrenceGroupId: s.recurrenceGroupId,
    instructorName: s.instructor.name,
  }));

  const serializedSharedEvents = sharedEvents.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    startTime: e.startTime,
    endTime: e.endTime,
    title: e.title,
    note: e.note,
    createdByName: e.createdByName,
    isRecurring: e.isRecurring,
    recurrenceGroupId: e.recurrenceGroupId,
  }));

  return (
    <ShiftGrid
      instructors={instructors.map((i) => ({ id: i.id, name: i.name }))}
      schedules={serialized}
      sharedEvents={serializedSharedEvents}
    />
  );
}
