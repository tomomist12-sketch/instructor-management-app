/*
  Warnings:

  - You are about to drop the `students` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `line_id` on the `instructors` table. All the data in the column will be lost.
  - You are about to drop the column `student_id` on the `schedules` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "students";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "rotation_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL DEFAULT 'first_consult',
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "instructor_order" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "weeks_to_generate" INTEGER NOT NULL DEFAULT 12
);

-- CreateTable
CREATE TABLE "shared_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "created_by_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timing" TEXT NOT NULL,
    "time_of_day" TEXT NOT NULL DEFAULT '09:00',
    "enabled" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_instructors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_instructors" ("created_at", "email", "id", "name") SELECT "created_at", "email", "id", "name" FROM "instructors";
DROP TABLE "instructors";
ALTER TABLE "new_instructors" RENAME TO "instructors";
CREATE TABLE "new_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "title" TEXT,
    "instructor_id" TEXT NOT NULL,
    "participant_name" TEXT,
    "scheduled_at" DATETIME NOT NULL,
    "end_at" DATETIME,
    "memo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "recurrence_end_date" DATETIME,
    "recurrence_group_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "schedules_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "instructors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_schedules" ("category", "created_at", "end_at", "id", "instructor_id", "memo", "scheduled_at", "status", "title") SELECT "category", "created_at", "end_at", "id", "instructor_id", "memo", "scheduled_at", "status", "title" FROM "schedules";
DROP TABLE "schedules";
ALTER TABLE "new_schedules" RENAME TO "schedules";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
