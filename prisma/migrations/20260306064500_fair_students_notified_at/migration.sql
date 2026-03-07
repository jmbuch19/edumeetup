-- Migration: fair_students_notified_at
-- Adds: studentsNotifiedAt on FairEvent
-- Set by admin when the LIVE status + student notification blast is triggered

ALTER TABLE "FairEvent"
  ADD COLUMN IF NOT EXISTS "studentsNotifiedAt" TIMESTAMP(3);
