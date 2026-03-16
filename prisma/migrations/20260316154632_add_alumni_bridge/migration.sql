-- CreateEnum
CREATE TYPE "AlumniStatus" AS ENUM ('STUDENT_CURRENTLY', 'OPT_CPT', 'H1B_OTHER', 'FURTHER_STUDIES', 'OTHER');

-- CreateEnum
CREATE TYPE "AlumConnectType" AS ENUM ('EMAIL', 'MEETING', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "AlumConnectStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ALUMNI';

-- DropForeignKey
ALTER TABLE "DirectMessage" DROP CONSTRAINT "DirectMessage_senderId_fkey";

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "programUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "npsSurveyCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "npsSurveyDismissedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NpsSurveyResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT,
    "role" TEXT NOT NULL,
    "allowContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NpsSurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alumni" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsapp" TEXT,
    "yearWentToUSA" INTEGER,
    "usUniversityName" TEXT NOT NULL,
    "usUniversityId" TEXT,
    "usProgram" TEXT NOT NULL,
    "usDegreeLevel" TEXT,
    "usCity" TEXT,
    "alumniStatus" "AlumniStatus" NOT NULL DEFAULT 'STUDENT_CURRENTLY',
    "availableFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "helpTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inspirationMessage" TEXT,
    "linkedinUrl" TEXT,
    "profilePhotoUrl" TEXT,
    "weeklyCapacity" INTEGER,
    "availabilityNote" TEXT,
    "consentDataSharing" BOOLEAN NOT NULL DEFAULT false,
    "showWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "showLinkedin" BOOLEAN NOT NULL DEFAULT true,
    "showUsCity" BOOLEAN NOT NULL DEFAULT true,
    "consentSignedAt" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "adminReviewStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "adminReviewedAt" TIMESTAMP(3),
    "adminReviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alumni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumConnectRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "alumniId" TEXT NOT NULL,
    "type" "AlumConnectType" NOT NULL DEFAULT 'EMAIL',
    "message" TEXT NOT NULL,
    "status" "AlumConnectStatus" NOT NULL DEFAULT 'PENDING',
    "alumResponse" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlumConnectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniInvitation" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedByRepId" TEXT,
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "alumniId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlumniInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NpsSurveyResponse_userId_key" ON "NpsSurveyResponse"("userId");

-- CreateIndex
CREATE INDEX "NpsSurveyResponse_score_idx" ON "NpsSurveyResponse"("score");

-- CreateIndex
CREATE UNIQUE INDEX "Alumni_userId_key" ON "Alumni"("userId");

-- CreateIndex
CREATE INDEX "Alumni_usUniversityId_idx" ON "Alumni"("usUniversityId");

-- CreateIndex
CREATE INDEX "Alumni_alumniStatus_idx" ON "Alumni"("alumniStatus");

-- CreateIndex
CREATE INDEX "Alumni_isVerified_idx" ON "Alumni"("isVerified");

-- CreateIndex
CREATE INDEX "Alumni_adminReviewStatus_idx" ON "Alumni"("adminReviewStatus");

-- CreateIndex
CREATE INDEX "Alumni_consentDataSharing_idx" ON "Alumni"("consentDataSharing");

-- CreateIndex
CREATE INDEX "AlumConnectRequest_studentId_idx" ON "AlumConnectRequest"("studentId");

-- CreateIndex
CREATE INDEX "AlumConnectRequest_alumniId_idx" ON "AlumConnectRequest"("alumniId");

-- CreateIndex
CREATE INDEX "AlumConnectRequest_status_idx" ON "AlumConnectRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AlumniInvitation_token_key" ON "AlumniInvitation"("token");

-- CreateIndex
CREATE INDEX "AlumniInvitation_universityId_idx" ON "AlumniInvitation"("universityId");

-- CreateIndex
CREATE INDEX "AlumniInvitation_token_idx" ON "AlumniInvitation"("token");

-- CreateIndex
CREATE INDEX "AlumniInvitation_alumniId_idx" ON "AlumniInvitation"("alumniId");

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpsSurveyResponse" ADD CONSTRAINT "NpsSurveyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alumni" ADD CONSTRAINT "Alumni_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alumni" ADD CONSTRAINT "Alumni_usUniversityId_fkey" FOREIGN KEY ("usUniversityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumConnectRequest" ADD CONSTRAINT "AlumConnectRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumConnectRequest" ADD CONSTRAINT "AlumConnectRequest_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "Alumni"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniInvitation" ADD CONSTRAINT "AlumniInvitation_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniInvitation" ADD CONSTRAINT "AlumniInvitation_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "Alumni"("id") ON DELETE SET NULL ON UPDATE CASCADE;
