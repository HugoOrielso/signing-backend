/*
  Warnings:

  - You are about to drop the column `fieldId` on the `Signature` table. All the data in the column will be lost.
  - You are about to drop the `SignatureField` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Signature" DROP CONSTRAINT "Signature_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "SignatureField" DROP CONSTRAINT "SignatureField_contractId_fkey";

-- DropForeignKey
ALTER TABLE "SignatureField" DROP CONSTRAINT "SignatureField_signerId_fkey";

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "consecutivo" TEXT NOT NULL DEFAULT 'dimcultura';

-- AlterTable
ALTER TABLE "Signature" DROP COLUMN "fieldId";

-- DropTable
DROP TABLE "SignatureField";
