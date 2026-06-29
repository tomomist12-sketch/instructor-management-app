-- AlterTable
ALTER TABLE "rotation_settings" ADD COLUMN "extra_days_of_week" TEXT;
ALTER TABLE "rotation_settings" ADD COLUMN "rotation_mode" TEXT NOT NULL DEFAULT 'continuous';
