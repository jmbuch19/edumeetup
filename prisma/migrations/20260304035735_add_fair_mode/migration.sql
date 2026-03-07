-- CreateEnum
CREATE TYPE "ProctorRequestStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProactiveMessageStatus" AS ENUM ('SENT', 'OPENED', 'REPLIED', 'CONVERTED', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "RepBadgeType" AS ENUM ('FIRST_NUDGE', 'RESPONSE_STAR', 'MEETING_MAKER', 'CONSISTENT_NUDGER');

-- CreateEnum
CREATE TYPE "FairEventStatus" AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "University" ADD COLUMN     "notifPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifQuota" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "proactiveCooldownDays" INTEGER NOT NULL DEFAULT 21;

-- AlterTable
ALTER TABLE "UniversityDocument" ADD COLUMN     "isFairReady" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "programId" TEXT;

-- CreateTable
CREATE TABLE "ProctorRequest" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "examType" TEXT NOT NULL,
    "subjects" TEXT NOT NULL,
    "examStartDate" TIMESTAMP(3) NOT NULL,
    "examEndDate" TIMESTAMP(3) NOT NULL,
    "studentCount" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "requirements" TEXT,
    "policyUrl" TEXT,
    "status" "ProctorRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "fees" DOUBLE PRECISION,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProctorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProactiveMessage" (
    "id" TEXT NOT NULL,
    "repId" TEXT,
    "studentId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "status" "ProactiveMessageStatus" NOT NULL DEFAULT 'SENT',

    CONSTRAINT "ProactiveMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepPerformance" (
    "id" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "totalProactiveSent" INTEGER NOT NULL DEFAULT 0,
    "totalReplies" INTEGER NOT NULL DEFAULT 0,
    "replyRate" DOUBLE PRECISION DEFAULT 0,
    "totalMeetingsFromNudge" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepBadge" (
    "id" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "badgeType" "RepBadgeType" NOT NULL,
    "name" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDiscoveryDismissal" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentDiscoveryDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FairEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT,
    "venue" TEXT,
    "country" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isHybrid" BOOLEAN NOT NULL DEFAULT false,
    "onlineUrl" TEXT,
    "status" "FairEventStatus" NOT NULL DEFAULT 'UPCOMING',
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FairEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FairStudentPass" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fairEventId" TEXT NOT NULL,
    "passCode" TEXT NOT NULL,
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FairStudentPass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FairAttendance" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "fairEventId" TEXT NOT NULL,
    "boothNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FairAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FairMessage" (
    "id" TEXT NOT NULL,
    "fairEventId" TEXT NOT NULL,
    "fairAttendanceId" TEXT,
    "studentId" TEXT,
    "universityId" TEXT,
    "content" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "FairMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProctorRequest_universityId_idx" ON "ProctorRequest"("universityId");

-- CreateIndex
CREATE INDEX "ProctorRequest_status_idx" ON "ProctorRequest"("status");

-- CreateIndex
CREATE INDEX "ProctorRequest_examStartDate_idx" ON "ProctorRequest"("examStartDate");

-- CreateIndex
CREATE INDEX "ProactiveMessage_repId_idx" ON "ProactiveMessage"("repId");

-- CreateIndex
CREATE INDEX "ProactiveMessage_studentId_idx" ON "ProactiveMessage"("studentId");

-- CreateIndex
CREATE INDEX "ProactiveMessage_universityId_idx" ON "ProactiveMessage"("universityId");

-- CreateIndex
CREATE INDEX "ProactiveMessage_sentAt_idx" ON "ProactiveMessage"("sentAt");

-- CreateIndex
CREATE INDEX "ProactiveMessage_status_idx" ON "ProactiveMessage"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RepPerformance_repId_key" ON "RepPerformance"("repId");

-- CreateIndex
CREATE INDEX "RepBadge_repId_idx" ON "RepBadge"("repId");

-- CreateIndex
CREATE INDEX "RepBadge_badgeType_idx" ON "RepBadge"("badgeType");

-- CreateIndex
CREATE INDEX "StudentDiscoveryDismissal_universityId_idx" ON "StudentDiscoveryDismissal"("universityId");

-- CreateIndex
CREATE INDEX "StudentDiscoveryDismissal_studentId_idx" ON "StudentDiscoveryDismissal"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentDiscoveryDismissal_universityId_studentId_key" ON "StudentDiscoveryDismissal"("universityId", "studentId");

-- CreateIndex
CREATE INDEX "FairEvent_status_idx" ON "FairEvent"("status");

-- CreateIndex
CREATE INDEX "FairEvent_startDate_idx" ON "FairEvent"("startDate");

-- CreateIndex
CREATE INDEX "FairEvent_city_idx" ON "FairEvent"("city");

-- CreateIndex
CREATE UNIQUE INDEX "FairStudentPass_passCode_key" ON "FairStudentPass"("passCode");

-- CreateIndex
CREATE INDEX "FairStudentPass_studentId_idx" ON "FairStudentPass"("studentId");

-- CreateIndex
CREATE INDEX "FairStudentPass_fairEventId_idx" ON "FairStudentPass"("fairEventId");

-- CreateIndex
CREATE INDEX "FairStudentPass_passCode_idx" ON "FairStudentPass"("passCode");

-- CreateIndex
CREATE UNIQUE INDEX "FairStudentPass_studentId_fairEventId_key" ON "FairStudentPass"("studentId", "fairEventId");

-- CreateIndex
CREATE INDEX "FairAttendance_universityId_idx" ON "FairAttendance"("universityId");

-- CreateIndex
CREATE INDEX "FairAttendance_fairEventId_idx" ON "FairAttendance"("fairEventId");

-- CreateIndex
CREATE UNIQUE INDEX "FairAttendance_universityId_fairEventId_key" ON "FairAttendance"("universityId", "fairEventId");

-- CreateIndex
CREATE INDEX "FairMessage_fairEventId_idx" ON "FairMessage"("fairEventId");

-- CreateIndex
CREATE INDEX "FairMessage_fairAttendanceId_idx" ON "FairMessage"("fairAttendanceId");

-- CreateIndex
CREATE INDEX "FairMessage_studentId_idx" ON "FairMessage"("studentId");

-- CreateIndex
CREATE INDEX "UniversityDocument_programId_idx" ON "UniversityDocument"("programId");

-- AddForeignKey
ALTER TABLE "UniversityDocument" ADD CONSTRAINT "UniversityDocument_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctorRequest" ADD CONSTRAINT "ProctorRequest_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProactiveMessage" ADD CONSTRAINT "ProactiveMessage_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProactiveMessage" ADD CONSTRAINT "ProactiveMessage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProactiveMessage" ADD CONSTRAINT "ProactiveMessage_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepPerformance" ADD CONSTRAINT "RepPerformance_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepBadge" ADD CONSTRAINT "RepBadge_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDiscoveryDismissal" ADD CONSTRAINT "StudentDiscoveryDismissal_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDiscoveryDismissal" ADD CONSTRAINT "StudentDiscoveryDismissal_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairStudentPass" ADD CONSTRAINT "FairStudentPass_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairStudentPass" ADD CONSTRAINT "FairStudentPass_fairEventId_fkey" FOREIGN KEY ("fairEventId") REFERENCES "FairEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairAttendance" ADD CONSTRAINT "FairAttendance_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairAttendance" ADD CONSTRAINT "FairAttendance_fairEventId_fkey" FOREIGN KEY ("fairEventId") REFERENCES "FairEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairMessage" ADD CONSTRAINT "FairMessage_fairEventId_fkey" FOREIGN KEY ("fairEventId") REFERENCES "FairEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairMessage" ADD CONSTRAINT "FairMessage_fairAttendanceId_fkey" FOREIGN KEY ("fairAttendanceId") REFERENCES "FairAttendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
