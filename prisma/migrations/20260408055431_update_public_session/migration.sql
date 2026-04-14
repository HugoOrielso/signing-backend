/*
  Warnings:

  - A unique constraint covering the columns `[identifier]` on the table `PublicContractSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `identifier` to the `PublicContractSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `identifierType` to the `PublicContractSession` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PublicContractIdentifierType" AS ENUM ('EMAIL', 'PHONE');

-- DropIndex
DROP INDEX "PublicContractSession_email_key";

-- AlterTable
ALTER TABLE "PublicContractSession" ADD COLUMN     "identifier" TEXT NOT NULL,
ADD COLUMN     "identifierType" "PublicContractIdentifierType" NOT NULL,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "PublicContractSession_identifier_idx" ON "PublicContractSession"("identifier");

-- CreateIndex
CREATE INDEX "PublicContractSession_identifierType_idx" ON "PublicContractSession"("identifierType");

-- CreateIndex
CREATE INDEX "PublicContractSession_phone_idx" ON "PublicContractSession"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "PublicContractSession_identifier_key" ON "PublicContractSession"("identifier");
