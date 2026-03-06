-- Migration: university_document_soft_delete
-- Adds: deletedAt on UniversityDocument for soft delete support

ALTER TABLE "UniversityDocument"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "UniversityDocument_deletedAt_idx"
  ON "UniversityDocument"("deletedAt");
