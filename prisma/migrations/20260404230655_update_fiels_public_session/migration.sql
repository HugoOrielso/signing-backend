/*
  Warnings:

  - A unique constraint covering the columns `[contractId,email]` on the table `PublicContractSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PublicContractSession" ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ALTER COLUMN "sessionToken" DROP NOT NULL,
ALTER COLUMN "expiresAt" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PublicContractSession_contractId_email_key" ON "PublicContractSession"("contractId", "email");
