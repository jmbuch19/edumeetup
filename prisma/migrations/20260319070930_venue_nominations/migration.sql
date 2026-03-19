-- AlterTable
ALTER TABLE "HostRequest" ADD COLUMN     "proposedCircuitId" TEXT;

-- AddForeignKey
ALTER TABLE "HostRequest" ADD CONSTRAINT "HostRequest_proposedCircuitId_fkey" FOREIGN KEY ("proposedCircuitId") REFERENCES "FairCircuit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
