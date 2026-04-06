/*
  Warnings:

  - You are about to drop the column `contractId` on the `PublicContractSession` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `PublicContractSession` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "PublicContractSession" DROP CONSTRAINT "PublicContractSession_contractId_fkey";

-- DropIndex
DROP INDEX "PublicContractSession_contractId_email_key";

-- DropIndex
DROP INDEX "PublicContractSession_contractId_idx";

-- AlterTable
ALTER TABLE "PublicContractSession" DROP COLUMN "contractId";

-- CreateIndex
CREATE UNIQUE INDEX "PublicContractSession_email_key" ON "PublicContractSession"("email");
