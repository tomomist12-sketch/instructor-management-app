-- AlterTable
ALTER TABLE "shared_events" ADD COLUMN "is_recurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shared_events" ADD COLUMN "recurrence_rule" TEXT;
ALTER TABLE "shared_events" ADD COLUMN "recurrence_end_date" DATETIME;
ALTER TABLE "shared_events" ADD COLUMN "recurrence_group_id" TEXT;
