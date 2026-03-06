-- Migration: fair_rsvp_flow
-- Adds: FairInvitation table, rsvpDeadline on FairEvent,
--       dismissed/dismissedAt on Notification tables,
--       notifyFairOpportunities on University

-- ── 1. University: fair opt-in flag ────────────────────────────────────────
ALTER TABLE "University"
  ADD COLUMN IF NOT EXISTS "notifyFairOpportunities" BOOLEAN NOT NULL DEFAULT true;

-- ── 2. FairEvent: RSVP deadline field ──────────────────────────────────────
ALTER TABLE "FairEvent"
  ADD COLUMN IF NOT EXISTS "rsvpDeadline" TIMESTAMP(3);

-- ── 3. StudentNotification: dismissed fields ────────────────────────────────
ALTER TABLE "StudentNotification"
  ADD COLUMN IF NOT EXISTS "dismissed"   BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dismissedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "StudentNotification_dismissed_idx"
  ON "StudentNotification"("dismissed");

-- ── 4. UniversityNotification: dismissed fields ─────────────────────────────
ALTER TABLE "UniversityNotification"
  ADD COLUMN IF NOT EXISTS "dismissed"   BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dismissedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "UniversityNotification_dismissed_idx"
  ON "UniversityNotification"("dismissed");

-- ── 5. FairInvitationStatus enum ───────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "FairInvitationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ── 6. FairInvitation table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "FairInvitation" (
  "id"                   TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "fairEventId"          TEXT        NOT NULL,
  "universityId"         TEXT        NOT NULL,
  "status"               "FairInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "repsAttending"        INTEGER,
  "programsShowcasing"   TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  "specialRequirements"  TEXT,
  "respondedAt"          TIMESTAMP(3),
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FairInvitation_pkey" PRIMARY KEY ("id")
);

-- Unique index: one invitation per university per fair
CREATE UNIQUE INDEX IF NOT EXISTS "FairInvitation_fairEventId_universityId_key"
  ON "FairInvitation"("fairEventId", "universityId");

-- FK: fairEventId → FairEvent.id (cascade delete if fair is removed)
DO $$ BEGIN
  ALTER TABLE "FairInvitation"
    ADD CONSTRAINT "FairInvitation_fairEventId_fkey"
    FOREIGN KEY ("fairEventId") REFERENCES "FairEvent"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- FK: universityId → University.id (cascade delete if university is removed)
DO $$ BEGIN
  ALTER TABLE "FairInvitation"
    ADD CONSTRAINT "FairInvitation_universityId_fkey"
    FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ── 7. UniversityNotification: metadata JSON field (for FAIR_INVITE type) ──
ALTER TABLE "UniversityNotification"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;
