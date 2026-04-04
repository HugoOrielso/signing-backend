/*
  Warnings:

  - You are about to drop the column `label` on the `ContractDocument` table. All the data in the column will be lost.
  - You are about to drop the column `publicId` on the `ContractDocument` table. All the data in the column will be lost.
  - You are about to drop the column `sizeBytes` on the `ContractDocument` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedAt` on the `ContractDocument` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `ContractDocument` table. All the data in the column will be lost.
  - Added the required column `fileUrl` to the `ContractDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `ContractDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ContractDocument` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `ContractDocument` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ContractDocumentType" AS ENUM ('ID_FRONT', 'ID_BACK', 'SELFIE_WITH_ID', 'BANK_CERTIFICATE', 'PAYROLL_STUB');

-- CreateEnum
CREATE TYPE "DocumentSource" AS ENUM ('CAMERA', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropIndex
DROP INDEX "ContractDocument_contractId_idx";

-- AlterTable
ALTER TABLE "ContractDocument" DROP COLUMN "label",
DROP COLUMN "publicId",
DROP COLUMN "sizeBytes",
DROP COLUMN "uploadedAt",
DROP COLUMN "url",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileUrl" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "source" "DocumentSource" NOT NULL,
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "ContractDocumentType" NOT NULL;

-- DropEnum
DROP TYPE "DocumentType";
