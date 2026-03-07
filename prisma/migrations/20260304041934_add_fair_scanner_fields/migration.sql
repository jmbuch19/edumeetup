/*
  Warnings:

  - A unique constraint covering the columns `[passId,universityId,fairEventId]` on the table `FairAttendance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `passId` to the `FairAttendance` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "FairAttendance_universityId_fairEventId_key";

-- AlterTable
ALTER TABLE "FairAttendance" ADD COLUMN     "emailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "matchedPrograms" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "passId" TEXT NOT NULL,
ADD COLUMN     "repNotes" TEXT,
ADD COLUMN     "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "status" SET DEFAULT 'SCANNED';

-- AlterTable
ALTER TABLE "FairStudentPass" ADD COLUMN     "whatsappConsent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "FairAttendance_passId_idx" ON "FairAttendance"("passId");

-- CreateIndex
CREATE UNIQUE INDEX "FairAttendance_passId_universityId_fairEventId_key" ON "FairAttendance"("passId", "universityId", "fairEventId");

-- AddForeignKey
ALTER TABLE "FairAttendance" ADD CONSTRAINT "FairAttendance_passId_fkey" FOREIGN KEY ("passId") REFERENCES "FairStudentPass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
