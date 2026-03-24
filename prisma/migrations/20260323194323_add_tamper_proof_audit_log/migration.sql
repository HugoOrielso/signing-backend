/*
  Warnings:

  - The values [PDF_GENERATED,LINK_CREATED] on the enum `AuditEventType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `deviceFingerprint` on the `ContractAuditEvent` table. All the data in the column will be lost.
  - You are about to drop the column `documentHash` on the `ContractAuditEvent` table. All the data in the column will be lost.
  - You are about to drop the column `eventAt` on the `ContractAuditEvent` table. All the data in the column will be lost.
  - You are about to drop the column `previousHash` on the `ContractAuditEvent` table. All the data in the column will be lost.
  - Made the column `eventHash` on table `ContractAuditEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditEventType_new" AS ENUM ('CONTRACT_CREATED', 'CONTRACT_UPDATED', 'CONTRACT_SENT', 'LINK_OPENED', 'OTP_SENT', 'OTP_VERIFIED', 'SIGNATURE_STARTED', 'SIGNATURE_COMPLETED', 'DOCUMENT_UPLOADED', 'ID_FRONT_UPLOADED', 'ID_BACK_UPLOADED', 'SELFIE_UPLOADED', 'CONTRACT_SIGNED', 'CONTRACT_CANCELLED', 'CONTRACT_EXPIRED', 'HASH_SEALED');
ALTER TABLE "ContractAuditEvent" ALTER COLUMN "eventType" TYPE "AuditEventType_new" USING ("eventType"::text::"AuditEventType_new");
ALTER TYPE "AuditEventType" RENAME TO "AuditEventType_old";
ALTER TYPE "AuditEventType_new" RENAME TO "AuditEventType";
DROP TYPE "public"."AuditEventType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ContractAuditEvent" DROP CONSTRAINT "ContractAuditEvent_contractId_fkey";

-- DropIndex
DROP INDEX "ContractAuditEvent_adminId_idx";

-- DropIndex
DROP INDEX "ContractAuditEvent_contractId_eventAt_idx";

-- DropIndex
DROP INDEX "ContractAuditEvent_eventType_idx";

-- DropIndex
DROP INDEX "ContractAuditEvent_signerId_idx";

-- AlterTable
ALTER TABLE "ContractAuditEvent" DROP COLUMN "deviceFingerprint",
DROP COLUMN "documentHash",
DROP COLUMN "eventAt",
DROP COLUMN "previousHash",
ADD COLUMN     "actorRole" "AdminRole",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "previousEventHash" TEXT,
ALTER COLUMN "eventHash" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ContractAuditEvent" ADD CONSTRAINT "ContractAuditEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
