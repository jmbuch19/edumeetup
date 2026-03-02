-- Add notificationPrefs JSON overlay and responseRate cache to University
ALTER TABLE "University"
  ADD COLUMN IF NOT EXISTS "notificationPrefs" JSONB,
  ADD COLUMN IF NOT EXISTS "responseRate"      DOUBLE PRECISION;
