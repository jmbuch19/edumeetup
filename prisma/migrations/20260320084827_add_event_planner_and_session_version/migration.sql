-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'EVENT_PLANNER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 1;
