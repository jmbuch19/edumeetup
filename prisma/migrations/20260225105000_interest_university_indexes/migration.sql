-- Add indexes to Interest and University models for common query patterns
CREATE INDEX "Interest_status_idx" ON "Interest"("status");
CREATE INDEX "University_verificationStatus_idx" ON "University"("verificationStatus");
CREATE INDEX "University_country_idx" ON "University"("country");
