-- Add performance indexes to AdvisoryRequest
-- status: fast filtering for NEW/IN_PROGRESS/COMPLETED admin dashboard queries
-- studentId: fast per-student advisory request lookups
CREATE INDEX "AdvisoryRequest_status_idx" ON "AdvisoryRequest"("status");
CREATE INDEX "AdvisoryRequest_studentId_idx" ON "AdvisoryRequest"("studentId");
