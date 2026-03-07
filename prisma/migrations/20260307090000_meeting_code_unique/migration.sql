-- Migration: Add unique constraint to Meeting.meetingCode
-- Generated: 2026-03-07
-- Risk: LOW — meetingCode was already required (non-nullable String).
--       This migration checks for duplicates first.
--       If any duplicates exist in prod, the migration will fail
--       and they must be resolved manually before re-running.
--
-- Safety check (run manually before applying):
--   SELECT meetingCode, COUNT(*) FROM "Meeting"
--   GROUP BY meetingCode HAVING COUNT(*) > 1;

ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_meetingCode_key" UNIQUE ("meetingCode");
