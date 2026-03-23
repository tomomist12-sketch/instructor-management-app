import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.TURSO_DATABASE_URL!.replace("libsql://", "https://");
const adapter = new PrismaLibSql({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const inst1 = await prisma.instructor.create({ data: { name: "関戸 もみ" } });
  const inst2 = await prisma.instructor.create({ data: { name: "田中 太郎" } });
  const inst3 = await prisma.instructor.create({ data: { name: "佐々木 花" } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.schedule.create({
    data: {
      category: "study_group", title: "第12回 出品実践勉強会",
      instructorId: inst1.id,
      scheduledAt: new Date(new Date(today).setHours(14, 0)),
      endAt: new Date(new Date(today).setHours(15, 30)),
    },
  });
  await prisma.schedule.create({
    data: {
      category: "first_consult", title: "初回面談",
      instructorId: inst2.id, participantName: "佐藤さん",
      scheduledAt: new Date(new Date(today).setHours(16, 0)),
      endAt: new Date(new Date(today).setHours(17, 0)),
    },
  });

  console.log("Seed data created!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
