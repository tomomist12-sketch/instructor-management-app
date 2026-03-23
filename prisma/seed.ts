import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.resolve(__dirname, "dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const inst1 = await prisma.instructor.create({ data: { name: "関戸 もみ" } });
  const inst2 = await prisma.instructor.create({ data: { name: "田中 太郎" } });
  const inst3 = await prisma.instructor.create({ data: { name: "佐々木 花" } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 今日の予定
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
  await prisma.schedule.create({
    data: {
      category: "line_reply",
      instructorId: inst3.id,
      scheduledAt: new Date(new Date(today).setHours(10, 0)),
      endAt: new Date(new Date(today).setHours(11, 0)),
      status: "completed", memo: "午前分対応済み",
    },
  });

  // 明日
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  await prisma.schedule.create({
    data: {
      category: "live_talk", title: "ライブトーク #25",
      instructorId: inst1.id,
      scheduledAt: new Date(new Date(tomorrow).setHours(20, 0)),
      endAt: new Date(new Date(tomorrow).setHours(21, 30)),
    },
  });
  await prisma.schedule.create({
    data: {
      category: "column", title: "ebay初心者向けコラム",
      instructorId: inst2.id,
      scheduledAt: new Date(new Date(tomorrow).setHours(10, 0)),
    },
  });

  console.log("Seed data created!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
