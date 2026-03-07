/*
  Warnings:

  - You are about to drop the column `isVerified` on the `University` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "University_isVerified_idx";

-- AlterTable
ALTER TABLE "University" DROP COLUMN "isVerified";
