/*
  Warnings:

  - You are about to drop the column `readAt` on the `DirectMessage` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `FairAttendance` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `FairAttendance` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `FairAttendance` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `FairInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `fairEventId` on the `FairMessage` table. All the data in the column will be lost.
  - You are about to drop the column `readAt` on the `FairMessage` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `FairMessage` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `FairMessage` table. All the data in the column will be lost.
  - You are about to drop the column `universityId` on the `FairMessage` table. All the data in the column will be lost.
  - Made the column `fairAttendanceId` on table `FairMessage` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currentCourse` on table `FairStudentPass` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currentInstitution` on table `FairStudentPass` required. This step will fail if there are existing NULL values in that column.
  - Made the column `fullName` on table `FairStudentPass` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `FairStudentPass` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "GroupSessionStatus" AS ENUM ('DRAFT', 'OPEN', 'FILLING', 'FULL', 'LIVE', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "FairInvitation" DROP CONSTRAINT "FairInvitation_fairEventId_fkey";

-- DropForeignKey
ALTER TABLE "FairInvitation" DROP CONSTRAINT "FairInvitation_universityId_fkey";

-- DropForeignKey
ALTER TABLE "FairMessage" DROP CONSTRAINT "FairMessage_fairAttendanceId_fkey";

-- DropForeignKey
ALTER TABLE "FairMessage" DROP CONSTRAINT "FairMessage_fairEventId_fkey";

-- DropIndex
DROP INDEX "DirectMessage_senderRole_createdAt_idx";

-- DropIndex
DROP INDEX "FairAttendance_universityId_idx";

-- DropIndex
DROP INDEX "FairMessage_fairEventId_idx";

-- DropIndex
DROP INDEX "FairMessage_studentId_idx";

-- DropIndex
DROP INDEX "FairStudentPass_email_idx";

-- AlterTable
ALTER TABLE "AdvisoryRequest" ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DirectMessage" DROP COLUMN "readAt",
ADD COLUMN     "studentReadAt" TIMESTAMP(3),
ADD COLUMN     "universityReadAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FairAttendance" DROP COLUMN "createdAt",
DROP COLUMN "notes",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "FairEvent" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "slug" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FairInvitation" DROP COLUMN "updatedAt",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "programsShowcasing" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FairMessage" DROP COLUMN "fairEventId",
DROP COLUMN "readAt",
DROP COLUMN "sentAt",
DROP COLUMN "studentId",
DROP COLUMN "universityId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "studentReadAt" TIMESTAMP(3),
ADD COLUMN     "universityReadAt" TIMESTAMP(3),
ALTER COLUMN "fairAttendanceId" SET NOT NULL,
ALTER COLUMN "senderId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FairStudentPass" ALTER COLUMN "currentCourse" SET NOT NULL,
ALTER COLUMN "currentInstitution" SET NOT NULL,
ALTER COLUMN "fullName" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "yearOfPassing" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "actScore" TEXT,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "satScore" TEXT;

-- AlterTable
ALTER TABLE "University" ADD COLUMN     "groupSlug" TEXT,
ADD COLUMN     "isParent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "GroupSession" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "targetField" TEXT,
    "title" TEXT NOT NULL,
    "agenda" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "status" "GroupSessionStatus" NOT NULL DEFAULT 'OPEN',
    "joinUrl" TEXT,
    "videoProvider" TEXT,
    "recapUrl" TEXT,
    "notifiedCount" INTEGER NOT NULL DEFAULT 0,
    "followUpDraftId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupSessionSeat" (
    "id" TEXT NOT NULL,
    "groupSessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "waitlistPos" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "GroupSessionSeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupSession_universityId_idx" ON "GroupSession"("universityId");

-- CreateIndex
CREATE INDEX "GroupSession_status_idx" ON "GroupSession"("status");

-- CreateIndex
CREATE INDEX "GroupSession_scheduledAt_idx" ON "GroupSession"("scheduledAt");

-- CreateIndex
CREATE INDEX "GroupSessionSeat_groupSessionId_status_idx" ON "GroupSessionSeat"("groupSessionId", "status");

-- CreateIndex
CREATE INDEX "GroupSessionSeat_studentId_idx" ON "GroupSessionSeat"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupSessionSeat_groupSessionId_studentId_key" ON "GroupSessionSeat"("groupSessionId", "studentId");

-- CreateIndex
CREATE INDEX "FairAttendance_universityId_fairEventId_idx" ON "FairAttendance"("universityId", "fairEventId");

-- CreateIndex
CREATE INDEX "FairInvitation_fairEventId_idx" ON "FairInvitation"("fairEventId");

-- CreateIndex
CREATE INDEX "FairInvitation_universityId_idx" ON "FairInvitation"("universityId");

-- CreateIndex
CREATE INDEX "FairMessage_senderId_idx" ON "FairMessage"("senderId");

-- CreateIndex
CREATE INDEX "University_parentId_idx" ON "University"("parentId");

-- CreateIndex
CREATE INDEX "University_groupSlug_idx" ON "University"("groupSlug");

-- AddForeignKey
ALTER TABLE "University" ADD CONSTRAINT "University_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSession" ADD CONSTRAINT "GroupSession_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSession" ADD CONSTRAINT "GroupSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSessionSeat" ADD CONSTRAINT "GroupSessionSeat_groupSessionId_fkey" FOREIGN KEY ("groupSessionId") REFERENCES "GroupSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSessionSeat" ADD CONSTRAINT "GroupSessionSeat_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairMessage" ADD CONSTRAINT "FairMessage_fairAttendanceId_fkey" FOREIGN KEY ("fairAttendanceId") REFERENCES "FairAttendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairInvitation" ADD CONSTRAINT "FairInvitation_fairEventId_fkey" FOREIGN KEY ("fairEventId") REFERENCES "FairEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairInvitation" ADD CONSTRAINT "FairInvitation_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
