-- DropIndex
DROP INDEX "SponsoredContent_startDate_endDate_idx";

-- AlterTable
ALTER TABLE "University" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "SponsoredContent_startDate_idx" ON "SponsoredContent"("startDate");

-- CreateIndex
CREATE INDEX "University_isVerified_idx" ON "University"("isVerified");
