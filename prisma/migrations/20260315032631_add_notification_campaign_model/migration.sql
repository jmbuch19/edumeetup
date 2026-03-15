-- AlterTable
ALTER TABLE "GroupSession" ADD COLUMN     "hostRoomUrl" TEXT,
ADD COLUMN     "reminder24hSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminder30mSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "hostRoomUrl" TEXT;

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "actMaxScore" INTEGER,
ADD COLUMN     "actMinScore" INTEGER,
ADD COLUMN     "actRequired" TEXT,
ADD COLUMN     "appDeadlineDate" TIMESTAMP(3),
ADD COLUMN     "appDeadlineType" TEXT,
ADD COLUMN     "applicationFee" DOUBLE PRECISION,
ADD COLUMN     "applicationFeeCur" TEXT DEFAULT 'USD',
ADD COLUMN     "coopAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gmatMaxScore" INTEGER,
ADD COLUMN     "gmatMinScore" INTEGER,
ADD COLUMN     "gmatRequired" TEXT,
ADD COLUMN     "greMaxScore" INTEGER,
ADD COLUMN     "greMinScore" INTEGER,
ADD COLUMN     "greRequired" TEXT,
ADD COLUMN     "minGpa" DOUBLE PRECISION,
ADD COLUMN     "minPercentage" DOUBLE PRECISION,
ADD COLUMN     "satMaxScore" INTEGER,
ADD COLUMN     "satMinScore" INTEGER,
ADD COLUMN     "satRequired" TEXT,
ADD COLUMN     "scholarshipAvail" TEXT,
ADD COLUMN     "scholarshipDetails" TEXT,
ADD COLUMN     "specialisations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "workExpYears" INTEGER;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "advisorChatHistory" JSONB,
ADD COLUMN     "feeWaived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "University" ADD COLUMN     "accreditation" TEXT,
ADD COLUMN     "feeWaived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indianStudentTarget" TEXT,
ADD COLUMN     "intakeMonths" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "programs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "rankingQS" TEXT,
ADD COLUMN     "rankingTHE" TEXT,
ADD COLUMN     "timezone" TEXT DEFAULT 'UTC',
ADD COLUMN     "universityType" TEXT,
ADD COLUMN     "wherebyApiKey" TEXT,
ALTER COLUMN "country" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

-- CreateTable
CREATE TABLE "MeetingRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationCampaign" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "dayRange" INTEGER NOT NULL,
    "withEmail" BOOLEAN NOT NULL DEFAULT false,
    "sentCount" INTEGER NOT NULL,
    "emailedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingRequest_universityId_idx" ON "MeetingRequest"("universityId");

-- CreateIndex
CREATE INDEX "MeetingRequest_studentId_idx" ON "MeetingRequest"("studentId");

-- CreateIndex
CREATE INDEX "NotificationCampaign_universityId_idx" ON "NotificationCampaign"("universityId");

-- CreateIndex
CREATE INDEX "NotificationCampaign_createdAt_idx" ON "NotificationCampaign"("createdAt");

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationCampaign" ADD CONSTRAINT "NotificationCampaign_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
