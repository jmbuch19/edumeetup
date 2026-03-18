/*
  Warnings:

  - The `status` column on the `CircuitRegistration` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CircuitRegStatus" AS ENUM ('REGISTERED', 'PENDING_APPROVAL', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "CircuitRegistration" DROP COLUMN "status",
ADD COLUMN     "status" "CircuitRegStatus" NOT NULL DEFAULT 'REGISTERED';
