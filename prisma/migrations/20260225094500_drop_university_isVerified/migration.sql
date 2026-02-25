-- Drop the isVerified boolean column from University.
-- verificationStatus (string: PENDING | VERIFIED | REJECTED) is the
-- single source of truth going forward.
ALTER TABLE "University" DROP COLUMN IF EXISTS "isVerified";
