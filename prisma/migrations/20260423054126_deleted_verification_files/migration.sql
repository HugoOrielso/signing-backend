/*
  Warnings:

  - The values [INTERNAL,VERIFIK,TRUORA] on the enum `IdentityVerificationProvider` will be removed. If these variants are still used in the database, this will fail.
  - The values [PENDING_UPLOAD] on the enum `IdentityVerificationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `faceMatchScore` on the `IdentityVerification` table. All the data in the column will be lost.
  - You are about to drop the column `isDocumentNumberMatch` on the `IdentityVerification` table. All the data in the column will be lost.
  - You are about to drop the column `isDocumentValid` on the `IdentityVerification` table. All the data in the column will be lost.
  - You are about to drop the column `isFaceMatch` on the `IdentityVerification` table. All the data in the column will be lost.
  - You are about to drop the column `isLivenessValid` on the `IdentityVerification` table. All the data in the column will be lost.
  - You are about to drop the column `livenessScore` on the `IdentityVerification` table. All the data in the column will be lost.
  - You are about to drop the column `validationScore` on the `IdentityVerification` table. All the data in the column will be lost.
  - You are about to drop the `IdentityVerificationFile` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IdentityVerificationProvider_new" AS ENUM ('VERIFF');
ALTER TABLE "public"."IdentityVerification" ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "IdentityVerification" ALTER COLUMN "provider" TYPE "IdentityVerificationProvider_new" USING ("provider"::text::"IdentityVerificationProvider_new");
ALTER TYPE "IdentityVerificationProvider" RENAME TO "IdentityVerificationProvider_old";
ALTER TYPE "IdentityVerificationProvider_new" RENAME TO "IdentityVerificationProvider";
DROP TYPE "public"."IdentityVerificationProvider_old";
ALTER TABLE "IdentityVerification" ALTER COLUMN "provider" SET DEFAULT 'VERIFF';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "IdentityVerificationStatus_new" AS ENUM ('PENDING_PROVIDER', 'STARTED', 'SUBMITTED', 'PROCESSING', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW', 'EXPIRED', 'ABANDONED', 'ERROR');
ALTER TABLE "public"."IdentityVerification" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "IdentityVerification" ALTER COLUMN "status" TYPE "IdentityVerificationStatus_new" USING ("status"::text::"IdentityVerificationStatus_new");
ALTER TYPE "IdentityVerificationStatus" RENAME TO "IdentityVerificationStatus_old";
ALTER TYPE "IdentityVerificationStatus_new" RENAME TO "IdentityVerificationStatus";
DROP TYPE "public"."IdentityVerificationStatus_old";
ALTER TABLE "IdentityVerification" ALTER COLUMN "status" SET DEFAULT 'PENDING_PROVIDER';
COMMIT;

-- DropForeignKey
ALTER TABLE "IdentityVerificationFile" DROP CONSTRAINT "IdentityVerificationFile_identityVerificationId_fkey";

-- AlterTable
ALTER TABLE "IdentityVerification" DROP COLUMN "faceMatchScore",
DROP COLUMN "isDocumentNumberMatch",
DROP COLUMN "isDocumentValid",
DROP COLUMN "isFaceMatch",
DROP COLUMN "isLivenessValid",
DROP COLUMN "livenessScore",
DROP COLUMN "validationScore",
ADD COLUMN     "endUserId" TEXT,
ADD COLUMN     "sessionUrl" TEXT,
ADD COLUMN     "vendorData" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING_PROVIDER',
ALTER COLUMN "provider" SET DEFAULT 'VERIFF';

-- DropTable
DROP TABLE "IdentityVerificationFile";

-- DropEnum
DROP TYPE "IdentityVerificationFileStatus";

-- DropEnum
DROP TYPE "IdentityVerificationFileType";
