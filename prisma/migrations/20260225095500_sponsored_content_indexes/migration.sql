-- Add performance indexes to SponsoredContent
-- status: fast filtering for ACTIVE/DRAFT/EXPIRED content
-- startDate + endDate: composite for date-range overlap queries (currently-live ads)
CREATE INDEX "SponsoredContent_status_idx" ON "SponsoredContent"("status");
CREATE INDEX "SponsoredContent_startDate_endDate_idx" ON "SponsoredContent"("startDate", "endDate");
