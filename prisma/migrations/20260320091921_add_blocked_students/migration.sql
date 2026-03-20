-- AlterTable
ALTER TABLE "Alumni" ADD COLUMN     "blockedStudents" TEXT[] DEFAULT ARRAY[]::TEXT[];
