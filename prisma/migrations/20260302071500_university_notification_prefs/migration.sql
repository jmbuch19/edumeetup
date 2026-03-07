-- University notification preferences — 15 new columns
ALTER TABLE "University"
  ADD COLUMN IF NOT EXISTS "notifyNewInterest"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyMeetingBooked"     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyMeetingCancelled"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "followUpThresholdHours"  INTEGER,
  ADD COLUMN IF NOT EXISTS "digestDaily"             BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "digestWeekly"            BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "digestMonthly"           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyFairOpportunities" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyInterestSpikes"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyTarget"            TEXT    NOT NULL DEFAULT 'PRIMARY',
  ADD COLUMN IF NOT EXISTS "customNotifyEmails"      TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "quietHoursEnabled"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "quietHoursStart"         INTEGER NOT NULL DEFAULT 22,
  ADD COLUMN IF NOT EXISTS "quietHoursEnd"           INTEGER NOT NULL DEFAULT 7;
