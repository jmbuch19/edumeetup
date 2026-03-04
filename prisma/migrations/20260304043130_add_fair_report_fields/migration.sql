-- AlterTable
ALTER TABLE "FairAttendance" ADD COLUMN     "followUpStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "FairStudentPass" ADD COLUMN     "emailConsent" BOOLEAN NOT NULL DEFAULT false;
