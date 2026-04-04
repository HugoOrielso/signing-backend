/*
  Warnings:

  - You are about to drop the column `fileName` on the `ContractDocument` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `ContractDocument` table. All the data in the column will be lost.
  - You are about to drop the column `mimeType` on the `ContractDocument` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `ContractDocument` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[contractId,type]` on the table `ContractDocument` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ContractDocument" DROP COLUMN "fileName",
DROP COLUMN "fileUrl",
DROP COLUMN "mimeType",
DROP COLUMN "source",
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- CreateTable
CREATE TABLE "ContractFileUpload" (
    "id" TEXT NOT NULL,
    "contractDocumentId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "source" "DocumentSource" NOT NULL,
    "publicId" TEXT,
    "resourceType" TEXT,
    "format" TEXT,
    "bytes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractFileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractFileUpload_contractDocumentId_idx" ON "ContractFileUpload"("contractDocumentId");

-- CreateIndex
CREATE INDEX "ContractFileUpload_isActive_idx" ON "ContractFileUpload"("isActive");

-- CreateIndex
CREATE INDEX "ContractDocument_contractId_idx" ON "ContractDocument"("contractId");

-- CreateIndex
CREATE INDEX "ContractDocument_type_idx" ON "ContractDocument"("type");

-- CreateIndex
CREATE INDEX "ContractDocument_status_idx" ON "ContractDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContractDocument_contractId_type_key" ON "ContractDocument"("contractId", "type");

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractFileUpload" ADD CONSTRAINT "ContractFileUpload_contractDocumentId_fkey" FOREIGN KEY ("contractDocumentId") REFERENCES "ContractDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractFileUpload" ADD CONSTRAINT "ContractFileUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
