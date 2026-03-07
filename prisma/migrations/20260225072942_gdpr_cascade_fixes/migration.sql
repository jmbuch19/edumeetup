-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_userId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "actorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
