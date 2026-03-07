-- Migration: add currentSemester and englishExam to FairStudentPass,
-- and make yearOfPassing nullable (existing rows keep their values).
ALTER TABLE "FairStudentPass"
  ALTER COLUMN "yearOfPassing" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "currentSemester" TEXT,
  ADD COLUMN IF NOT EXISTS "englishExam"     TEXT;
