-- Add notificationPrefs JSON column to Student table
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "notificationPrefs" JSONB;
