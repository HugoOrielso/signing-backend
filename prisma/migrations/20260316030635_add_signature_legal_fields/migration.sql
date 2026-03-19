-- AlterTable
ALTER TABLE "Signature" ADD COLUMN     "documentHash" TEXT,
ADD COLUMN     "otpVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signerEmail" TEXT;
