/*
  Warnings:

  - The values [DOCUMENT_UPLOADED,SELFIE_UPLOADED] on the enum `AuditEventType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditEventType_new" AS ENUM ('CONTRACT_CREATED', 'CONTRACT_UPDATED', 'CONTRACT_SENT', 'EMAIL_SEND_REQUESTED', 'EMAIL_SENT', 'EMAIL_FAILED', 'LINK_OPENED', 'OTP_SENT', 'OTP_VERIFIED', 'SIGNATURE_STARTED', 'SIGNATURE_COMPLETED', 'ID_FRONT_UPLOADED', 'ID_BACK_UPLOADED', 'SELFIE_WITH_ID_UPLOADED', 'BANK_CERTIFICATE_UPLOADED', 'PAYROLL_STUB_UPLOADED', 'ADDITIONAL_DOCUMENT_UPLOADED', 'CONTRACT_SIGNED', 'CONTRACT_DOWNLOADED', 'CONTRACT_CANCELLED', 'CONTRACT_EXPIRED', 'HASH_SEALED');
ALTER TABLE "ContractAuditEvent" ALTER COLUMN "eventType" TYPE "AuditEventType_new" USING ("eventType"::text::"AuditEventType_new");
ALTER TYPE "AuditEventType" RENAME TO "AuditEventType_old";
ALTER TYPE "AuditEventType_new" RENAME TO "AuditEventType";
DROP TYPE "public"."AuditEventType_old";
COMMIT;
