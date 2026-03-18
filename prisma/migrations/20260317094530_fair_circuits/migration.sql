/*
  Warnings:

  - The values [H1B_OTHER] on the enum `AlumniStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdAt` on the `Alumni` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Alumni` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FairCircuitStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "AlumniStatus_new" AS ENUM ('STUDENT_CURRENTLY', 'OPT_CPT', 'H1B_PENDING', 'H1B_APPROVED', 'GREEN_CARD', 'PR_OTHER_COUNTRY', 'EMPLOYED_USA', 'FURTHER_STUDIES', 'RETURNED_HOME', 'OTHER');
ALTER TABLE "Alumni" ALTER COLUMN "alumniStatus" DROP DEFAULT;
ALTER TABLE "Alumni" ALTER COLUMN "alumniStatus" TYPE "AlumniStatus_new" USING ("alumniStatus"::text::"AlumniStatus_new");
ALTER TYPE "AlumniStatus" RENAME TO "AlumniStatus_old";
ALTER TYPE "AlumniStatus_new" RENAME TO "AlumniStatus";
DROP TYPE "AlumniStatus_old";
ALTER TABLE "Alumni" ALTER COLUMN "alumniStatus" SET DEFAULT 'STUDENT_CURRENTLY';
COMMIT;

-- AlterTable
ALTER TABLE "Alumni" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "currentEmployer" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "lastProfileNudgeAt" TIMESTAMP(3),
ADD COLUMN     "lastStatusUpdate" TIMESTAMP(3),
ADD COLUMN     "movedToCountry" TEXT;

-- AlterTable
ALTER TABLE "FairEvent" ADD COLUMN     "circuitId" TEXT;

-- AlterTable
ALTER TABLE "HostRequest" ADD COLUMN     "venueId" TEXT;

-- CreateTable
CREATE TABLE "FairCircuit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "FairCircuitStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FairCircuit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FairVenue" (
    "id" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "circuitId" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'TIER2',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FairVenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircuitRegistration" (
    "id" TEXT NOT NULL,
    "circuitId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "repId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircuitRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniChangeLog" (
    "id" TEXT NOT NULL,
    "alumniId" TEXT NOT NULL,
    "changedField" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlumniChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FairCircuit_slug_key" ON "FairCircuit"("slug");

-- CreateIndex
CREATE INDEX "FairCircuit_status_idx" ON "FairCircuit"("status");

-- CreateIndex
CREATE INDEX "FairCircuit_startDate_idx" ON "FairCircuit"("startDate");

-- CreateIndex
CREATE INDEX "FairVenue_circuitId_idx" ON "FairVenue"("circuitId");

-- CreateIndex
CREATE INDEX "FairVenue_city_idx" ON "FairVenue"("city");

-- CreateIndex
CREATE INDEX "CircuitRegistration_circuitId_idx" ON "CircuitRegistration"("circuitId");

-- CreateIndex
CREATE INDEX "CircuitRegistration_universityId_idx" ON "CircuitRegistration"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "CircuitRegistration_circuitId_universityId_key" ON "CircuitRegistration"("circuitId", "universityId");

-- CreateIndex
CREATE INDEX "AlumniChangeLog_alumniId_idx" ON "AlumniChangeLog"("alumniId");

-- CreateIndex
CREATE INDEX "AlumniChangeLog_changedAt_idx" ON "AlumniChangeLog"("changedAt");

-- CreateIndex
CREATE INDEX "FairEvent_circuitId_idx" ON "FairEvent"("circuitId");

-- AddForeignKey
ALTER TABLE "HostRequest" ADD CONSTRAINT "HostRequest_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "FairVenue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairVenue" ADD CONSTRAINT "FairVenue_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "FairCircuit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitRegistration" ADD CONSTRAINT "CircuitRegistration_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "FairCircuit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitRegistration" ADD CONSTRAINT "CircuitRegistration_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitRegistration" ADD CONSTRAINT "CircuitRegistration_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairEvent" ADD CONSTRAINT "FairEvent_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "FairCircuit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniChangeLog" ADD CONSTRAINT "AlumniChangeLog_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "Alumni"("id") ON DELETE CASCADE ON UPDATE CASCADE;
