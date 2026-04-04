-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContractStatus" ADD VALUE 'PENDING_DOCUMENTS';
ALTER TYPE "ContractStatus" ADD VALUE 'DOCUMENTS_UPLOADED';
ALTER TYPE "ContractStatus" ADD VALUE 'PENDING_VERIFICATION';
ALTER TYPE "ContractStatus" ADD VALUE 'READY_TO_SIGN';
ALTER TYPE "ContractStatus" ADD VALUE 'OTP_PENDING';
ALTER TYPE "ContractStatus" ADD VALUE 'OTP_VERIFIED';
ALTER TYPE "ContractStatus" ADD VALUE 'REJECTED';
