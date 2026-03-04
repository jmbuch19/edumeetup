/*
  Warnings:

  - You are about to drop the column `passCode` on the `FairStudentPass` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[uuid]` on the table `FairStudentPass` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[parentToken]` on the table `FairStudentPass` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,fairEventId]` on the table `FairStudentPass` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `FairStudentPass` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parentToken` to the `FairStudentPass` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `FairStudentPass` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "FairStudentPass" DROP CONSTRAINT "FairStudentPass_studentId_fkey";

-- DropIndex
DROP INDEX "FairStudentPass_passCode_idx";

-- DropIndex
DROP INDEX "FairStudentPass_passCode_key";

-- DropIndex
DROP INDEX "FairStudentPass_studentId_fairEventId_key";

-- AlterTable
ALTER TABLE "FairStudentPass" DROP COLUMN "passCode",
ADD COLUMN     "budgetRange" TEXT,
ADD COLUMN     "currentCourse" TEXT,
ADD COLUMN     "currentInstitution" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "fieldOfInterest" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "isPartialProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentToken" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "preferredCountries" TEXT,
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD COLUMN     "yearOfPassing" INTEGER,
ALTER COLUMN "studentId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FairStudentPass_uuid_key" ON "FairStudentPass"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "FairStudentPass_parentToken_key" ON "FairStudentPass"("parentToken");

-- CreateIndex
CREATE INDEX "FairStudentPass_email_idx" ON "FairStudentPass"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FairStudentPass_email_fairEventId_key" ON "FairStudentPass"("email", "fairEventId");

-- AddForeignKey
ALTER TABLE "FairStudentPass" ADD CONSTRAINT "FairStudentPass_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
