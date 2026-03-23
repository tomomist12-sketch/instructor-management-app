import { prisma } from "@/lib/prisma";
import { InstructorList } from "./instructor-list";

export const dynamic = "force-dynamic";

export default async function InstructorsPage() {
  const instructors = await prisma.instructor.findMany({
    include: { _count: { select: { schedules: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <InstructorList
      instructors={instructors.map((i) => ({
        id: i.id,
        name: i.name,
        scheduleCount: i._count.schedules,
      }))}
    />
  );
}
