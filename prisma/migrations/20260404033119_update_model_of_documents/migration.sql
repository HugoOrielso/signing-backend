/*
  Warnings:

  - You are about to drop the `ContractFileUpload` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ContractFileUpload" DROP CONSTRAINT "ContractFileUpload_contractDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "ContractFileUpload" DROP CONSTRAINT "ContractFileUpload_uploadedById_fkey";

-- AlterTable
ALTER TABLE "ContractDocument" ADD COLUMN     "bytes" INTEGER,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "format" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "publicId" TEXT,
ADD COLUMN     "resourceType" TEXT,
ADD COLUMN     "source" "DocumentSource",
ADD COLUMN     "uploadedAt" TIMESTAMP(3),
ADD COLUMN     "uploadedById" TEXT;

-- DropTable
DROP TABLE "ContractFileUpload";

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
