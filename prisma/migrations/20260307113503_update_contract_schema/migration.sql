/*
  Warnings:

  - You are about to drop the column `signerId` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the `Signer` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[contractNumber]` on the table `Contract` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PartyRole" AS ENUM ('CONTRACTOR', 'CONTRACTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContractStatus" ADD VALUE 'PARTIALLY_SIGNED';
ALTER TYPE "ContractStatus" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_signerId_fkey";

-- DropForeignKey
ALTER TABLE "Signature" DROP CONSTRAINT "Signature_signerId_fkey";

-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "signerId",
ADD COLUMN     "amount" DECIMAL(12,2),
ADD COLUMN     "contractNumber" TEXT,
ADD COLUMN     "contractType" TEXT,
ADD COLUMN     "currency" TEXT DEFAULT 'COP',
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "subject" TEXT,
ALTER COLUMN "originalUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SignatureField" ADD COLUMN     "signerId" TEXT;

-- DropTable
DROP TABLE "Signer";

-- CreateTable
CREATE TABLE "ContractParty" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "role" "PartyRole" NOT NULL,
    "name" TEXT NOT NULL,
    "identification" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractClause" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractClause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractSigner" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "partyRole" "PartyRole",
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "roleTitle" TEXT,
    "signerOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractSigner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractParty_contractId_idx" ON "ContractParty"("contractId");

-- CreateIndex
CREATE INDEX "ContractParty_role_idx" ON "ContractParty"("role");

-- CreateIndex
CREATE INDEX "ContractClause_contractId_idx" ON "ContractClause"("contractId");

-- CreateIndex
CREATE INDEX "ContractSigner_contractId_idx" ON "ContractSigner"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- CreateIndex
CREATE INDEX "Contract_adminId_idx" ON "Contract"("adminId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "SignatureField_signerId_idx" ON "SignatureField"("signerId");

-- AddForeignKey
ALTER TABLE "ContractParty" ADD CONSTRAINT "ContractParty_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractClause" ADD CONSTRAINT "ContractClause_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSigner" ADD CONSTRAINT "ContractSigner_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureField" ADD CONSTRAINT "SignatureField_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "ContractSigner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "ContractSigner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
