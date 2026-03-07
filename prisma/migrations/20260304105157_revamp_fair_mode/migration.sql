-- Migration: revamp_fair_mode
-- Applied via db push. This file records the schema changes for migration history.

-- FairEvent: rename title->name, add slug, endedAt
ALTER TABLE "FairEvent" RENAME COLUMN "title" TO "name";
ALTER TABLE "FairEvent" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FairEvent" ADD COLUMN "endedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "FairEvent_slug_key" ON "FairEvent"("slug");
CREATE INDEX "FairEvent_slug_idx" ON "FairEvent"("slug");

-- FairStudentPass: add new consent + metadata fields, make required fields NOT NULL
ALTER TABLE "FairStudentPass" ADD COLUMN IF NOT EXISTS "marketingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FairStudentPass" ADD COLUMN IF NOT EXISTS "consentTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FairStudentPass" ALTER COLUMN "parentToken" DROP NOT NULL;
ALTER TABLE "FairStudentPass" ALTER COLUMN "emailConsent" SET DEFAULT true;
ALTER TABLE "FairStudentPass" ALTER COLUMN "isPartialProfile" SET DEFAULT true;

-- FairAttendance: drop old unique, add new fields, add new unique
ALTER TABLE "FairAttendance" ADD COLUMN IF NOT EXISTS "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FairAttendance" ADD COLUMN IF NOT EXISTS "repNotes" TEXT;
ALTER TABLE "FairAttendance" ADD COLUMN IF NOT EXISTS "matchedPrograms" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "FairAttendance" ADD COLUMN IF NOT EXISTS "emailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FairAttendance" ADD COLUMN IF NOT EXISTS "whatsappSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FairAttendance" ADD COLUMN IF NOT EXISTS "followUpStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "FairAttendance" ADD COLUMN IF NOT EXISTS "followUpNote" TEXT;
ALTER TABLE "FairAttendance" ADD COLUMN IF NOT EXISTS "followUpAt" TIMESTAMP(3);

-- FairMessage: add senderId, senderRole
ALTER TABLE "FairMessage" ADD COLUMN IF NOT EXISTS "senderId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FairMessage" ADD COLUMN IF NOT EXISTS "senderRole" TEXT NOT NULL DEFAULT '';

-- UniversityDocument: add programId, isFairReady
ALTER TABLE "UniversityDocument" ADD COLUMN IF NOT EXISTS "programId" TEXT;
ALTER TABLE "UniversityDocument" ADD COLUMN IF NOT EXISTS "isFairReady" BOOLEAN NOT NULL DEFAULT false;
