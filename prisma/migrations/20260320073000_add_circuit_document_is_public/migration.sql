-- AlterTable
ALTER TABLE "HostRequest" ALTER COLUMN "state" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CircuitDocument" (
    "id" TEXT NOT NULL,
    "circuitId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CircuitDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CircuitDocument_circuitId_idx" ON "CircuitDocument"("circuitId");

-- CreateIndex
CREATE INDEX "CircuitDocument_deletedAt_idx" ON "CircuitDocument"("deletedAt");

-- AddForeignKey
ALTER TABLE "CircuitDocument" ADD CONSTRAINT "CircuitDocument_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "FairCircuit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
