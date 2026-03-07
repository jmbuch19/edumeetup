-- Migration: Add timezone to AvailabilityProfile
-- Generated: 2026-03-07
-- Risk: LOW — additive nullable column with a safe default.
--       Default "UTC" matches the previous implicit assumption (everything was UTC).
--       Existing profiles will remain functionally unchanged until explicitly updated.
--
-- After applying, university reps should update their profile timezone via the UI.

ALTER TABLE "AvailabilityProfile" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
